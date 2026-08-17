import { prisma } from '../lib/prisma';
import { UserRole } from '@prisma/client';
import crypto from 'crypto';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createInvitation(
  organizationId: string,
  invitedByUserId: string,
  email: string,
  name: string,
  role: UserRole,
  token: string,
  expiresAt: Date
) {
  return prisma.workspaceInvitation.create({
    data: {
      organizationId,
      invitedByUserId,
      email: email.toLowerCase().trim(),
      name,
      role,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });
}

export async function findInvitationByToken(token: string) {
  return prisma.workspaceInvitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { organization: true, invitedByUser: { select: { name: true, email: true } } },
  });
}

export async function findPendingInvitationByEmail(organizationId: string, email: string) {
  return prisma.workspaceInvitation.findFirst({
    where: {
      organizationId,
      email: email.toLowerCase().trim(),
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
}

export async function markInvitationAccepted(id: string) {
  return prisma.workspaceInvitation.update({
    where: { id },
    data: { acceptedAt: new Date() },
  });
}

export async function revokeInvitation(id: string, organizationId: string) {
  return prisma.workspaceInvitation.updateMany({
    where: { id, organizationId },
    data: { revokedAt: new Date() },
  });
}

export async function listOrganizationInvitations(organizationId: string) {
  return prisma.workspaceInvitation.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    include: { invitedByUser: { select: { name: true } } },
  });
}
