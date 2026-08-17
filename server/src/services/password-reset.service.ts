import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { sendPasswordResetEmail } from './email.service';

const RESET_EXPIRY_MINUTES = 30;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function requestPasswordReset(email: string, frontendBaseUrl: string) {
  const normalizedEmail = email.toLowerCase().trim();

  // Always respond successfully to avoid user enumeration
  const user = await prisma.user.findFirst({ where: { email: normalizedEmail } });
  if (!user) return;

  // Invalidate all existing unused reset tokens for this email
  await prisma.passwordReset.updateMany({
    where: { email: normalizedEmail, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + RESET_EXPIRY_MINUTES * 60 * 1000);

  await prisma.passwordReset.create({
    data: {
      email: normalizedEmail,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  const resetLink = `${frontendBaseUrl}/reset-password/${token}`;
  await sendPasswordResetEmail(normalizedEmail, user.name, resetLink, RESET_EXPIRY_MINUTES);
}

export async function validateResetToken(token: string) {
  const record = await prisma.passwordReset.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!record) throw new Error('Invalid or expired reset link.');
  if (record.usedAt) throw new Error('This reset link has already been used.');
  if (new Date() > record.expiresAt) throw new Error('This reset link has expired. Please request a new one.');

  return record;
}

export async function resetPassword(token: string, newPassword: string) {
  const record = await validateResetToken(token);

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.updateMany({
    where: { email: record.email },
    data: { passwordHash },
  });

  await prisma.passwordReset.update({
    where: { tokenHash: hashToken(token) },
    data: { usedAt: new Date() },
  });
}
