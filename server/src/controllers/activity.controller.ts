import { Request, Response, NextFunction } from 'express';
import { listActivityLogs } from '../services/activity.service';

/**
 * GET /api/activity-logs
 * Returns audit trail logs with role-based scoping and pagination.
 */
export const getActivityLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { entityType, userId, limit, page } = req.query;

    const result = await listActivityLogs(
      req.user!.organizationId,
      req.user!.userId,
      req.user!.role,
      {
        entityType: entityType as any,
        userId: userId ? String(userId) : undefined,
        limit: limit ? parseInt(String(limit), 10) : 50,
        page: page ? parseInt(String(page), 10) : 1
      }
    );

    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};
