import { Router } from 'express';
import helmet from 'helmet';
import { authenticate } from '../middlewares/authenticate';
import {
  postCreateSignatureRequest,
  getSigningPage,
  postSubmitSignature,
  postDeclineSignature,
  getDocumentSignatureRequest,
  getTaskSignatureRequests
} from '../controllers/signature.controller';

const router = Router();

// ─── Internal Protected Routes (JWT required) ─────────────────────────────────

/** POST /api/signatures/request — BOSS only. Starts a signing process. */
router.post('/request', authenticate, postCreateSignatureRequest);

/** GET /api/signatures/document/:documentId — Returns active signature request. */
router.get('/document/:documentId', authenticate, getDocumentSignatureRequest);

/** GET /api/signatures/task/:taskId — Returns all signature requests for a task. */
router.get('/task/:taskId', authenticate, getTaskSignatureRequests);

// ─── Zero-Login Public Routes (token-secured) ─────────────────────────────────
// The signing page is a standalone HTML page that uses inline <script> and onclick handlers.
// Helmet's default CSP blocks all inline scripts globally, so we disable CSP only for
// the signing page GET route. Security is maintained via single-use SHA-256 tokens.
const noCSP = helmet({ contentSecurityPolicy: false });

/** GET /api/signatures/signer/:token — Renders signing page HTML. Never signs on GET. */
router.get('/signer/:token', noCSP, getSigningPage);

/** POST /api/signatures/signer/:token/sign — Submits the drawn signature. */
router.post('/signer/:token/sign', postSubmitSignature);

/** POST /api/signatures/signer/:token/decline — Records a decline. */
router.post('/signer/:token/decline', postDeclineSignature);

export default router;
