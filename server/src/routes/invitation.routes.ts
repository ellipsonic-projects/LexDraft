import { Router } from 'express';
import {
  sendInvitation,
  listInvitations,
  revokeInvitation,
  validateToken,
  acceptInvitationHandler,
} from '../controllers/invitation.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { authRateLimiter } from '../middlewares/rateLimiter';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * POST /api/invitations
 * Partner-only: Create and send a new workspace invitation.
 */
router.post('/', authenticate, authorize(UserRole.BOSS), sendInvitation);

/**
 * GET /api/invitations
 * Partner-only: List all invitations for this organization.
 */
router.get('/', authenticate, authorize(UserRole.BOSS), listInvitations);

/**
 * DELETE /api/invitations/:id
 * Partner-only: Revoke a pending invitation.
 */
router.delete('/:id', authenticate, authorize(UserRole.BOSS), revokeInvitation);

/**
 * GET /api/invitations/validate/:token
 * Public: Validate an invitation token before accepting.
 */
router.get('/validate/:token', authRateLimiter, validateToken);

/**
 * POST /api/invitations/accept/:token
 * Public: Accept an invitation and create a user account.
 */
router.post('/accept/:token', authRateLimiter, acceptInvitationHandler);

export default router;
