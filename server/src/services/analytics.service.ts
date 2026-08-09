import { AppError } from '../middlewares/errorHandler';
import { getFirmAnalytics } from '../repositories/notifications-activity.repository';

/**
 * Computes and returns comprehensive law firm analytics.
 * Enforces BOSS role requirement.
 */
export const getAnalytics = async (
  organizationId: string,
  role: string
) => {
  if (role !== 'BOSS') {
    throw new AppError('Access denied. Analytics are restricted to Senior Partners.', 403);
  }

  return getFirmAnalytics(organizationId);
};
