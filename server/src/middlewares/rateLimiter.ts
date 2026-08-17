import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiter for authentication endpoints.
 * 10 requests per 15 minutes per IP — prevents brute-force attacks.
 */
const isProduction = process.env.NODE_ENV === 'production';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 10 : 1000, // Permit up to 1000 attempts in development
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many login attempts. Please wait 15 minutes before trying again.'
  }
});
