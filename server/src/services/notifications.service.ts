import { AppError } from '../middlewares/errorHandler';
import {
  findUserNotifications,
  countUserUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications
} from '../repositories/notifications-activity.repository';

/**
 * Returns notifications for current user along with unread count.
 */
export const listNotifications = async (userId: string, unreadOnly = false) => {
  const [notifications, unreadCount] = await Promise.all([
    findUserNotifications(userId, unreadOnly),
    countUserUnreadNotifications(userId)
  ]);

  return {
    notifications,
    unreadCount
  };
};

/**
 * Marks a single notification as read, enforcing user ownership.
 */
export const markAsRead = async (notificationId: string, userId: string) => {
  const updated = await markNotificationAsRead(notificationId, userId);
  if (!updated) {
    throw new AppError('Notification not found.', 404);
  }
  return updated;
};

/**
 * Marks all notifications as read for current user.
 */
export const markAllAsRead = async (userId: string) => {
  const count = await markAllNotificationsAsRead(userId);
  return { count };
};

/**
 * Deletes a single notification for current user.
 */
export const removeNotification = async (notificationId: string, userId: string) => {
  const deleted = await deleteNotification(notificationId, userId);
  if (!deleted) {
    throw new AppError('Notification not found.', 404);
  }
  return { success: true };
};

/**
 * Clears all notifications for current user.
 */
export const clearNotifications = async (userId: string) => {
  const count = await clearAllNotifications(userId);
  return { count };
};
