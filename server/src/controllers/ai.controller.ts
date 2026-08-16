// ─── AI Controller ────────────────────────────────────────────────────────────
// Handles HTTP for /api/ai routes (review and rewrite)

import { Request, Response, NextFunction } from 'express';
import { reviewRequestSchema, rewriteRequestSchema, rewriteAcceptedSchema } from '../schemas/ai.schemas';
import { runDocumentReview, getLatestReview } from '../services/ai/ai.review.service';
import { rewriteSelectedText, logRewriteAccepted } from '../services/ai/ai.rewrite.service';
import { RewriteAction } from '../services/ai/ai.types';

/**
 * POST /api/ai/review
 * Triggers an AI review of a specific document version.
 * Returns risk score, findings, and category summary.
 */
export async function postReviewDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const parsed = reviewRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { documentId, documentVersionId } = parsed.data;

    const result = await runDocumentReview({
      documentId,
      documentVersionId,
      userId: user.userId,
      organizationId: user.organizationId,
    });

    return res.status(200).json({
      status: 'success',
      data: { review: result },
    });
  } catch (err: any) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ status: 'error', message: err.message });
    }
    next(err);
  }
}

/**
 * GET /api/ai/review/:documentId/:versionId
 * Returns the last persisted review for a specific document version.
 * Returns 404 if no review exists yet.
 */
export async function getDocumentReview(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const { documentId, versionId } = req.params;

    if (!documentId || !versionId) {
      return res.status(400).json({ status: 'error', message: 'documentId and versionId are required' });
    }

    const review = await getLatestReview(documentId, versionId, user.organizationId);

    if (!review) {
      return res.status(404).json({ status: 'error', message: 'No review found for this document version' });
    }

    return res.status(200).json({
      status: 'success',
      data: { review },
    });
  } catch (err: any) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ status: 'error', message: err.message });
    }
    next(err);
  }
}

/**
 * POST /api/ai/rewrite
 * Triggers an AI-powered text rewrite for a selected passage.
 */
export async function postRewriteText(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const parsed = rewriteRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { documentId, documentVersionId, selectedText, action, context } = parsed.data;

    const result = await rewriteSelectedText({
      documentId,
      documentVersionId,
      selectedText,
      action: action as RewriteAction,
      context,
      userId: user.userId,
      organizationId: user.organizationId,
    });

    return res.status(200).json({
      status: 'success',
      data: { rewrite: result },
    });
  } catch (err: any) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ status: 'error', message: err.message });
    }
    next(err);
  }
}

/**
 * POST /api/ai/rewrite/accepted
 * Logs that the user accepted and applied an AI rewrite to the document.
 * Call this after saveDocumentDraft succeeds.
 */
export async function postRewriteAccepted(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const parsed = rewriteAcceptedSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { documentId, action, documentTitle } = parsed.data;

    await logRewriteAccepted({
      documentId,
      action: action as RewriteAction,
      userId: user.userId,
      organizationId: user.organizationId,
      documentTitle,
    });

    return res.status(200).json({ status: 'success', message: 'Rewrite acceptance logged' });
  } catch (err: any) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ status: 'error', message: err.message });
    }
    next(err);
  }
}
