import { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import { env } from '../config/env';

// Configure Winston logger
export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: env.NODE_ENV === 'production'
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
    })
  ]
});

/**
 * Operational application error (expected, user-safe to expose).
 * Any error thrown with this class will have its message shown to the client.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    // Maintain correct prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global Express error handler — must be registered LAST as app.use().
 * Catches all errors from next(err), logs them, and returns a clean JSON response.
 * Never leaks stack traces in production.
 */
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const message = isAppError
    ? err.message
    : 'An unexpected error occurred. Please try again later.';

  // Log all errors server-side
  logger.error({
    message: isAppError ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    path: req.path,
    method: req.method,
    statusCode
  });

  res.status(statusCode).json({
    status: 'error',
    message,
    // Only include stack trace in development for non-production debugging
    ...(env.NODE_ENV === 'development' && err instanceof Error
      ? { stack: err.stack }
      : {})
  });
};
