import { Router } from 'express';
import { login, refresh, logout, me, getUsers } from '../controllers/auth.controller';
import { forgotPassword, validateResetTokenHandler, resetPasswordHandler } from '../controllers/password-reset.controller';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { authRateLimiter } from '../middlewares/rateLimiter';
import { loginSchema } from '../schemas/auth.schemas';

const router = Router();

/**
 * POST /api/auth/login
 * Rate limited. Validates body with Zod. Authenticates credentials.
 */
router.post('/login', authRateLimiter, validate(loginSchema), login);

/**
 * POST /api/auth/refresh
 * Reads httpOnly cookie. Rotates refresh token. Returns new access token.
 */
router.post('/refresh', refresh);

/**
 * POST /api/auth/logout
 * Revokes refresh token from DB and clears the cookie.
 */
router.post('/logout', logout);

/**
 * GET /api/auth/me
 * Protected. Returns current user profile from the database.
 */
router.get('/me', authenticate, me);

/**
 * GET /api/auth/users
 * Protected. Returns list of all users/lawyers in the same organization.
 */
router.get('/users', authenticate, getUsers);

/**
 * POST /api/auth/forgot-password
 * Public. Rate limited. Sends a password reset email.
 */
router.post('/forgot-password', authRateLimiter, forgotPassword);

/**
 * GET /api/auth/reset-password/validate/:token
 * Public. Rate limited. Validates a password reset token.
 */
router.get('/reset-password/validate/:token', authRateLimiter, validateResetTokenHandler);

/**
 * POST /api/auth/reset-password/:token
 * Public. Rate limited. Resets the user's password.
 */
router.post('/reset-password/:token', authRateLimiter, resetPasswordHandler);

export default router;
