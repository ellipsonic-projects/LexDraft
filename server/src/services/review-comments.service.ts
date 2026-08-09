import { DocumentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { validateDocumentTransition } from '../utils/transitions';
import {
  submitReviewTx,
  reviewDecisionTx,
  getReviewHistory,
  getComments,
  createCommentTx,
  resolveCommentTx
} from '../repositories/review-comments.repository';
import {
  ReviewDecisionInput,
  CreateCommentInput,
  ResolveCommentInput
} from '../schemas/review-comments.schemas';

// ─── Review Service ───────────────────────────────────────────────────────────

/**
 * Submits a document for Partner review.
 * Enforces:
 *   - Document must exist and belong to organization.
 *   - EMPLOYEE must be the author of the document.
 *   - Document state transition must be valid (draft -> under_review or rejected -> under_review).
 */
export const submitForReview = async (
  documentId: string,
  userId: string,
  userName: string,
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
    throw new AppError('Access denied. You can only submit documents you authored.', 403);
  }

  // State transition check
  const isValidTransition = validateDocumentTransition(doc.status, DocumentStatus.under_review);
  if (!isValidTransition) {
    throw new AppError(
      `Invalid state transition: Cannot submit document in status "${doc.status}" for review.`,
      422
    );
  }

  return submitReviewTx(doc.id, organizationId, userId, userName, doc.title);
};

/**
 * Submits a Partner review decision ('approved' or 'rejected').
 * Enforces:
 *   - Must have BOSS role.
 *   - Document must exist in organization and be in 'under_review' status.
 */
export const submitReviewDecision = async (
  documentId: string,
  data: ReviewDecisionInput,
  userId: string,
  userName: string,
  role: string,
  organizationId: string
) => {
  if (role !== 'BOSS') {
    throw new AppError('Access denied. Only Senior Partners can make review decisions.', 403);
  }

  const doc = await prisma.legalDocument.findFirst({
    where: { id: documentId, organizationId }
  });
  if (!doc) {
    throw new AppError('Document not found.', 404);
  }

  const targetStatus =
    data.decision === 'approved' ? DocumentStatus.approved : DocumentStatus.rejected;

  const isValidTransition = validateDocumentTransition(doc.status, targetStatus);
  if (!isValidTransition) {
    throw new AppError(
      `Invalid state transition: Cannot ${data.decision} a document in status "${doc.status}". Document must be under review.`,
      422
    );
  }

  return reviewDecisionTx(
    doc.id,
    data.decision,
    data.notes || '',
    userId,
    userName,
    organizationId,
    {
      id: doc.id,
      title: doc.title,
      authorId: doc.authorId,
      currentVersion: doc.currentVersion
    }
  );
};

/**
 * Returns review cycle history for a document.
 * Enforces IDOR for EMPLOYEE role.
 */
export const listReviewHistory = async (
  documentId: string,
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

  if (role === 'EMPLOYEE' && doc.authorId !== userId) {
    throw new AppError('Access denied. You can only view review history for your own documents.', 403);
  }

  return getReviewHistory(documentId);
};

// ─── Comment Service ──────────────────────────────────────────────────────────

/**
 * Adds an inline comment or threaded reply.
 * Enforces:
 *   - Document must exist in organization.
 *   - Document cannot be approved/locked.
 *   - EMPLOYEE can only comment on own authored documents.
 *   - If parentCommentId is provided, parent comment must exist on this document and be top-level.
 */
export const addComment = async (
  documentId: string,
  data: CreateCommentInput,
  userId: string,
  userName: string,
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
    throw new AppError('Access denied. You can only comment on documents you authored.', 403);
  }

  // Sealed / locked check
  if (doc.lockedAt !== null || doc.status === DocumentStatus.approved) {
    throw new AppError('Cannot add comments to approved and locked documents.', 422);
  }

  // If parentCommentId provided, validate parent comment
  if (data.parentCommentId) {
    const parent = await prisma.inlineComment.findFirst({
      where: { id: data.parentCommentId, documentId }
    });
    if (!parent) {
      throw new AppError('Parent comment not found on this document.', 404);
    }
    if (parent.parentCommentId !== null) {
      throw new AppError('Nested replies beyond 1 level are not supported.', 400);
    }
  }

  return createCommentTx(
    doc.id,
    userId,
    userName,
    data.selectedText || '',
    data.commentText,
    data.parentCommentId,
    {
      id: doc.id,
      title: doc.title,
      authorId: doc.authorId
    },
    organizationId
  );
};

/**
 * Resolves or reopens a comment thread.
 * Enforces:
 *   - Document must exist in organization.
 *   - Document cannot be approved/locked.
 *   - EMPLOYEE must be document author or comment author.
 */
export const resolveComment = async (
  documentId: string,
  commentId: string,
  data: ResolveCommentInput,
  userId: string,
  _userName: string,
  role: string,
  organizationId: string
) => {
  const doc = await prisma.legalDocument.findFirst({
    where: { id: documentId, organizationId }
  });
  if (!doc) {
    throw new AppError('Document not found.', 404);
  }

  if (doc.lockedAt !== null || doc.status === DocumentStatus.approved) {
    throw new AppError('Cannot modify comments on approved and locked documents.', 422);
  }

  const comment = await prisma.inlineComment.findFirst({
    where: { id: commentId, documentId }
  });
  if (!comment) {
    throw new AppError('Comment not found on this document.', 404);
  }

  if (role === 'EMPLOYEE' && doc.authorId !== userId && comment.authorId !== userId) {
    throw new AppError('Access denied. You can only resolve comments on your own documents.', 403);
  }

  return resolveCommentTx(
    comment.id,
    data.resolved !== undefined ? data.resolved : true,
    userId,
    doc.title,
    doc.id,
    organizationId
  );
};

/**
 * Returns all comments with threaded replies for a document.
 * Enforces IDOR for EMPLOYEE role.
 */
export const listComments = async (
  documentId: string,
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

  if (role === 'EMPLOYEE' && doc.authorId !== userId) {
    throw new AppError('Access denied. You can only view comments for your own documents.', 403);
  }

  return getComments(documentId);
};
