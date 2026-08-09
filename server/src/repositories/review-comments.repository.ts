import { DocumentStatus, TaskStatus, EntityType, NotificationType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { computeExpiryDate } from '../utils/expiry';

const commentAuthorSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  role: true
} as const;

const commentFullInclude = {
  author: {
    select: commentAuthorSelect
  },
  replies: {
    include: {
      author: {
        select: commentAuthorSelect
      }
    },
    orderBy: { createdAt: 'asc' as const }
  }
} as const;

// ─── Review Operations ────────────────────────────────────────────────────────

/**
 * Atomically transitions document and linked tasks to 'under_review',
 * dispatches notifications to firm Partners, and records an activity log.
 */
export const submitReviewTx = async (
  documentId: string,
  organizationId: string,
  authorId: string,
  authorName: string,
  documentTitle: string
) => {
  return prisma.$transaction(async (tx) => {
    // 1. Transition document to under_review
    const updatedDoc = await tx.legalDocument.update({
      where: { id: documentId },
      data: { status: DocumentStatus.under_review }
    });

    // 2. Transition any linked tasks in assigned/in_progress/draft_ready to under_review
    await tx.workflowTask.updateMany({
      where: {
        documentId,
        status: { in: [TaskStatus.assigned, TaskStatus.in_progress, TaskStatus.draft_ready] }
      },
      data: { status: TaskStatus.under_review }
    });

    // 3. Find all firm partners in the organization
    const partners = await tx.user.findMany({
      where: { organizationId, role: 'BOSS' },
      select: { id: true }
    });

    // 4. Dispatch notification to all partners
    if (partners.length > 0) {
      await tx.notification.createMany({
        data: partners.map((p) => ({
          userId: p.id,
          title: 'Document Submitted For Partner Review',
          message: `${authorName} submitted "${documentTitle}" for your review and approval.`,
          type: NotificationType.review,
          linkId: documentId
        }))
      });
    }

    // 5. Activity Log
    await tx.activityLog.create({
      data: {
        userId: authorId,
        action: 'Submitted Document For Review',
        entityType: EntityType.document,
        entityId: documentId,
        entityName: documentTitle,
        details: `Submitted draft v${updatedDoc.currentVersion} for senior partner sign-off.`,
        organizationId
      }
    });

    return updatedDoc;
  });
};

/**
 * Atomically records the Partner review decision (approve or reject),
 * advances/rolls-back document and task status, inserts ReviewCycle,
 * dispatches notification to document author, and records an activity log.
 */
export const reviewDecisionTx = async (
  documentId: string,
  decision: 'approved' | 'rejected',
  notes: string,
  reviewerId: string,
  reviewerName: string,
  organizationId: string,
  document: {
    id: string;
    title: string;
    authorId: string;
    currentVersion: number;
    templateId?: string;
    variables?: any;
  }
) => {
  return prisma.$transaction(async (tx) => {
    // 1. Calculate next review cycle number
    const existingCyclesCount = await tx.reviewCycle.count({
      where: { documentId }
    });
    const cycleNumber = existingCyclesCount + 1;

    // 2. Insert ReviewCycle
    const reviewCycle = await tx.reviewCycle.create({
      data: {
        documentId,
        reviewerId,
        cycleNumber,
        documentVersionAtReview: document.currentVersion,
        decision,
        notes: notes || ''
      },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // 3. Update document status, lock timestamp, pdf export URL, and expiry date
    const targetDocStatus =
      decision === 'approved' ? DocumentStatus.approved : DocumentStatus.rejected;

    let computedExpiryDate: Date | null = null;
    let pdfUrl: string | null = null;
    let lockedAtDate: Date | null = null;

    if (decision === 'approved') {
      lockedAtDate = new Date();
      pdfUrl = `/exports/doc_${documentId}_sealed.pdf`;
      if (document.templateId && document.variables) {
        computedExpiryDate = computeExpiryDate(document.templateId, document.variables);
      }
    }

    const updatedDoc = await tx.legalDocument.update({
      where: { id: documentId },
      data: {
        status: targetDocStatus,
        ...(decision === 'approved'
          ? {
              lockedAt: lockedAtDate,
              pdfExportUrl: pdfUrl,
              expiryDate: computedExpiryDate
            }
          : {})
      }
    });

    // 4. Update linked workflow task
    // If approved -> task status = approved
    // If rejected -> task status = in_progress (returned to lawyer for revisions)
    const targetTaskStatus =
      decision === 'approved' ? TaskStatus.approved : TaskStatus.in_progress;

    await tx.workflowTask.updateMany({
      where: { documentId },
      data: { status: targetTaskStatus }
    });

    // 5. Dispatch notification to the document author
    const notifTitle =
      decision === 'approved'
        ? 'Document Approved & Sealed'
        : 'Revisions Requested on Document';

    const notifMsg =
      decision === 'approved'
        ? `${reviewerName} approved and sealed "${document.title}".`
        : `${reviewerName} reviewed "${document.title}" and requested revisions. Notes: ${notes || 'Please see inline comments.'}`;

    const notifType =
      decision === 'approved' ? NotificationType.approval : NotificationType.rejection;

    await tx.notification.create({
      data: {
        userId: document.authorId,
        title: notifTitle,
        message: notifMsg,
        type: notifType,
        linkId: documentId
      }
    });

    // 6. Activity Log
    await tx.activityLog.create({
      data: {
        userId: reviewerId,
        action: `Partner Review: ${decision === 'approved' ? 'Approved & Sealed' : 'Requested Revisions'}`,
        entityType: EntityType.document,
        entityId: documentId,
        entityName: document.title,
        details: notes ? `Decision: ${decision}. Notes: ${notes}` : `Decision: ${decision}.`,
        organizationId
      }
    });

    return {
      document: updatedDoc,
      reviewCycle
    };
  });
};

/**
 * Returns full review history for a document.
 */
export const getReviewHistory = async (documentId: string) => {
  return prisma.reviewCycle.findMany({
    where: { documentId },
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
    orderBy: { cycleNumber: 'asc' }
  });
};

// ─── Comment Operations ───────────────────────────────────────────────────────

/**
 * Returns all top-level comments with threaded replies for a document.
 */
export const getComments = async (documentId: string) => {
  return prisma.inlineComment.findMany({
    where: {
      documentId,
      parentCommentId: null
    },
    include: commentFullInclude,
    orderBy: { createdAt: 'desc' }
  });
};

/**
 * Atomically creates an inline comment or threaded reply,
 * dispatches notifications, and logs activity.
 */
export const createCommentTx = async (
  documentId: string,
  authorId: string,
  authorName: string,
  selectedText: string,
  commentText: string,
  parentCommentId: string | undefined,
  document: {
    id: string;
    title: string;
    authorId: string;
  },
  organizationId: string
) => {
  return prisma.$transaction(async (tx) => {
    // 1. Create comment
    const comment = await tx.inlineComment.create({
      data: {
        documentId,
        authorId,
        selectedText: selectedText || '',
        commentText,
        parentCommentId: parentCommentId || null,
        resolved: false
      },
      include: {
        author: {
          select: commentAuthorSelect
        }
      }
    });

    // 2. Notification logic
    // If reply: notify author of parent comment (if different user)
    // If top-level: notify document author (if commenter is not document author)
    if (parentCommentId) {
      const parent = await tx.inlineComment.findUnique({
        where: { id: parentCommentId },
        select: { authorId: true }
      });
      if (parent && parent.authorId !== authorId) {
        await tx.notification.create({
          data: {
            userId: parent.authorId,
            title: 'New Reply on Document Comment',
            message: `${authorName} replied to your comment on "${document.title}".`,
            type: NotificationType.review,
            linkId: documentId
          }
        });
      }
    } else if (document.authorId !== authorId) {
      await tx.notification.create({
        data: {
          userId: document.authorId,
          title: 'New Review Comment on Document',
          message: `${authorName} added a comment on "${document.title}": "${commentText.slice(0, 80)}${commentText.length > 80 ? '...' : ''}"`,
          type: NotificationType.review,
          linkId: documentId
        }
      });
    }

    // 3. Activity Log
    await tx.activityLog.create({
      data: {
        userId: authorId,
        action: parentCommentId ? 'Replied to Inline Comment' : 'Added Inline Review Comment',
        entityType: EntityType.document,
        entityId: documentId,
        entityName: document.title,
        details: commentText.slice(0, 200),
        organizationId
      }
    });

    return {
      ...comment,
      replies: []
    };
  });
};

/**
 * Atomically updates resolved state of a comment thread and its replies.
 */
export const resolveCommentTx = async (
  commentId: string,
  resolved: boolean,
  userId: string,
  documentTitle: string,
  documentId: string,
  organizationId: string
) => {
  return prisma.$transaction(async (tx) => {
    // 1. Update target comment
    const updated = await tx.inlineComment.update({
      where: { id: commentId },
      data: { resolved },
      include: commentFullInclude
    });

    // 2. If it's a top-level comment, also update any replies
    if (!updated.parentCommentId) {
      await tx.inlineComment.updateMany({
        where: { parentCommentId: commentId },
        data: { resolved }
      });
    }

    // 3. Activity Log
    await tx.activityLog.create({
      data: {
        userId,
        action: resolved ? 'Resolved Comment Thread' : 'Reopened Comment Thread',
        entityType: EntityType.document,
        entityId: documentId,
        entityName: documentTitle,
        details: `Marked comment thread as ${resolved ? 'resolved' : 'open'}.`,
        organizationId
      }
    });

    return updated;
  });
};
