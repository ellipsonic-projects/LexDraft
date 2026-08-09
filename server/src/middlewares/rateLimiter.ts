import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiter for authentication endpoints.
 * 10 requests per 15 minutes per IP — prevents brute-force attacks.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many login attempts. Please wait 15 minutes before trying again.'
  }
});
