import { LegalTemplate, TemplateVariable, CustomizationRequest } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { CreateTemplateInput, UpdateTemplateInput, TemplateVariableInput } from '../schemas/templates.schemas';

// ─── Shared include shapes ────────────────────────────────────────────────────

const templateFullInclude = {
  variables: {
    select: {
      id: true,
      key: true,
      label: true,
      type: true,
      required: true,
      defaultValue: true,
      options: true
    },
    orderBy: { createdAt: 'asc' as const }
  },
  versions: {
    select: {
      id: true,
      versionText: true,
      changeSummary: true,
      editedAt: true,
      editedBy: { select: { id: true, name: true } }
    },
    orderBy: { editedAt: 'desc' as const }
  },
  customizationRequests: {
    where: { status: 'pending' as const },
    select: {
      id: true,
      reason: true,
      status: true,
      customVariables: true,
      timestamp: true,
      requestedBy: { select: { id: true, name: true } }
    },
    orderBy: { timestamp: 'desc' as const }
  },
  _count: { select: { documents: true } }
} as const;

// ─── Read Operations ──────────────────────────────────────────────────────────

/**
 * Returns all templates for the organization.
 * Default: only active. Pass status=undefined for all.
 */
export const findAllTemplates = async (
  organizationId: string,
  status?: 'active' | 'inactive' | 'all'
) => {
  const where =
    status === 'all'
      ? { organizationId }
      : { organizationId, status: status ?? 'active' };

  return prisma.legalTemplate.findMany({
    where,
    include: templateFullInclude,
    orderBy: { createdAt: 'desc' }
  });
};

/**
 * Returns a single template scoped to the organization.
 */
export const findTemplateById = async (
  id: string,
  organizationId: string
) => {
  return prisma.legalTemplate.findFirst({
    where: { id, organizationId },
    include: templateFullInclude
  });
};

/**
 * Returns version history for a template, newest first.
 */
export const findTemplateVersions = async (
  templateId: string,
  organizationId: string
) => {
  // First verify template belongs to org
  const template = await prisma.legalTemplate.findFirst({
    where: { id: templateId, organizationId },
    select: { id: true }
  });
  if (!template) return null;

  return prisma.templateVersion.findMany({
    where: { templateId },
    include: {
      editedBy: { select: { id: true, name: true } }
    },
    orderBy: { editedAt: 'desc' }
  });
};

// ─── Write Operations ─────────────────────────────────────────────────────────

/**
 * Creates a new template + initial version + variables in a single transaction.
 * Returns the full created template.
 */
export const createTemplate = async (
  data: CreateTemplateInput,
  createdById: string,
  organizationId: string
) => {
  return prisma.$transaction(async (tx) => {
    // 1. Create the template
    const template = await tx.legalTemplate.create({
      data: {
        name: data.name,
        category: data.category,
        description: data.description,
        originalFileName: data.originalFileName,
        contentTemplate: data.contentTemplate,
        version: '1.0',
        status: 'active',
        organizationId
      }
    });

    // 2. Create variables if provided
    if (data.variables && data.variables.length > 0) {
      await tx.templateVariable.createMany({
        data: data.variables.map((v) => ({
          templateId: template.id,
          key: v.key,
          label: v.label,
          type: v.type,
          required: v.required,
          defaultValue: v.defaultValue ?? null,
          options: v.options ?? []
        }))
      });
    }

    // 3. Create the initial v1.0 version history entry
    await tx.templateVersion.create({
      data: {
        templateId: template.id,
        versionText: data.contentTemplate,
        changeSummary: 'Initial template creation.',
        editedById: createdById
      }
    });

    // 4. Return the full template with relations
    return tx.legalTemplate.findUniqueOrThrow({
      where: { id: template.id },
      include: templateFullInclude
    });
  });
};

/**
 * Edits an existing template.
 * - Increments the version string.
 * - Inserts a new immutable TemplateVersion snapshot of the NEW contentTemplate.
 * - Optionally replaces all variables (delete + re-create if provided).
 * - Runs atomically in a Prisma transaction.
 */
export const updateTemplate = async (
  template: LegalTemplate & { variables: TemplateVariable[] },
  updates: UpdateTemplateInput,
  editorId: string
) => {
  return prisma.$transaction(async (tx) => {
    // Compute new version string
    const [major, minor] = template.version.split('.').map(Number);
    const newVersion =
      updates.contentTemplate
        ? `${major + 1}.0`                         // content change → bump major
        : `${major}.${(minor ?? 0) + 1}`;          // metadata change → bump minor

    // 1. Update the template fields
    await tx.legalTemplate.update({
      where: { id: template.id },
      data: {
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.category !== undefined && { category: updates.category }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.contentTemplate !== undefined && { contentTemplate: updates.contentTemplate }),
        ...(updates.status !== undefined && { status: updates.status }),
        version: newVersion
      }
    });

    // 2. Replace variables if provided (delete all, re-create)
    if (updates.variables !== undefined) {
      await tx.templateVariable.deleteMany({ where: { templateId: template.id } });
      if (updates.variables.length > 0) {
        await tx.templateVariable.createMany({
          data: updates.variables.map((v) => ({
            templateId: template.id,
            key: v.key,
            label: v.label,
            type: v.type,
            required: v.required,
            defaultValue: v.defaultValue ?? null,
            options: v.options ?? []
          }))
        });
      }
    }

    // 3. Snapshot: store the current contentTemplate (post-update) as a new TemplateVersion
    const newContent = updates.contentTemplate ?? template.contentTemplate;
    await tx.templateVersion.create({
      data: {
        templateId: template.id,
        versionText: newContent,
        changeSummary: updates.changeSummary ?? 'Template updated.',
        editedById: editorId
      }
    });

    // 4. Return the updated template with all relations
    return tx.legalTemplate.findUniqueOrThrow({
      where: { id: template.id },
      include: templateFullInclude
    });
  });
};

// ─── Customization Requests ───────────────────────────────────────────────────

/**
 * Returns all pending customization requests for the organization.
 */
export const findAllCustomizationRequests = async (
  organizationId: string
) => {
  return prisma.customizationRequest.findMany({
    where: {
      template: { organizationId }
    },
    include: {
      template: { select: { id: true, name: true, version: true } },
      requestedBy: { select: { id: true, name: true } }
    },
    orderBy: { timestamp: 'desc' }
  });
};

/**
 * Creates a new customization request for a template.
 */
export const createCustomizationRequest = async (
  templateId: string,
  requestedById: string,
  reason: string,
  customVariables: TemplateVariableInput[]
) => {
  return prisma.customizationRequest.create({
    data: {
      templateId,
      requestedById,
      reason,
      customVariables: customVariables as object[],
      status: 'pending'
    },
    include: {
      template: { select: { id: true, name: true } },
      requestedBy: { select: { id: true, name: true } }
    }
  });
};

/**
 * Approves a customization request.
 * Atomically:
 *   1. Marks request as approved.
 *   2. Merges custom variables into the template (creates new TemplateVariable records).
 *   3. Increments template version (minor bump).
 *   4. Creates a TemplateVersion snapshot.
 *   5. Creates an ActivityLog entry.
 *   6. Creates a Notification for the requester.
 */
export const approveCustomizationRequest = async (
  request: CustomizationRequest & {
    template: LegalTemplate;
    requestedBy: { id: string; name: string };
  },
  approverId: string,
  approverName: string,
  organizationId: string
) => {
  return prisma.$transaction(async (tx) => {
    // 1. Mark request as approved
    await tx.customizationRequest.update({
      where: { id: request.id },
      data: { status: 'approved' }
    });

    // 2. Merge variables
    const incomingVars = request.customVariables as TemplateVariableInput[];
    if (incomingVars && incomingVars.length > 0) {
      await tx.templateVariable.createMany({
        data: incomingVars.map((v) => ({
          templateId: request.templateId,
          key: v.key,
          label: v.label,
          type: v.type,
          required: v.required,
          defaultValue: v.defaultValue ?? null,
          options: v.options ?? []
        }))
      });
    }

    // 3. Bump template minor version
    const [major, minor] = request.template.version.split('.').map(Number);
    const newVersion = `${major}.${(minor ?? 0) + 1}`;

    await tx.legalTemplate.update({
      where: { id: request.templateId },
      data: { version: newVersion }
    });

    // 4. Create TemplateVersion snapshot
    await tx.templateVersion.create({
      data: {
        templateId: request.templateId,
        versionText: request.template.contentTemplate,
        changeSummary: `Customization approved: merged ${incomingVars.length} variable(s). Reason: ${request.reason}`,
        editedById: approverId
      }
    });

    // 5. Activity Log
    await tx.activityLog.create({
      data: {
        userId: approverId,
        action: 'Approved Customization Request',
        entityType: 'template',
        entityId: request.templateId,
        entityName: request.template.name,
        details: `Approved request by ${request.requestedBy.name}: ${request.reason}`,
        organizationId
      }
    });

    // 6. Notify the requester
    await tx.notification.create({
      data: {
        userId: request.requestedById,
        title: 'Customization Request Approved',
        message: `Your customization request for "${request.template.name}" has been approved by ${approverName}. The template now includes your suggested variables.`,
        type: 'customization',
        linkId: request.templateId
      }
    });

    // Return the updated template
    return tx.legalTemplate.findUniqueOrThrow({
      where: { id: request.templateId },
      include: templateFullInclude
    });
  });
};

/**
 * Rejects a customization request and notifies the requester.
 */
export const rejectCustomizationRequest = async (
  request: CustomizationRequest & {
    template: LegalTemplate;
    requestedBy: { id: string; name: string };
  },
  approverId: string,
  approverName: string,
  organizationId: string,
  rejectionNote?: string
) => {
  return prisma.$transaction(async (tx) => {
    // 1. Mark rejected
    await tx.customizationRequest.update({
      where: { id: request.id },
      data: { status: 'rejected' }
    });

    // 2. Activity log
    await tx.activityLog.create({
      data: {
        userId: approverId,
        action: 'Rejected Customization Request',
        entityType: 'template',
        entityId: request.templateId,
        entityName: request.template.name,
        details: rejectionNote
          ? `Rejected request by ${request.requestedBy.name}. Note: ${rejectionNote}`
          : `Rejected request by ${request.requestedBy.name}.`,
        organizationId
      }
    });

    // 3. Notify the requester
    await tx.notification.create({
      data: {
        userId: request.requestedById,
        title: 'Customization Request Rejected',
        message: rejectionNote
          ? `Your customization request for "${request.template.name}" was not approved. Note from ${approverName}: ${rejectionNote}`
          : `Your customization request for "${request.template.name}" was not approved by ${approverName}.`,
        type: 'customization',
        linkId: request.templateId
      }
    });

    return tx.customizationRequest.findUniqueOrThrow({
      where: { id: request.id },
      include: {
        template: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, name: true } }
      }
    });
  });
};
