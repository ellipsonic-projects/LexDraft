import { Router } from 'express';
import {
  getDocuments,
  getDocumentById,
  postGenerateDocument,
  postSaveDraft,
  postRestoreVersion,
  getDocumentPdf,
  postDeliverDocument,
  postRenewDocument,
  getExpiringDocuments,
  postCheckExpiries
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
  saveDraftSchema,
  renewDocumentSchema
} from '../schemas/documents.schemas';
import {
  reviewDecisionSchema,
  createCommentSchema,
  resolveCommentSchema
} from '../schemas/review-comments.schemas';

const router = Router();

// All document routes require authentication
router.use(authenticate);

// ─── Document Queries & Expiry Check (must precede /:id) ──────────────────────

/**
 * GET /api/documents/expiring
 * Returns documents nearing expiration with calculated days remaining.
 */
router.get('/expiring', getExpiringDocuments);

/**
 * POST /api/documents/check-expiries
 * Automatically checks and notifies of upcoming expiries.
 */
router.post('/check-expiries', postCheckExpiries);

/**
 * GET /api/documents
 * List documents visible to user (BOSS: all; EMPLOYEE: own authored).
 */
router.get('/', getDocuments);

/**
 * POST /api/documents/generate
 * Generates document from active template with variable compilation.
 */
router.post('/generate', validate(generateDocumentSchema), postGenerateDocument);

/**
 * GET /api/documents/:id/pdf
 * Returns cryptographic verification and PDF download metadata for a sealed document.
 */
router.get('/:id/pdf', getDocumentPdf);

/**
 * GET /api/documents/:id
 * Retrieve single document with versions, comments, and review history.
 * Enforces strict IDOR (EMPLOYEE cannot view others' documents).
 */
router.get('/:id', getDocumentById);

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

// ─── Phase 7: Delivery & Renewal Endpoints ────────────────────────────────────

/**
 * POST /api/documents/:id/deliver
 * Partner marks document as delivered to client and completes linked task.
 */
router.post('/:id/deliver', authorize('BOSS'), postDeliverDocument);

/**
 * POST /api/documents/:id/renew
 * Partner renews an approved/sealed document by cloning it into a new draft.
 */
router.post(
  '/:id/renew',
  authorize('BOSS'),
  validate(renewDocumentSchema),
  postRenewDocument
);

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
