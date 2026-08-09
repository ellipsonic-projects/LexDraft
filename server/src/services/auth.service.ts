import bcrypt from 'bcrypt';
import { AppError } from '../middlewares/errorHandler';
import {
  findUserByEmail,
  findUserById,
  createRefreshToken,
  findRefreshToken,
  deleteRefreshToken
} from '../repositories/auth.repository';
import {
  signAccessToken,
  generateOpaqueToken,
  verifyRefreshToken,
  AccessTokenPayload
} from '../utils/tokens';

const REFRESH_TOKEN_EXPIRY_DAYS = 7;

/**
 * Validates credentials and returns a new access token + opaque refresh token.
 * Throws 401 if email or password does not match.
 */
export const loginUser = async (
  email: string,
  password: string
): Promise<{ accessToken: string; refreshToken: string; user: Record<string, unknown> }> => {
  const user = await findUserByEmail(email.toLowerCase().trim());
  if (!user) {
    throw new AppError('Invalid email or password.', 401);
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    throw new AppError('Invalid email or password.', 401);
  }

  const payload: AccessTokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role as 'BOSS' | 'EMPLOYEE',
    organizationId: user.organizationId
  };

  const accessToken = signAccessToken(payload);
  const rawRefreshToken = generateOpaqueToken();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  await createRefreshToken(user.id, rawRefreshToken, expiresAt);

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      title: user.title,
      avatarUrl: user.avatarUrl,
      status: user.status
    }
  };
};

/**
 * Validates a raw refresh token from the httpOnly cookie.
 * Rotates the token (deletes old, creates new) and returns a new access token.
 * Throws 401 if the token is missing, not found in DB, or expired.
 */
export const refreshUserSession = async (
  rawRefreshToken: string
): Promise<{ accessToken: string; newRefreshToken: string }> => {
  const record = await findRefreshToken(rawRefreshToken);

  if (!record) {
    throw new AppError('Invalid or expired refresh token. Please log in again.', 401);
  }

  if (record.expiresAt < new Date()) {
    // Clean up the expired record
    await deleteRefreshToken(rawRefreshToken);
    throw new AppError('Session expired. Please log in again.', 401);
  }

  // Verify the token signature as an additional integrity check
  try {
    verifyRefreshToken(rawRefreshToken);
  } catch {
    await deleteRefreshToken(rawRefreshToken);
    throw new AppError('Invalid refresh token. Please log in again.', 401);
  }

  const user = record.user;

  const payload: AccessTokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role as 'BOSS' | 'EMPLOYEE',
    organizationId: user.organizationId
  };

  // Token rotation — delete old, issue new
  await deleteRefreshToken(rawRefreshToken);
  const newRawRefreshToken = generateOpaqueToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  await createRefreshToken(user.id, newRawRefreshToken, expiresAt);

  const accessToken = signAccessToken(payload);

  return { accessToken, newRefreshToken: newRawRefreshToken };
};

/**
 * Revokes the current session by deleting the refresh token from the DB.
 */
export const logoutUser = async (rawRefreshToken: string): Promise<void> => {
  await deleteRefreshToken(rawRefreshToken);
};

/**
 * Returns the current authenticated user's profile from the database.
 * Throws 404 if the user no longer exists.
 */
export const getCurrentUser = async (userId: string): Promise<Record<string, unknown>> => {
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError('User not found.', 404);
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    title: user.title,
    avatarUrl: user.avatarUrl,
    status: user.status,
    organizationId: user.organizationId
  };
};
