import { Router } from 'express';
import {
  getDocuments,
  getDocumentById,
  postGenerateDocument,
  postSaveDraft,
  postRestoreVersion
} from '../controllers/documents.controller';
import {
  postSubmitReview,
  postReviewDecision,
  getReviewHistory,
  getComments,
  postComment,
  patchResolveComment
} from '../controllers/review-comments.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import {
  generateDocumentSchema,
  saveDraftSchema
} from '../schemas/documents.schemas';
import {
  reviewDecisionSchema,
  createCommentSchema,
  resolveCommentSchema
} from '../schemas/review-comments.schemas';

const router = Router();

// All document routes require authentication
router.use(authenticate);

/**
 * GET /api/documents
 * List documents visible to user (BOSS: all; EMPLOYEE: own authored).
 */
router.get('/', getDocuments);

/**
 * GET /api/documents/:id
 * Retrieve single document with versions, comments, and review history.
 * Enforces strict IDOR (EMPLOYEE cannot view others' documents).
 */
router.get('/:id', getDocumentById);

/**
 * POST /api/documents/generate
 * Generates document from active template with variable compilation.
 */
router.post('/generate', validate(generateDocumentSchema), postGenerateDocument);

/**
 * POST /api/documents/:id/save-draft
 * Saves draft content and creates immutable version snapshot.
 */
router.post('/:id/save-draft', validate(saveDraftSchema), postSaveDraft);

/**
 * POST /api/documents/:id/restore-version/:versionNumber
 * Restores historical version without deleting previous versions.
 */
router.post('/:id/restore-version/:versionNumber', postRestoreVersion);

// ─── Review & Approval Endpoints ──────────────────────────────────────────────

/**
 * POST /api/documents/:id/submit-review
 * Submits a document for Partner review (transitions draft -> under_review).
 */
router.post('/:id/submit-review', postSubmitReview);

/**
 * POST /api/documents/:id/review-decision
 * Partner approves or requests revisions on a document under review.
 * Only BOSS role is authorized.
 */
router.post(
  '/:id/review-decision',
  authorize('BOSS'),
  validate(reviewDecisionSchema),
  postReviewDecision
);

/**
 * GET /api/documents/:id/review-history
 * Returns the full review history / cycles for a document.
 */
router.get('/:id/review-history', getReviewHistory);

// ─── Inline Comments Endpoints ────────────────────────────────────────────────

/**
 * GET /api/documents/:id/comments
 * Returns all top-level comments with threaded replies for a document.
 */
router.get('/:id/comments', getComments);

/**
 * POST /api/documents/:id/comments
 * Adds an inline comment or threaded reply.
 */
router.post('/:id/comments', validate(createCommentSchema), postComment);

/**
 * PATCH /api/documents/:id/comments/:commentId/resolve
 * Resolves or reopens a comment thread.
 */
router.patch(
  '/:id/comments/:commentId/resolve',
  validate(resolveCommentSchema),
  patchResolveComment
);

export default router;
