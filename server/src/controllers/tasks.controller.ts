import { Request, Response, NextFunction } from 'express';
import { TaskStatus } from '@prisma/client';
import { listTasks, getTask, createTask, updateTaskStatus, deleteTask } from '../services/tasks.service';

/**
 * GET /api/tasks
 * Returns tasks visible to the requesting user:
 *   - BOSS: all tasks in organization.
 *   - EMPLOYEE: only their assigned tasks.
 */
export const getTasks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tasks = await listTasks(
      req.user!.organizationId,
      req.user!.userId,
      req.user!.role
    );
    res.status(200).json({ status: 'success', data: { tasks } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/tasks/:id
 * Retrieves a single task with IDOR protection:
 * - EMPLOYEE can only view tasks assigned to them (403 otherwise).
 * - Cross-org task IDs return 404 (tenant isolation).
 */
export const getTaskById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const task = await getTask(
      req.params.id,
      req.user!.userId,
      req.user!.role,
      req.user!.organizationId
    );
    res.status(200).json({ status: 'success', data: { task } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/tasks
 * Creates and assigns a new task. Requires BOSS role.
 */
export const postTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const task = await createTask(
      req.body,
      req.user!.userId,
      req.user!.organizationId
    );
    res.status(201).json({ status: 'success', data: { task } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/tasks/:id/status
 * Updates task status. Enforces state machine and RBAC in service layer.
 */
export const patchTaskStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const task = await updateTaskStatus(
      req.params.id,
      req.body.status as TaskStatus,
      req.user!.userId,
      req.user!.role,
      req.user!.organizationId
    );
    res.status(200).json({ status: 'success', data: { task } });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/tasks/:id
 * Hard deletes a task. Only BOSS role.
 */
export const deleteTaskController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await deleteTask(
      req.params.id,
      req.user!.role,
      req.user!.organizationId
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};
