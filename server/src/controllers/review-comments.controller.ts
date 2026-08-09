import { Request, Response, NextFunction } from 'express';
import {
  submitForReview,
  submitReviewDecision,
  listReviewHistory,
  listComments,
  addComment,
  resolveComment
} from '../services/review-comments.service';

/**
 * POST /api/documents/:id/submit-review
 * Submits a document for Partner review (transitions draft -> under_review).
 */
export const postSubmitReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const document = await submitForReview(
      req.params.id,
      req.user!.userId,
      req.user!.name,
      req.user!.role,
      req.user!.organizationId
    );

    res.status(200).json({ status: 'success', data: { document } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/documents/:id/review-decision
 * Partner approves or requests revisions on a document under review.
 */
export const postReviewDecision = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await submitReviewDecision(
      req.params.id,
      req.body,
      req.user!.userId,
      req.user!.name,
      req.user!.role,
      req.user!.organizationId
    );

    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/documents/:id/review-history
 * Returns the review cycle history for a document.
 */
export const getReviewHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reviewHistory = await listReviewHistory(
      req.params.id,
      req.user!.userId,
      req.user!.role,
      req.user!.organizationId
    );

    res.status(200).json({ status: 'success', data: { reviewHistory } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/documents/:id/comments
 * Returns all top-level comments with threaded replies for a document.
 */
export const getComments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const comments = await listComments(
      req.params.id,
      req.user!.userId,
      req.user!.role,
      req.user!.organizationId
    );

    res.status(200).json({ status: 'success', data: { comments } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/documents/:id/comments
 * Adds an inline comment or threaded reply.
 */
export const postComment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const comment = await addComment(
      req.params.id,
      req.body,
      req.user!.userId,
      req.user!.name,
      req.user!.role,
      req.user!.organizationId
    );

    res.status(201).json({ status: 'success', data: { comment } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/documents/:id/comments/:commentId/resolve
 * Resolves or reopens a comment thread.
 */
export const patchResolveComment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const comment = await resolveComment(
      req.params.id,
      req.params.commentId,
      req.body,
      req.user!.userId,
      req.user!.name,
      req.user!.role,
      req.user!.organizationId
    );

    res.status(200).json({ status: 'success', data: { comment } });
  } catch (err) {
    next(err);
  }
};
