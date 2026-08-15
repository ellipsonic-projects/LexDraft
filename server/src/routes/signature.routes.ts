import { Router } from 'express';
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

/**
 * POST /api/signatures/request
 * BOSS only. Starts a signing process for an approved document.
 */
router.post('/request', authenticate, postCreateSignatureRequest);

/**
 * GET /api/signatures/document/:documentId
 * Returns active signature request for a document (editor/kanban).
 */
router.get('/document/:documentId', authenticate, getDocumentSignatureRequest);

/**
 * GET /api/signatures/task/:taskId
 * Returns all signature requests for a task (kanban).
 */
router.get('/task/:taskId', authenticate, getTaskSignatureRequests);

// ─── Zero-Login Public Routes (token-secured) ─────────────────────────────────

/**
 * GET /api/signatures/signer/:token
 * Returns signing page metadata. NEVER signs the document on GET.
 */
router.get('/signer/:token', getSigningPage);

/**
 * POST /api/signatures/signer/:token/sign
 * Submits the signature. Strictly validated server-side.
 */
router.post('/signer/:token/sign', postSubmitSignature);

/**
 * POST /api/signatures/signer/:token/decline
 * Records a decline and cancels the signing process.
 */
router.post('/signer/:token/decline', postDeclineSignature);

export default router;
