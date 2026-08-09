import { z } from 'zod';

export const generateDocumentSchema = z.object({
  templateId: z
    .string({ required_error: 'Template ID is required.' })
    .min(1, 'Template ID is required.'),
  clientId: z
    .string({ required_error: 'Client ID is required.' })
    .min(1, 'Client ID is required.'),
  matterId: z
    .string({ required_error: 'Matter ID is required.' })
    .min(1, 'Matter ID is required.'),
  taskId: z
    .string()
    .min(1)
    .optional(),
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters.')
    .max(200, 'Title cannot exceed 200 characters.')
    .optional(),
  priority: z
    .enum(['low', 'medium', 'high', 'urgent'])
    .optional()
    .default('medium'),
  dueDate: z
    .string()
    .optional(),
  variables: z
    .record(z.string(), z.string())
    .refine((val) => typeof val === 'object' && val !== null, {
      message: 'Variables must be a key-value object.'
    })
});

export type GenerateDocumentInput = z.infer<typeof generateDocumentSchema>;

export const saveDraftSchema = z.object({
  content: z
    .string({ required_error: 'Document content is required.' })
    .min(1, 'Document content cannot be empty.'),
  variables: z
    .record(z.string(), z.string())
    .optional()
    .default({}),
  changeDescription: z
    .string()
    .max(500, 'Change description cannot exceed 500 characters.')
    .optional()
    .default('Saved draft version checkpoint.')
});

export type SaveDraftInput = z.infer<typeof saveDraftSchema>;
