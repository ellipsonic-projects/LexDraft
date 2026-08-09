import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: 'BOSS' | 'EMPLOYEE';
  organizationId: string;
}

/**
 * Signs a short-lived JWT access token (15 minutes).
 */
export const signAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
};

/**
 * Signs a long-lived JWT refresh token (7 days).
 */
export const signRefreshToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

/**
 * Verifies and decodes an access token. Throws if invalid or expired.
 */
export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
};

/**
 * Verifies and decodes a refresh token. Throws if invalid or expired.
 */
export const verifyRefreshToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as AccessTokenPayload;
};

/**
 * Generates a cryptographically secure opaque token string.
 * Used as the raw refresh token stored in the httpOnly cookie.
 */
export const generateOpaqueToken = (): string => {
  return crypto.randomBytes(64).toString('hex');
};

/**
 * Returns a SHA-256 hash of the raw token for safe DB storage.
 * Only the hash is stored — the raw token is never persisted.
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
