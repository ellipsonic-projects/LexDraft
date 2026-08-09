import { User } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { hashToken } from '../utils/tokens';


/**
 * Finds a user by their email address.
 */
export const findUserByEmail = async (email: string): Promise<User | null> => {
  return prisma.user.findUnique({ where: { email } });
};

/**
 * Finds a user by their ID.
 */
export const findUserById = async (id: string): Promise<User | null> => {
  return prisma.user.findUnique({ where: { id } });
};

/**
 * Stores a hashed refresh token in the database.
 */
export const createRefreshToken = async (
  userId: string,
  rawToken: string,
  expiresAt: Date
): Promise<void> => {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt }
  });
};

/**
 * Finds a refresh token record by the raw token value (hashed for lookup).
 * Returns null if not found or expired.
 */
export const findRefreshToken = async (rawToken: string) => {
  const tokenHash = hashToken(rawToken);
  return prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true }
  });
};

/**
 * Deletes a specific refresh token (used on logout or rotation).
 */
export const deleteRefreshToken = async (rawToken: string): Promise<void> => {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
};

/**
 * Deletes all refresh tokens for a user (used for "logout from all devices").
 */
export const deleteAllRefreshTokensForUser = async (userId: string): Promise<void> => {
  await prisma.refreshToken.deleteMany({ where: { userId } });
};

/**
 * Purges all expired refresh tokens from the database (maintenance).
 */
export const purgeExpiredTokens = async (): Promise<void> => {
  await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } }
  });
};
