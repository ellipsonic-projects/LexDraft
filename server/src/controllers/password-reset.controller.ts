import { Request, Response, NextFunction } from 'express';
import { requestPasswordReset, validateResetToken, resetPassword } from '../services/password-reset.service';
import { env } from '../config/env';

const FRONTEND_URL = env.FRONTEND_URL || (env.NODE_ENV === 'production' ? 'https://lexdraft-frontend.onrender.com' : 'http://localhost:5173');

/**
 * POST /api/auth/forgot-password
 * Public: Request a password reset link.
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ status: 'error', message: 'Email is required.' });
      return;
    }

    await requestPasswordReset(email, FRONTEND_URL);

    // Always respond successfully to prevent user enumeration
    res.status(200).json({
      status: 'success',
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/reset-password/validate/:token
 * Public: Validate a password reset token.
 */
export const validateResetTokenHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.params;
    await validateResetToken(token);
    res.status(200).json({ status: 'success', message: 'Token is valid.' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/reset-password/:token
 * Public: Reset password using a valid token.
 */
export const resetPasswordHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      res.status(400).json({ status: 'error', message: 'Password must be at least 8 characters.' });
      return;
    }

    await resetPassword(token, password);

    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (err) {
    next(err);
  }
};
