import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload } from '../utils/tokens';
import { AppError } from './errorHandler';

// Extend Express Request to carry the authenticated user payload
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

/**
 * Verifies the JWT access token from the Authorization header.
 * Attaches the decoded payload to req.user.
 * Returns 401 if the token is missing, malformed, or expired.
 */
export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required. Please log in.', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err) {
    // Distinguish between expired and malformed tokens for client UX
    const error = err as { name?: string };
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Session expired. Please refresh your token.', 401));
    }
    return next(new AppError('Invalid authentication token.', 401));
  }
};
