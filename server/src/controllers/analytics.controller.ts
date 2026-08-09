import { Request, Response, NextFunction } from 'express';
import { getAnalytics } from '../services/analytics.service';

/**
 * GET /api/analytics
 * Returns comprehensive operational analytics for Senior Partners.
 */
export const getFirmAnalyticsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const analytics = await getAnalytics(
      req.user!.organizationId,
      req.user!.role
    );

    res.status(200).json({ status: 'success', data: { analytics } });
  } catch (err) {
    next(err);
  }
};
