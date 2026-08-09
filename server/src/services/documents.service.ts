import { DocumentStatus, TaskPriority } from '@prisma/client';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { getExpiryStatus } from '../utils/expiry';
import {
  findAllDocuments,
  findDocumentById,
  generateDocumentTx,
  saveDraftTx,
  restoreVersionTx,
  deliverDocumentTx,
  renewDocumentTx,
  findExpiringDocuments,
  DocumentFilters
} from '../repositories/documents.repository';
import {
  GenerateDocumentInput,
  SaveDraftInput,
  RenewDocumentInput
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

// ─── Phase 7 Service Operations ───────────────────────────────────────────────

/**
 * Returns cryptographic verification and PDF download metadata for a sealed document.
 * Enforces IDOR for EMPLOYEE.
 */
export const getDocumentPdf = async (
  documentId: string,
  userId: string,
  role: string,
  organizationId: string
) => {
  const doc = await prisma.legalDocument.findFirst({
    where: { id: documentId, organizationId },
    include: {
      author: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      template: { select: { id: true, name: true, version: true } }
    }
  });
  if (!doc) {
    throw new AppError('Document not found.', 404);
  }

  // IDOR check
  if (role === 'EMPLOYEE' && doc.authorId !== userId) {
    throw new AppError('Access denied. You can only view PDF export metadata for documents you authored.', 403);
  }

  const isSealed = doc.lockedAt !== null || doc.status === DocumentStatus.approved;

  // Generate SHA-256 fingerprint of the document content + lockedAt for tamper verification
  const fingerprintSource = `${doc.content}_${doc.lockedAt?.toISOString() || doc.updatedAt.toISOString()}`;
  const sha256Fingerprint = crypto.createHash('sha256').update(fingerprintSource).digest('hex');

  const cleanTitle = doc.title.replace(/[^a-zA-Z0-9_-]/g, '_');

  return {
    documentId: doc.id,
    title: doc.title,
    fileName: `${cleanTitle}_v${doc.currentVersion}_${isSealed ? 'Sealed' : 'Draft'}.pdf`,
    downloadUrl: doc.pdfExportUrl || `/exports/doc_${doc.id}_sealed.pdf`,
    status: doc.status,
    isSealed,
    lockedAt: doc.lockedAt,
    expiryDate: doc.expiryDate,
    currentVersion: doc.currentVersion,
    templateVersion: doc.templateVersionAtGeneration,
    sha256Fingerprint,
    authorName: doc.author.name,
    clientName: doc.client.name,
    generatedAt: new Date().toISOString()
  };
};

/**
 * Partner marks document as delivered to client.
 * Enforces:
 *   - Must be BOSS role.
 *   - Document must exist in organization and be in 'approved' status.
 *   - Linked tasks transition to 'completed'.
 */
export const deliverDocument = async (
  documentId: string,
  userId: string,
  userName: string,
  role: string,
  organizationId: string
) => {
  if (role !== 'BOSS') {
    throw new AppError('Access denied. Only Senior Partners can mark documents as delivered to clients.', 403);
  }

  const doc = await prisma.legalDocument.findFirst({
    where: { id: documentId, organizationId }
  });
  if (!doc) {
    throw new AppError('Document not found.', 404);
  }

  if (doc.status !== DocumentStatus.approved) {
    throw new AppError('Only approved and sealed documents can be marked as delivered.', 422);
  }

  return deliverDocumentTx({
    documentId: doc.id,
    documentTitle: doc.title,
    authorId: doc.authorId,
    userId,
    userName,
    organizationId
  });
};

/**
 * Renews an approved/expired document by cloning it into a new draft document.
 * Enforces:
 *   - Must be BOSS role.
 *   - Original document must exist in organization and be in 'approved' status.
 *   - Preserves original document and all its historical version records.
 */
export const renewDocument = async (
  documentId: string,
  data: RenewDocumentInput,
  userId: string,
  userName: string,
  role: string,
  organizationId: string
) => {
  if (role !== 'BOSS') {
    throw new AppError('Access denied. Only Senior Partners can initiate document renewals.', 403);
  }

  const doc = await prisma.legalDocument.findFirst({
    where: { id: documentId, organizationId },
    include: { template: true }
  });
  if (!doc) {
    throw new AppError('Document not found.', 404);
  }

  if (doc.status !== DocumentStatus.approved) {
    throw new AppError('Only approved and sealed documents can be renewed.', 422);
  }

  const renewalTitle = data.title && data.title.trim() ? data.title.trim() : `${doc.title} (Renewed)`;
  const dueDate = data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 14 * 24 * 60 * 1000);
  const mergedVariables = { ...(doc.variables as Record<string, string>), ...(data.variables || {}) };

  return renewDocumentTx({
    originalDocumentId: doc.id,
    templateId: doc.templateId,
    templateVersion: doc.template.version || doc.templateVersionAtGeneration,
    title: renewalTitle,
    clientId: doc.clientId,
    matterId: doc.matterId,
    authorId: userId,
    authorName: userName,
    priority: doc.priority,
    dueDate,
    content: doc.content,
    variables: mergedVariables,
    originalDocumentTitle: doc.title,
    organizationId
  });
};

/**
 * Returns documents with expiry dates and their calculated daysRemaining.
 */
export const listExpiringDocuments = async (
  userId: string,
  role: string,
  organizationId: string
) => {
  const authorIdFilter = role === 'BOSS' ? undefined : userId;
  const docs = await findExpiringDocuments(organizationId, authorIdFilter);

  return docs.map((doc: any) => {
    const expiryStatus = getExpiryStatus(doc.expiryDate);
    return {
      ...doc,
      expiryStatus
    };
  });
};

/**
 * Checks all active approved documents for upcoming expiry (<=30 days, <=7 days, or expired)
 * and dispatches notifications if not already notified.
 */
export const checkAndNotifyExpiries = async (organizationId: string) => {
  const docs = await prisma.legalDocument.findMany({
    where: {
      organizationId,
      status: DocumentStatus.approved,
      expiryDate: { not: null }
    }
  });

  let notificationsCreated = 0;

  for (const doc of docs) {
    const status = getExpiryStatus(doc.expiryDate);
    if (status.isExpired || status.isExpiringSoon30 || status.isExpiringSoon7) {
      // Check if unread notification already exists for this document
      const existingNotif = await prisma.notification.findFirst({
        where: {
          linkId: doc.id,
          type: 'expiry',
          read: false
        }
      });

      if (!existingNotif) {
        const title = status.isExpired
          ? 'Document Has Expired'
          : status.isExpiringSoon7
          ? 'Document Expiring in 7 Days'
          : 'Document Expiring in 30 Days';

        const message = `"${doc.title}" ${
          status.isExpired
            ? `expired on ${doc.expiryDate!.toISOString().split('T')[0]}.`
            : `will expire in ${status.daysRemaining} days on ${doc.expiryDate!.toISOString().split('T')[0]}.`
        }`;

        await prisma.notification.create({
          data: {
            userId: doc.authorId,
            title,
            message,
            type: 'expiry',
            linkId: doc.id
          }
        });
        notificationsCreated++;
      }
    }
  }

  return {
    checkedCount: docs.length,
    notificationsCreated
  };
};

