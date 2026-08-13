import { WorkflowTask, TaskStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { CreateTaskInput } from '../schemas/clients-matters-tasks.schemas';

/**
 * Returns all tasks for the organization.
 * If assigneeId is provided, restricts to tasks assigned to that user.
 */
export const findAllTasks = async (
  organizationId: string,
  assigneeId?: string
): Promise<WorkflowTask[]> => {
  return prisma.workflowTask.findMany({
    where: {
      organizationId,
      ...(assigneeId ? { assigneeId } : {})
    },
    include: {
      assignee: { select: { id: true, name: true, role: true, avatarUrl: true } },
      assignedBy: { select: { id: true, name: true } },
      client: { select: { id: true, name: true, contactEmail: true, contactPhone: true } },
      matter: { select: { id: true, title: true, matterCode: true } },
      template: { select: { id: true, name: true, category: true } },
      document: { select: { id: true, title: true, status: true, currentVersion: true } },
      clientApprovals: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          status: true,
          documentVersion: true,
          approvedAt: true,
          rejectedAt: true,
          recipientEmail: true,
          createdAt: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

/**
 * Returns a single task by ID, scoped to the organization.
 */
export const findTaskById = async (
  id: string,
  organizationId: string
): Promise<WorkflowTask | null> => {
  return prisma.workflowTask.findFirst({
    where: { id, organizationId },
    include: {
      assignee: { select: { id: true, name: true, role: true } },
      assignedBy: { select: { id: true, name: true } },
      client: { select: { id: true, name: true, contactEmail: true, contactPhone: true } },
      matter: { select: { id: true, title: true, matterCode: true } },
      template: { select: { id: true, name: true, category: true } },
      document: { select: { id: true, title: true, status: true, currentVersion: true } },
      clientApprovals: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          status: true,
          documentVersion: true,
          approvedAt: true,
          rejectedAt: true,
          recipientEmail: true,
          createdAt: true
        }
      }
    }
  });
};

/**
 * Creates a new workflow task.
 */
export const createTask = async (
  data: CreateTaskInput,
  assignedById: string,
  organizationId: string
): Promise<WorkflowTask> => {
  return prisma.workflowTask.create({
    data: {
      templateId: data.templateId,
      title: data.title,
      clientId: data.clientId,
      matterId: data.matterId,
      assigneeId: data.assigneeId,
      assignedById,
      priority: data.priority,
      dueDate: new Date(data.dueDate),
      notes: data.notes,
      requirements: data.requirements,
      organizationId,
      status: 'assigned'
    },
    include: {
      assignee: { select: { id: true, name: true, role: true, avatarUrl: true } },
      assignedBy: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      matter: { select: { id: true, title: true, matterCode: true } },
      template: { select: { id: true, name: true, category: true } }
    }
  });
};

/**
 * Updates only the status field of a task.
 * Caller is responsible for transition validation before calling this.
 */
export const updateTaskStatus = async (
  id: string,
  newStatus: TaskStatus
): Promise<WorkflowTask> => {
  return prisma.workflowTask.update({
    where: { id },
    data: { status: newStatus },
    include: {
      assignee: { select: { id: true, name: true, role: true } },
      client: { select: { id: true, name: true } },
      matter: { select: { id: true, title: true } }
    }
  });
};
