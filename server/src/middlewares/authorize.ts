import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AppError } from './errorHandler';

/**
 * Role-based access control factory.
 * Returns a middleware that rejects requests from users whose role
 * is not in the allowed list. Must be used AFTER `authenticate`.
 *
 * Usage:
 *   router.post('/templates', authenticate, authorize('BOSS'), createTemplate);
 */
export const authorize =
  (...allowedRoles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      return next(
        new AppError(
          `Access denied. This action requires one of the following roles: ${allowedRoles.join(', ')}.`,
          403
        )
      );
    }

    next();
  };
