import { Request, Response, NextFunction } from 'express';
import {
  createAndSendInvitation,
  validateInvitationToken,
  acceptInvitation,
  getOrganizationInvitations,
  revokeInvitationById,
} from '../services/invitation.service';
import { UserRole } from '@prisma/client';
import { env } from '../config/env';

const FRONTEND_URL = env.FRONTEND_URL || (env.NODE_ENV === 'production' ? 'https://lexdraft-frontend.onrender.com' : 'http://localhost:5173');

/**
 * POST /api/invitations
 * Partner-only: Send a workspace invitation to a new lawyer.
 */
export const sendInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, name, role } = req.body;
    const user = (req as any).user;

    const roleValue: UserRole = role === 'EMPLOYEE' ? UserRole.EMPLOYEE : UserRole.EMPLOYEE;

    const invitation = await createAndSendInvitation(
      user.organizationId,
      user.userId,
      email,
      name,
      roleValue,
      FRONTEND_URL
    );

    res.status(201).json({
      status: 'success',
      message: 'Invitation sent successfully.',
      data: {
        id: invitation.id,
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/invitations
 * Partner-only: List all invitations for this organization.
 */
export const listInvitations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as any).user;
    const invitations = await getOrganizationInvitations(user.organizationId);
    res.status(200).json({ status: 'success', data: { invitations } });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/invitations/:id
 * Partner-only: Revoke a pending invitation.
 */
export const revokeInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    await revokeInvitationById(id, user.organizationId);
    res.status(200).json({ status: 'success', message: 'Invitation revoked.' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/invitations/validate/:token
 * Public: Validate an invitation token (used by frontend to pre-fill the form).
 */
export const validateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.params;
    const invitation = await validateInvitationToken(token);

    res.status(200).json({
      status: 'success',
      data: {
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
        organizationName: invitation.organization.name,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/invitations/accept/:token
 * Public: Accept invitation and create account.
 */
export const acceptInvitationHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      res.status(400).json({ status: 'error', message: 'Password must be at least 8 characters.' });
      return;
    }

    const { user, organizationName } = await acceptInvitation(token, password);

    res.status(201).json({
      status: 'success',
      message: 'Account created successfully. You can now log in.',
      data: {
        email: user.email,
        name: user.name,
        organizationName,
      },
    });
  } catch (err) {
    next(err);
  }
};
