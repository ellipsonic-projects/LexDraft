import { Router } from 'express';
import { login, refresh, logout, me } from '../controllers/auth.controller';
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

export default router;
