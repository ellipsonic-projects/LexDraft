import { DocumentStatus, TaskPriority, EntityType } from '@prisma/client';
import { prisma } from '../lib/prisma';

// ─── Include Shapes ───────────────────────────────────────────────────────────

const documentListInclude = {
  author: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      role: true,
      title: true
    }
  },
  client: {
    select: {
      id: true,
      name: true,
      contactEmail: true,
      contactPhone: true
    }
  },
  matter: {
    select: {
      id: true,
      title: true,
      matterCode: true,
      status: true
    }
  },
  template: {
    select: {
      id: true,
      name: true,
      category: true,
      version: true
    }
  },
  _count: {
    select: {
      versions: true,
      comments: true,
      reviewHistory: true
    }
  }
} as const;

const documentDetailInclude = {
  author: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      role: true,
      title: true
    }
  },
  client: {
    select: {
      id: true,
      name: true,
      contactEmail: true,
      contactPhone: true
    }
  },
  matter: {
    select: {
      id: true,
      title: true,
      matterCode: true,
      status: true
    }
  },
  template: {
    select: {
      id: true,
      name: true,
      category: true,
      version: true,
      description: true
    }
  },
  versions: {
    orderBy: { versionNumber: 'desc' as const }
  },
  comments: {
    where: { parentCommentId: null },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          role: true
        }
      },
      replies: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'asc' as const }
      }
    },
    orderBy: { createdAt: 'desc' as const }
  },
  reviewHistory: {
    include: {
      reviewer: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    },
    orderBy: { cycleNumber: 'asc' as const }
  },
  tasks: {
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      assigneeId: true
    }
  }
} as const;

// ─── Query Operations ─────────────────────────────────────────────────────────

export interface DocumentFilters {
  clientId?: string;
  matterId?: string;
  status?: DocumentStatus;
  templateId?: string;
}

/**
 * Lists documents with optional filters and author scoping.
 */
export const findAllDocuments = async (
  organizationId: string,
  authorId?: string,
  filters?: DocumentFilters
) => {
  return prisma.legalDocument.findMany({
    where: {
      organizationId,
      ...(authorId ? { authorId } : {}),
      ...(filters?.clientId ? { clientId: filters.clientId } : {}),
      ...(filters?.matterId ? { matterId: filters.matterId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.templateId ? { templateId: filters.templateId } : {})
    },
    include: documentListInclude,
    orderBy: { createdAt: 'desc' }
  });
};

/**
 * Finds a document by ID and organization.
 */
export const findDocumentById = async (
  id: string,
  organizationId: string
) => {
  return prisma.legalDocument.findFirst({
    where: { id, organizationId },
    include: documentDetailInclude
  });
};

// ─── Transactional Operations ─────────────────────────────────────────────────

export interface GenerateDocumentTxData {
  templateId: string;
  templateVersion: string;
  templateName: string;
  title: string;
  clientId: string;
  clientName: string;
  matterId: string;
  authorId: string;
  priority: TaskPriority;
  dueDate: Date;
  content: string;
  variables: Record<string, string>;
  taskId?: string;
  organizationId: string;
}

/**
 * Atomically generates a legal document, initial version snapshot,
 * increments template usage, optionally links & updates workflow task, and logs activity.
 */
export const generateDocumentTx = async (data: GenerateDocumentTxData) => {
  return prisma.$transaction(async (tx) => {
    // 1. Create LegalDocument
    const doc = await tx.legalDocument.create({
      data: {
        templateId: data.templateId,
        templateVersionAtGeneration: data.templateVersion,
        title: data.title,
        clientId: data.clientId,
        matterId: data.matterId,
        authorId: data.authorId,
        status: DocumentStatus.draft,
        priority: data.priority,
        dueDate: data.dueDate,
        content: data.content,
        variables: data.variables,
        currentVersion: 1,
        organizationId: data.organizationId
      }
    });

    // 2. Create initial DocumentVersion (v1)
    await tx.documentVersion.create({
      data: {
        documentId: doc.id,
        versionNumber: 1,
        content: data.content,
        variablesState: data.variables,
        changeDescription: 'Initial draft compiled from template.',
        authorId: data.authorId
      }
    });

    // 3. Increment template usageCount
    await tx.legalTemplate.update({
      where: { id: data.templateId },
      data: { usageCount: { increment: 1 } }
    });

    // 4. If taskId provided, link task and advance status to draft_ready if in assigned/in_progress
    if (data.taskId) {
      const task = await tx.workflowTask.findUnique({
        where: { id: data.taskId }
      });

      if (task) {
        const shouldAdvance = task.status === 'assigned' || task.status === 'in_progress';
        await tx.workflowTask.update({
          where: { id: data.taskId },
          data: {
            documentId: doc.id,
            ...(shouldAdvance ? { status: 'draft_ready' } : {})
          }
        });
      }
    }

    // 5. Activity Log
    await tx.activityLog.create({
      data: {
        userId: data.authorId,
        action: 'Generated Legal Document',
        entityType: EntityType.document,
        entityId: doc.id,
        entityName: doc.title,
        details: `Compiled document from template "${data.templateName}" for client "${data.clientName}".`,
        organizationId: data.organizationId
      }
    });

    // 6. Return full document with details
    return tx.legalDocument.findUniqueOrThrow({
      where: { id: doc.id },
      include: documentDetailInclude
    });
  });
};

export interface SaveDraftTxData {
  documentId: string;
  content: string;
  variables: Record<string, string>;
  changeDescription: string;
  authorId: string;
  documentTitle: string;
  organizationId: string;
}

/**
 * Atomically increments document version, updates document content/variables,
 * creates immutable DocumentVersion snapshot, and creates an ActivityLog.
 */
export const saveDraftTx = async (data: SaveDraftTxData) => {
  return prisma.$transaction(async (tx) => {
    // 1. Get current document version
    const currentDoc = await tx.legalDocument.findUniqueOrThrow({
      where: { id: data.documentId }
    });

    const nextVersionNumber = currentDoc.currentVersion + 1;

    // 2. Update document
    const updatedDoc = await tx.legalDocument.update({
      where: { id: data.documentId },
      data: {
        content: data.content,
        variables: data.variables,
        currentVersion: nextVersionNumber
      }
    });

    // 3. Create immutable version snapshot
    await tx.documentVersion.create({
      data: {
        documentId: data.documentId,
        versionNumber: nextVersionNumber,
        content: data.content,
        variablesState: data.variables,
        changeDescription: data.changeDescription,
        authorId: data.authorId
      }
    });

    // 4. Activity Log
    await tx.activityLog.create({
      data: {
        userId: data.authorId,
        action: `Saved Version Snapshot v${nextVersionNumber}`,
        entityType: EntityType.document,
        entityId: updatedDoc.id,
        entityName: data.documentTitle,
        details: data.changeDescription,
        organizationId: data.organizationId
      }
    });

    // 5. Return full document
    return tx.legalDocument.findUniqueOrThrow({
      where: { id: updatedDoc.id },
      include: documentDetailInclude
    });
  });
};

export interface RestoreVersionTxData {
  documentId: string;
  targetVersion: {
    versionNumber: number;
    content: string;
    variablesState: any;
  };
  authorId: string;
  documentTitle: string;
  organizationId: string;
}

/**
 * Atomically restores historic version without destroying existing versions.
 * Increments currentVersion, updates content & variables, and records a restoration version snapshot.
 */
export const restoreVersionTx = async (data: RestoreVersionTxData) => {
  return prisma.$transaction(async (tx) => {
    const currentDoc = await tx.legalDocument.findUniqueOrThrow({
      where: { id: data.documentId }
    });

    const nextVersionNumber = currentDoc.currentVersion + 1;

    // 1. Update document with restored content and variables
    const updatedDoc = await tx.legalDocument.update({
      where: { id: data.documentId },
      data: {
        content: data.targetVersion.content,
        variables: data.targetVersion.variablesState,
        currentVersion: nextVersionNumber
      }
    });

    // 2. Record restoration version snapshot
    await tx.documentVersion.create({
      data: {
        documentId: data.documentId,
        versionNumber: nextVersionNumber,
        content: data.targetVersion.content,
        variablesState: data.targetVersion.variablesState,
        changeDescription: `Restored historic version checkpoint v${data.targetVersion.versionNumber}.`,
        authorId: data.authorId
      }
    });

    // 3. Activity Log
    await tx.activityLog.create({
      data: {
        userId: data.authorId,
        action: `Restored Version Snapshot v${data.targetVersion.versionNumber}`,
        entityType: EntityType.document,
        entityId: updatedDoc.id,
        entityName: data.documentTitle,
        details: `Restored content and variables state from historical version checkpoint v${data.targetVersion.versionNumber}.`,
        organizationId: data.organizationId
      }
    });

    return tx.legalDocument.findUniqueOrThrow({
      where: { id: updatedDoc.id },
      include: documentDetailInclude
    });
  });
};

// ─── Phase 7: Delivery, Renewal & Expiry Operations ──────────────────────────

export interface DeliverDocumentTxData {
  documentId: string;
  documentTitle: string;
  authorId: string;
  userId: string;
  userName: string;
  organizationId: string;
}

/**
 * Atomically marks document as delivered, completes any linked workflow task,
 * dispatches notifications, and records an activity log.
 */
export const deliverDocumentTx = async (data: DeliverDocumentTxData) => {
  return prisma.$transaction(async (tx) => {
    // 1. Advance linked workflow tasks to completed
    await tx.workflowTask.updateMany({
      where: { documentId: data.documentId },
      data: { status: 'completed' }
    });

    // 2. Dispatch notification to document author
    await tx.notification.create({
      data: {
        userId: data.authorId,
        title: 'Document Delivered to Client',
        message: `${data.userName} marked "${data.documentTitle}" as delivered to client. Linked task completed.`,
        type: 'task',
        linkId: data.documentId
      }
    });

    // 3. Activity Log
    await tx.activityLog.create({
      data: {
        userId: data.userId,
        action: 'Delivered Document to Client',
        entityType: EntityType.document,
        entityId: data.documentId,
        entityName: data.documentTitle,
        details: 'Senior Partner marked document as delivered to client and finalized linked task.',
        organizationId: data.organizationId
      }
    });

    return tx.legalDocument.findUniqueOrThrow({
      where: { id: data.documentId },
      include: documentDetailInclude
    });
  });
};

export interface RenewDocumentTxData {
  originalDocumentId: string;
  templateId: string;
  templateVersion: string;
  title: string;
  clientId: string;
  matterId: string;
  authorId: string;
  authorName: string;
  priority: TaskPriority;
  dueDate: Date;
  content: string;
  variables: Record<string, string>;
  originalDocumentTitle: string;
  organizationId: string;
}

/**
 * Atomically clones an approved/expired document into a brand new draft document,
 * creates initial version snapshot, records activity log, and dispatches notifications.
 * Preserves the original document and all its historical snapshots.
 */
export const renewDocumentTx = async (data: RenewDocumentTxData) => {
  return prisma.$transaction(async (tx) => {
    // 1. Create new LegalDocument
    const newDoc = await tx.legalDocument.create({
      data: {
        templateId: data.templateId,
        templateVersionAtGeneration: data.templateVersion,
        title: data.title,
        clientId: data.clientId,
        matterId: data.matterId,
        authorId: data.authorId,
        status: DocumentStatus.draft,
        priority: data.priority,
        dueDate: data.dueDate,
        content: data.content,
        variables: data.variables,
        currentVersion: 1,
        renewedFromDocumentId: data.originalDocumentId,
        organizationId: data.organizationId
      }
    });

    // 2. Create initial DocumentVersion (v1) snapshot
    await tx.documentVersion.create({
      data: {
        documentId: newDoc.id,
        versionNumber: 1,
        content: data.content,
        variablesState: data.variables,
        changeDescription: `Renewed document cloned from sealed original: "${data.originalDocumentTitle}".`,
        authorId: data.authorId
      }
    });

    // 3. Activity Log
    await tx.activityLog.create({
      data: {
        userId: data.authorId,
        action: 'Renewed Legal Document',
        entityType: EntityType.document,
        entityId: newDoc.id,
        entityName: newDoc.title,
        details: `Created new draft renewal cloned from sealed document "${data.originalDocumentTitle}" (ID: ${data.originalDocumentId}).`,
        organizationId: data.organizationId
      }
    });

    // 4. Notification
    await tx.notification.create({
      data: {
        userId: data.authorId,
        title: 'Document Renewed',
        message: `New draft renewal created for "${data.title}".`,
        type: 'review',
        linkId: newDoc.id
      }
    });

    return tx.legalDocument.findUniqueOrThrow({
      where: { id: newDoc.id },
      include: documentDetailInclude
    });
  });
};

/**
 * Returns documents with expiry dates, optionally filtered by author for EMPLOYEE.
 */
export const findExpiringDocuments = async (
  organizationId: string,
  authorId?: string
) => {
  return prisma.legalDocument.findMany({
    where: {
      organizationId,
      ...(authorId ? { authorId } : {}),
      expiryDate: { not: null }
    },
    include: documentListInclude,
    orderBy: { expiryDate: 'asc' }
  });
};

