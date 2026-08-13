import { TaskStatus } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';
import { validateTaskTransition } from '../utils/transitions';
import { prisma } from '../lib/prisma';
import { findClientById } from '../repositories/clients.repository';
import {
  findAllTasks,
  findTaskById,
  createTask as repoCreateTask,
  updateTaskStatus as repoUpdateTaskStatus
} from '../repositories/tasks.repository';
import {
  CreateTaskInput
} from '../schemas/clients-matters-tasks.schemas';
import {
  sendTaskAssignedEmail,
  sendTaskInProgressEmail
} from './email.service';

/**
 * Returns tasks visible to the requesting user.
 * - BOSS: sees all tasks in the organization.
 * - EMPLOYEE: sees only their assigned tasks.
 */
export const listTasks = async (
  organizationId: string,
  requestingUserId: string,
  requestingUserRole: string
) => {
  const assigneeFilter = requestingUserRole === 'BOSS' ? undefined : requestingUserId;
  return findAllTasks(organizationId, assigneeFilter);
};

/**
 * Retrieves a single task by ID with strict IDOR protection:
 * - Must belong to requesting user's organization (returns 404 for cross-tenant probes).
 * - If EMPLOYEE, task must be assigned to the requesting user (returns 403 on mismatch).
 */
export const getTask = async (
  taskId: string,
  requestingUserId: string,
  requestingUserRole: string,
  organizationId: string
) => {
  const task = await findTaskById(taskId, organizationId);
  if (!task) {
    throw new AppError('Task not found.', 404);
  }

  if (requestingUserRole === 'EMPLOYEE' && task.assigneeId !== requestingUserId) {
    throw new AppError('Access denied. You can only view tasks assigned to you.', 403);
  }

  return task;
};

/**
 * Creates and assigns a new workflow task.
 * Validates:
 *   - The client belongs to this organization.
 *   - The assignee must be an EMPLOYEE (BOSS cannot be assigned tasks — validated via DB query).
 * Initial status is always 'assigned'.
 * Sends TASK_ASSIGNED transactional email to client (non-blocking).
 */
export const createTask = async (
  data: CreateTaskInput,
  assignedById: string,
  organizationId: string
) => {
  // Verify client belongs to this organization
  const client = await findClientById(data.clientId, organizationId);
  if (!client) {
    throw new AppError('Client not found.', 404);
  }

  // Verify assignee exists in this organization
  const assignee = await prisma.user.findFirst({
    where: { id: data.assigneeId, organizationId }
  });
  if (!assignee) {
    throw new AppError('Assignee not found in this organization.', 404);
  }

  // Verify template exists in this organization
  const template = await prisma.legalTemplate.findFirst({
    where: { id: data.templateId, organizationId }
  });
  if (!template) {
    throw new AppError('Template not found.', 404);
  }

  // Verify matter belongs to the specified client
  const matter = await prisma.matter.findFirst({
    where: { id: data.matterId, clientId: data.clientId }
  });
  if (!matter) {
    throw new AppError('Matter not found for the specified client.', 404);
  }

  const createdTask = await repoCreateTask(data, assignedById, organizationId);

  // Dispatch Task Assigned Transactional Email (async, fail-safe)
  const now = new Date();
  const formattedAssignedDate = now.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const formattedDueDate = new Date(data.dueDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  sendTaskAssignedEmail({
    recipientEmail: client.contactEmail,
    clientName: client.name,
    matterTitle: matter.title || data.title,
    lawyerName: assignee.name,
    priority: data.priority,
    dueDate: formattedDueDate,
    assignedDate: formattedAssignedDate,
    taskId: createdTask.id
  }).catch((err) => console.error('Failed to dispatch task assignment email:', err));

  return createdTask;
};

/**
 * Updates the status of a task, enforcing:
 *   1. Task must exist and belong to this organization.
 *   2. State transition must be valid per validateTaskTransition().
 *   3. EMPLOYEE can only update tasks assigned to them.
 *   4. EMPLOYEE cannot directly set status to 'approved' or 'completed'
 *      (those are system/boss-only transitions).
 *   5. Sends TASK_IN_PROGRESS transactional email when transition is assigned -> in_progress.
 */
export const updateTaskStatus = async (
  taskId: string,
  requestedStatus: TaskStatus,
  requestingUserId: string,
  requestingUserRole: string,
  organizationId: string
) => {
  const task = await findTaskById(taskId, organizationId);
  if (!task) {
    throw new AppError('Task not found.', 404);
  }

  // EMPLOYEE can only update their own assigned tasks
  if (requestingUserRole === 'EMPLOYEE' && task.assigneeId !== requestingUserId) {
    throw new AppError('You can only update tasks assigned to you.', 403);
  }

  // EMPLOYEE cannot directly transition to system-controlled statuses
  const bossOnlyStatuses: TaskStatus[] = ['approved', 'completed'];
  if (requestingUserRole === 'EMPLOYEE' && bossOnlyStatuses.includes(requestedStatus)) {
    throw new AppError(
      `Status "${requestedStatus}" can only be set by a Senior Partner.`,
      403
    );
  }

  // Validate state transition
  const isValidTransition = validateTaskTransition(task.status, requestedStatus);
  if (!isValidTransition) {
    throw new AppError(
      `Invalid status transition from "${task.status}" to "${requestedStatus}".`,
      422
    );
  }

  const updatedTask = await repoUpdateTaskStatus(taskId, requestedStatus);

  // If genuine transition from assigned -> in_progress, notify client
  if (task.status === TaskStatus.assigned && requestedStatus === TaskStatus.in_progress) {
    const formattedDueDate = new Date(task.dueDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const clientEmail = (task as any).client?.contactEmail;
    const clientName = (task as any).client?.name || 'Valued Client';
    const lawyerName = (task as any).assignee?.name || 'Assigned Lawyer';
    const matterTitle = (task as any).matter?.title || task.title;

    if (clientEmail) {
      sendTaskInProgressEmail({
        recipientEmail: clientEmail,
        clientName,
        matterTitle,
        lawyerName,
        dueDate: formattedDueDate,
        taskId: task.id
      }).catch((err) => console.error('Failed to dispatch task in-progress email:', err));
    }
  }

  return updatedTask;
};
