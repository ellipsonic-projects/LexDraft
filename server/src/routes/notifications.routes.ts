import { Router } from 'express';
import {
  getNotifications,
  patchMarkAsRead,
  patchMarkAllAsRead,
  deleteNotificationById,
  deleteAllNotifications
} from '../controllers/notifications.controller';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

/**
 * GET /api/notifications
 * Lists current user's notifications.
 */
router.get('/', getNotifications);

/**
 * PATCH /api/notifications/read-all
 * Marks all notifications as read for current user.
 */
router.patch('/read-all', patchMarkAllAsRead);

/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read.
 */
router.patch('/:id/read', patchMarkAsRead);

/**
 * DELETE /api/notifications/:id
 * Deletes a single notification.
 */
router.delete('/:id', deleteNotificationById);

/**
 * DELETE /api/notifications
 * Clears all notifications for current user.
 */
router.delete('/', deleteAllNotifications);

export default router;
