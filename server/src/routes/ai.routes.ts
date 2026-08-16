// ─── AI Routes ────────────────────────────────────────────────────────────────
// Routes for /api/ai/* (Module D: Review Engine, Module E: Rewrite Assistant)

import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import {
  postReviewDocument,
  getDocumentReview,
  postRewriteText,
  postRewriteAccepted,
} from '../controllers/ai.controller';

const router = Router();

// All AI routes require authentication
router.use(authenticate);

/** POST /api/ai/review — Trigger AI review of a document version */
router.post('/review', postReviewDocument);

/** GET /api/ai/review/:documentId/:versionId — Get latest persisted review */
router.get('/review/:documentId/:versionId', getDocumentReview);

/** POST /api/ai/rewrite — Trigger AI rewrite of selected text */
router.post('/rewrite', postRewriteText);

/** POST /api/ai/rewrite/accepted — Log that user accepted & applied a rewrite */
router.post('/rewrite/accepted', postRewriteAccepted);

export default router;
