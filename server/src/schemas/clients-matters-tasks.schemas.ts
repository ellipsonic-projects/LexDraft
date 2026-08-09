import { z } from 'zod';

// ─── Client Schemas ───────────────────────────────────────────────────────────

export const createClientSchema = z.object({
  name: z
    .string({ required_error: 'Client name is required.' })
    .min(2, 'Client name must be at least 2 characters.')
    .max(100, 'Client name must be at most 100 characters.')
    .trim(),
  contactEmail: z
    .string({ required_error: 'Contact email is required.' })
    .email('Must be a valid email address.')
    .toLowerCase()
    .trim(),
  contactPhone: z
    .string({ required_error: 'Contact phone is required.' })
    .min(5, 'Contact phone must be at least 5 characters.')
    .max(20, 'Contact phone must be at most 20 characters.')
    .trim()
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

// ─── Matter Schemas ───────────────────────────────────────────────────────────

export const createMatterSchema = z.object({
  clientId: z
    .string({ required_error: 'Client ID is required.' })
    .min(1, 'Client ID is required.'),
  title: z
    .string({ required_error: 'Matter title is required.' })
    .min(2, 'Matter title must be at least 2 characters.')
    .max(150, 'Matter title must be at most 150 characters.')
    .trim(),
  matterCode: z
    .string({ required_error: 'Matter code is required.' })
    .min(2, 'Matter code must be at least 2 characters.')
    .max(30, 'Matter code must be at most 30 characters.')
    .trim()
    .toUpperCase()
});

export type CreateMatterInput = z.infer<typeof createMatterSchema>;

// ─── Task Schemas ─────────────────────────────────────────────────────────────

export const createTaskSchema = z.object({
  templateId: z
    .string({ required_error: 'Template ID is required.' })
    .min(1),
  title: z
    .string({ required_error: 'Task title is required.' })
    .min(2, 'Title must be at least 2 characters.')
    .max(200, 'Title must be at most 200 characters.')
    .trim(),
  clientId: z
    .string({ required_error: 'Client ID is required.' })
    .min(1, 'Client ID is required.'),
  matterId: z
    .string({ required_error: 'Matter ID is required.' })
    .min(1, 'Matter ID is required.'),
  assigneeId: z
    .string({ required_error: 'Assignee ID is required.' })
    .min(1, 'Assignee ID is required.'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  dueDate: z
    .string({ required_error: 'Due date is required.' })
    .datetime({ message: 'dueDate must be a valid ISO 8601 date-time string.' }),
  notes: z.string().max(1000).trim().optional(),
  requirements: z.string().max(2000).trim().optional()
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskStatusSchema = z.object({
  status: z.enum(
    ['assigned', 'in_progress', 'draft_ready', 'under_review', 'approved', 'completed'],
    { required_error: 'Status is required.' }
  )
});

export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
