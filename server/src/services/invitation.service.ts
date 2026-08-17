import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import * as invitationRepo from '../repositories/invitation.repository';
import { sendInvitationEmail } from './email.service';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const INVITATION_EXPIRY_HOURS = 72;

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createAndSendInvitation(
  organizationId: string,
  invitedByUserId: string,
  email: string,
  name: string,
  role: UserRole,
  frontendBaseUrl: string
) {
  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists in this org
  const existing = await prisma.user.findFirst({
    where: { email: normalizedEmail, organizationId },
  });
  if (existing) {
    throw new Error('A user with this email already exists in this workspace.');
  }

  // Revoke any existing pending invitations for this email
  const existingInvite = await invitationRepo.findPendingInvitationByEmail(organizationId, normalizedEmail);
  if (existingInvite) {
    await invitationRepo.revokeInvitation(existingInvite.id, organizationId);
  }

  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000);

  const invitation = await invitationRepo.createInvitation(
    organizationId,
    invitedByUserId,
    normalizedEmail,
    name,
    role,
    token,
    expiresAt
  );

  const inviteLink = `${frontendBaseUrl}/accept-invitation/${token}`;
  await sendInvitationEmail(normalizedEmail, name, inviteLink, INVITATION_EXPIRY_HOURS);

  return invitation;
}

export async function validateInvitationToken(token: string) {
  const invitation = await invitationRepo.findInvitationByToken(token);

  if (!invitation) {
    throw new Error('Invitation not found or has already been used.');
  }
  if (invitation.revokedAt) {
    throw new Error('This invitation has been revoked.');
  }
  if (invitation.acceptedAt) {
    throw new Error('This invitation has already been accepted.');
  }
  if (new Date() > invitation.expiresAt) {
    throw new Error('This invitation has expired. Please request a new invitation.');
  }

  return invitation;
}

export async function acceptInvitation(token: string, password: string) {
  const invitation = await validateInvitationToken(token);

  // Create the user account
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      organizationId: invitation.organizationId,
      email: invitation.email,
      name: invitation.name,
      role: invitation.role,
      title: invitation.role === 'BOSS' ? 'Partner' : 'Associate Lawyer',
      passwordHash,
      accountStatus: 'active',
    },
  });

  // Mark invitation as accepted
  await invitationRepo.markInvitationAccepted(invitation.id);

  // Log activity
  await prisma.activityLog.create({
    data: {
      organizationId: invitation.organizationId,
      userId: user.id,
      action: 'invitation_accepted',
      entityType: 'user',
      entityId: user.id,
      entityName: user.name,
      details: `Invitation accepted by ${user.email} (invited by ${invitation.invitedByUser.email}, role: ${invitation.role})`,
    },
  });

  return { user, organizationName: invitation.organization.name };
}

export async function getOrganizationInvitations(organizationId: string) {
  return invitationRepo.listOrganizationInvitations(organizationId);
}

export async function revokeInvitationById(invitationId: string, organizationId: string) {
  const result = await invitationRepo.revokeInvitation(invitationId, organizationId);
  if (result.count === 0) {
    throw new Error('Invitation not found or already revoked.');
  }
  return result;
}
