import { EntityType } from '@prisma/client';
import { findActivityLogs } from '../repositories/notifications-activity.repository';
import { ActivityLogQueryInput } from '../schemas/notifications-activity.schemas';

/**
 * Returns immutable audit activity logs.
 * Enforces role-based scoping:
 *   - BOSS: sees all firm-wide activity logs (or can filter by userId).
 *   - EMPLOYEE: strictly restricted to their own activity logs.
 */
export const listActivityLogs = async (
  organizationId: string,
  userId: string,
  role: string,
  query: ActivityLogQueryInput
) => {
  // Scoping: EMPLOYEE can only view their own logs
  const filterUserId = role === 'BOSS' ? query.userId : userId;

  return findActivityLogs(organizationId, filterUserId, {
    entityType: query.entityType as EntityType | undefined,
    limit: query.limit,
    page: query.page
  });
};
