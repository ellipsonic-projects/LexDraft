import { AppError } from '../middlewares/errorHandler';
import {
  findAllTemplates,
  findTemplateById,
  findTemplateVersions,
  createTemplate as repoCreate,
  updateTemplate as repoUpdate,
  findAllCustomizationRequests,
  createCustomizationRequest as repoCreateRequest,
  approveCustomizationRequest as repoApprove,
  rejectCustomizationRequest as repoReject
} from '../repositories/templates.repository';
import {
  CreateTemplateInput,
  UpdateTemplateInput,
  CreateCustomizationRequestInput,
  RejectCustomizationRequestInput
} from '../schemas/templates.schemas';
import { prisma } from '../lib/prisma';

// ─── Template Service ─────────────────────────────────────────────────────────

/**
 * Lists all templates in the organization.
 * Default: only active. Partners may request all statuses.
 */
export const listTemplates = async (
  organizationId: string,
  status?: 'active' | 'inactive' | 'all'
) => {
  return findAllTemplates(organizationId, status);
};

/**
 * Returns a single template, verifying org membership.
 */
export const getTemplate = async (
  templateId: string,
  organizationId: string
) => {
  const template = await findTemplateById(templateId, organizationId);
  if (!template) {
    throw new AppError('Template not found.', 404);
  }
  return template;
};

/**
 * Returns version history for a template.
 */
export const getTemplateVersions = async (
  templateId: string,
  organizationId: string
) => {
  const versions = await findTemplateVersions(templateId, organizationId);
  if (versions === null) {
    throw new AppError('Template not found.', 404);
  }
  return versions;
};

/**
 * Creates a new template.
 * Validates:
 *   - No duplicate name within the organization (case-insensitive).
 */
export const createTemplate = async (
  data: CreateTemplateInput,
  createdById: string,
  organizationId: string
) => {
  // Prevent duplicate template name in the same org (case-insensitive)
  const existing = await prisma.legalTemplate.findFirst({
    where: {
      organizationId,
      name: { equals: data.name, mode: 'insensitive' }
    }
  });
  if (existing) {
    throw new AppError(
      `A template named "${data.name}" already exists in this organization.`,
      409
    );
  }

  return repoCreate(data, createdById, organizationId);
};

/**
 * Edits an existing template.
 * Validates:
 *   - Template must belong to the organization.
 *   - If renaming, no duplicate name in org.
 *   - changeSummary is required (enforced by Zod schema).
 * Invariants:
 *   - Previous TemplateVersion records are never deleted.
 *   - Existing documents referencing this template remain valid.
 */
export const editTemplate = async (
  templateId: string,
  updates: UpdateTemplateInput,
  editorId: string,
  organizationId: string
) => {
  const template = await prisma.legalTemplate.findFirst({
    where: { id: templateId, organizationId },
    include: { variables: true }
  });
  if (!template) {
    throw new AppError('Template not found.', 404);
  }

  // Check for name conflict if name is being changed
  if (updates.name && updates.name.toLowerCase() !== template.name.toLowerCase()) {
    const conflict = await prisma.legalTemplate.findFirst({
      where: {
        organizationId,
        name: { equals: updates.name, mode: 'insensitive' },
        NOT: { id: templateId }
      }
    });
    if (conflict) {
      throw new AppError(
        `A template named "${updates.name}" already exists in this organization.`,
        409
      );
    }
  }

  return repoUpdate(template, updates, editorId);
};

// ─── Customization Request Service ───────────────────────────────────────────

/**
 * Lists all customization requests for the organization.
 */
export const listCustomizationRequests = async (organizationId: string) => {
  return findAllCustomizationRequests(organizationId);
};

/**
 * Submits a customization request.
 * Validates:
 *   - Template must exist, belong to org, and be active.
 *   - No duplicate pending request from the same user for the same template.
 *   - Variable keys in the request must not already exist in the template.
 */
export const submitCustomizationRequest = async (
  data: CreateCustomizationRequestInput,
  requestedById: string,
  organizationId: string
) => {
  // 1. Verify template exists and is active
  const template = await prisma.legalTemplate.findFirst({
    where: { id: data.templateId, organizationId },
    include: { variables: { select: { key: true } } }
  });
  if (!template) {
    throw new AppError('Template not found.', 404);
  }
  if (template.status !== 'active') {
    throw new AppError('Cannot request customization for an inactive template.', 422);
  }

  // 2. Prevent duplicate pending request from same user for same template
  const existingPending = await prisma.customizationRequest.findFirst({
    where: {
      templateId: data.templateId,
      requestedById,
      status: 'pending'
    }
  });
  if (existingPending) {
    throw new AppError(
      'You already have a pending customization request for this template. Wait for it to be resolved before submitting a new one.',
      409
    );
  }

  // 3. Validate that requested variable keys don't already exist
  const existingKeys = new Set(template.variables.map((v) => v.key));
  const duplicateKeys = data.customVariables
    .map((v) => v.key)
    .filter((k) => existingKeys.has(k));

  if (duplicateKeys.length > 0) {
    throw new AppError(
      `The following variable keys already exist in this template: ${duplicateKeys.join(', ')}.`,
      409
    );
  }

  return repoCreateRequest(data.templateId, requestedById, data.reason, data.customVariables);
};

/**
 * Approves a customization request.
 * Only processes requests in 'pending' state.
 */
export const approveRequest = async (
  requestId: string,
  approverId: string,
  approverName: string,
  organizationId: string
) => {
  const request = await prisma.customizationRequest.findFirst({
    where: { id: requestId, template: { organizationId } },
    include: {
      template: true,
      requestedBy: { select: { id: true, name: true } }
    }
  });
  if (!request) {
    throw new AppError('Customization request not found.', 404);
  }
  if (request.status !== 'pending') {
    throw new AppError(
      `This request has already been ${request.status}. Only pending requests can be approved.`,
      422
    );
  }

  return repoApprove(request, approverId, approverName, organizationId);
};

/**
 * Rejects a customization request.
 * Only processes requests in 'pending' state.
 */
export const rejectRequest = async (
  requestId: string,
  approverId: string,
  approverName: string,
  organizationId: string,
  data: RejectCustomizationRequestInput
) => {
  const request = await prisma.customizationRequest.findFirst({
    where: { id: requestId, template: { organizationId } },
    include: {
      template: true,
      requestedBy: { select: { id: true, name: true } }
    }
  });
  if (!request) {
    throw new AppError('Customization request not found.', 404);
  }
  if (request.status !== 'pending') {
    throw new AppError(
      `This request has already been ${request.status}. Only pending requests can be rejected.`,
      422
    );
  }

  return repoReject(request, approverId, approverName, organizationId, data.rejectionNote);
};

/**
 * Deletes a template from the database (or marks as inactive if used).
 * Enforces organization validation and checks usage count.
 */
export const removeTemplate = async (
  templateId: string,
  userId: string,
  organizationId: string
): Promise<{ success: boolean; mode: 'hard' | 'soft' }> => {
  const template = await prisma.legalTemplate.findFirst({
    where: { id: templateId, organizationId },
    include: {
      _count: { select: { documents: true } }
    }
  });

  if (!template) {
    throw new AppError('Template not found or access denied.', 404);
  }

  const documentCount = template._count.documents;

  if (documentCount === 0) {
    // Unused template: perform a hard delete
    await prisma.legalTemplate.delete({
      where: { id: templateId }
    });

    // Log action to ActivityLog
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'TEMPLATE_DELETED',
        entityType: 'template',
        entityId: templateId,
        entityName: template.name,
        details: `Master template "${template.name}" was permanently deleted.`,
        organizationId
      }
    });

    return { success: true, mode: 'hard' };
  } else {
    // Used template: perform a soft delete by marking status as inactive
    await prisma.legalTemplate.update({
      where: { id: templateId },
      data: { status: 'inactive' }
    });

    // Log action to ActivityLog
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'TEMPLATE_SOFT_DELETED',
        entityType: 'template',
        entityId: templateId,
        entityName: template.name,
        details: `Master template "${template.name}" was marked inactive (soft deleted) as it is referenced by ${documentCount} documents.`,
        organizationId
      }
    });

    return { success: true, mode: 'soft' };
  }
};
