import { Request, Response, NextFunction } from 'express';
import {
  listNotifications,
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearNotifications
} from '../services/notifications.service';

/**
 * GET /api/notifications
 * Lists notifications for the authenticated user.
 */
export const getNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const unreadOnly = req.query.unreadOnly === 'true';
    const result = await listNotifications(req.user!.userId, unreadOnly);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read.
 */
export const patchMarkAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const notification = await markAsRead(req.params.id, req.user!.userId);
    res.status(200).json({ status: 'success', data: { notification } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/notifications/read-all
 * Marks all notifications as read for current user.
 */
export const patchMarkAllAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await markAllAsRead(req.user!.userId);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/notifications/:id
 * Deletes a single notification.
 */
export const deleteNotificationById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await removeNotification(req.params.id, req.user!.userId);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/notifications
 * Clears all notifications for current user.
 */
export const deleteAllNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await clearNotifications(req.user!.userId);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};
