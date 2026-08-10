import { Request, Response, NextFunction } from 'express';
import {
  loginUser,
  refreshUserSession,
  logoutUser,
  getCurrentUser,
  listOrganizationUsers
} from '../services/auth.service';
import { env } from '../config/env';

const COOKIE_NAME = 'lexdraft_refresh_token';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in ms
};

/**
 * POST /api/auth/login
 * Authenticates user, returns access token in body, refresh token in httpOnly cookie.
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;
    const { accessToken, refreshToken, user } = await loginUser(email, password);

    res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTIONS);

    res.status(200).json({
      status: 'success',
      data: { accessToken, user }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/refresh
 * Reads the httpOnly refresh token cookie, rotates the session,
 * and returns a new access token.
 */
export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawRefreshToken: string | undefined = req.cookies[COOKIE_NAME];

    if (!rawRefreshToken) {
      res.status(401).json({
        status: 'error',
        message: 'No refresh token found. Please log in.'
      });
      return;
    }

    const { accessToken, newRefreshToken } = await refreshUserSession(rawRefreshToken);

    // Rotate the cookie with the new refresh token
    res.cookie(COOKIE_NAME, newRefreshToken, COOKIE_OPTIONS);

    res.status(200).json({
      status: 'success',
      data: { accessToken }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 * Revokes the refresh token from the DB and clears the cookie.
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawRefreshToken: string | undefined = req.cookies[COOKIE_NAME];

    if (rawRefreshToken) {
      await logoutUser(rawRefreshToken);
    }

    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully.'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile data from the database.
 */
export const me = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const user = await getCurrentUser(userId);

    res.status(200).json({
      status: 'success',
      data: { user }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/users
 * Returns list of all users/lawyers in the same organization.
 */
export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgId = req.user!.organizationId;
    const users = await listOrganizationUsers(orgId);

    res.status(200).json({
      status: 'success',
      data: { users }
    });
  } catch (err) {
    next(err);
  }
};
