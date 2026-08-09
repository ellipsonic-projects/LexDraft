import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { AppError } from './errorHandler';

/**
 * Wraps a Zod schema into an Express middleware that validates req.body.
 * Accepts any Zod schema, including those with .refine() (ZodEffects).
 * Returns 400 with field-level error detail on validation failure.
 */
export const validate =
  (schema: z.ZodTypeAny) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join('; ');
        next(new AppError(`Validation error — ${message}`, 400));
      } else {
        next(err);
      }
    }
  };
