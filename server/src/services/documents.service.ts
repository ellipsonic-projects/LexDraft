import { DocumentStatus, TaskPriority } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import {
  findAllDocuments,
  findDocumentById,
  generateDocumentTx,
  saveDraftTx,
  restoreVersionTx,
  DocumentFilters
} from '../repositories/documents.repository';
import {
  GenerateDocumentInput,
  SaveDraftInput
} from '../schemas/documents.schemas';

// ─── Document Service ─────────────────────────────────────────────────────────

/**
 * Returns documents visible to the requesting user:
 * - BOSS: all documents across the firm.
 * - EMPLOYEE: only documents authored by the user.
 */
export const listDocuments = async (
  organizationId: string,
  userId: string,
  role: string,
  filters?: DocumentFilters
) => {
  const authorIdFilter = role === 'BOSS' ? undefined : userId;
  return findAllDocuments(organizationId, authorIdFilter, filters);
};

/**
 * Retrieves a single document with full relations.
 * Enforces organization isolation and strict IDOR access control:
 * - BOSS: can view any document in the firm.
 * - EMPLOYEE: can only view documents they authored.
 */
export const getDocument = async (
  documentId: string,
  userId: string,
  role: string,
  organizationId: string
) => {
  const doc = await findDocumentById(documentId, organizationId);
  if (!doc) {
    throw new AppError('Document not found.', 404);
  }

  if (role === 'EMPLOYEE' && doc.authorId !== userId) {
    throw new AppError('Access denied. You can only view documents you authored.', 403);
  }

  return doc;
};

/**
 * Compiles and generates a legal document from an active template.
 * Validates:
 *   - Template exists, belongs to org, and is active.
 *   - Client exists and belongs to org.
 *   - Matter exists, belongs to client and org.
 *   - Task (if provided) exists, belongs to org, and is assigned to the user (if EMPLOYEE).
 *   - All required template variables are present and non-empty.
 */
export const generateDocument = async (
  data: GenerateDocumentInput,
  userId: string,
  role: string,
  organizationId: string
) => {
  // 1. Verify template exists, belongs to org, and is active
  const template = await prisma.legalTemplate.findFirst({
    where: { id: data.templateId, organizationId },
    include: { variables: true }
  });
  if (!template) {
    throw new AppError('Template not found.', 404);
  }
  if (template.status !== 'active') {
    throw new AppError('Cannot generate documents from an inactive template.', 422);
  }

  // 2. Verify client belongs to this organization
  const client = await prisma.client.findFirst({
    where: { id: data.clientId, organizationId }
  });
  if (!client) {
    throw new AppError('Client not found.', 404);
  }

  // 3. Verify matter belongs to this client and organization
  const matter = await prisma.matter.findFirst({
    where: { id: data.matterId, clientId: data.clientId }
  });
  if (!matter) {
    throw new AppError('Matter not found for the specified client.', 404);
  }

  // 4. If taskId provided, verify task exists in org and permission
  if (data.taskId) {
    const task = await prisma.workflowTask.findFirst({
      where: { id: data.taskId, organizationId }
    });
    if (!task) {
      throw new AppError('Task not found.', 404);
    }
    if (role === 'EMPLOYEE' && task.assigneeId !== userId) {
      throw new AppError('Access denied. You can only generate documents for tasks assigned to you.', 403);
    }
  }

  // 5. Validate required template variables
  const missingVariables: string[] = [];
  for (const v of template.variables) {
    if (v.required) {
      const val = data.variables[v.key];
      if (val === undefined || val === null || String(val).trim() === '') {
        missingVariables.push(`${v.label} (${v.key})`);
      }
    }
  }
  if (missingVariables.length > 0) {
    throw new AppError(
      `Validation error: The following required variables are missing: ${missingVariables.join(', ')}.`,
      400
    );
  }

  // 6. Compile template HTML with supplied variables
  let compiledHtml = template.contentTemplate;
  for (const [k, v] of Object.entries(data.variables)) {
    const regex = new RegExp(`{{\\s*${k}\\s*}}`, 'g');
    compiledHtml = compiledHtml.replace(regex, `<strong>${v || `[${k}]`}</strong>`);
  }

  // 7. Determine document title
  const defaultTitle = `${template.name.split(' ')[0]} - ${client.name}`;
  const title = data.title && data.title.trim() ? data.title.trim() : defaultTitle;

  // 8. Due date calculation
  const dueDate = data.dueDate
    ? new Date(data.dueDate)
    : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

  // 9. Execute generation transaction
  return generateDocumentTx({
    templateId: template.id,
    templateVersion: template.version,
    templateName: template.name,
    title,
    clientId: client.id,
    clientName: client.name,
    matterId: matter.id,
    authorId: userId,
    priority: (data.priority as TaskPriority) || TaskPriority.medium,
    dueDate,
    content: compiledHtml,
    variables: data.variables,
    taskId: data.taskId,
    organizationId
  });
};

/**
 * Saves a document draft checkpoint and snapshots an immutable DocumentVersion.
 * Enforces:
 *   - Document must exist in organization.
 *   - EMPLOYEE can only edit their own authored document.
 *   - Document cannot be edited if approved/locked.
 */
export const saveDraft = async (
  documentId: string,
  data: SaveDraftInput,
  userId: string,
  role: string,
  organizationId: string
) => {
  const doc = await prisma.legalDocument.findFirst({
    where: { id: documentId, organizationId }
  });
  if (!doc) {
    throw new AppError('Document not found.', 404);
  }

  // IDOR check
  if (role === 'EMPLOYEE' && doc.authorId !== userId) {
    throw new AppError('Access denied. You can only edit documents you authored.', 403);
  }

  // Sealed / locked check
  if (doc.lockedAt !== null || doc.status === DocumentStatus.approved) {
    throw new AppError('Document is approved and locked. Modifications are prohibited.', 422);
  }

  return saveDraftTx({
    documentId: doc.id,
    content: data.content,
    variables: data.variables,
    changeDescription: data.changeDescription || 'Saved draft version checkpoint.',
    authorId: userId,
    documentTitle: doc.title,
    organizationId
  });
};

/**
 * Restores a historical version snapshot.
 * Enforces:
 *   - Document must exist in organization.
 *   - EMPLOYEE can only restore their own authored document.
 *   - Blocked if document is approved/locked.
 *   - Preserves all historical versions; creates a new version checkpoint for the restore.
 */
export const restoreVersion = async (
  documentId: string,
  versionNumber: number,
  userId: string,
  role: string,
  organizationId: string
) => {
  const doc = await prisma.legalDocument.findFirst({
    where: { id: documentId, organizationId }
  });
  if (!doc) {
    throw new AppError('Document not found.', 404);
  }

  // IDOR check
  if (role === 'EMPLOYEE' && doc.authorId !== userId) {
    throw new AppError('Access denied. You can only restore versions on documents you authored.', 403);
  }

  // Sealed / locked check
  if (doc.lockedAt !== null || doc.status === DocumentStatus.approved) {
    throw new AppError('Cannot restore version on approved and locked documents.', 422);
  }

  // Find target version snapshot
  const targetVersion = await prisma.documentVersion.findFirst({
    where: { documentId, versionNumber }
  });
  if (!targetVersion) {
    throw new AppError(`Version v${versionNumber} not found for this document.`, 404);
  }

  return restoreVersionTx({
    documentId: doc.id,
    targetVersion: {
      versionNumber: targetVersion.versionNumber,
      content: targetVersion.content,
      variablesState: targetVersion.variablesState
    },
    authorId: userId,
    documentTitle: doc.title,
    organizationId
  });
};
