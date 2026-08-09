import { z } from 'zod';

export const activityLogQuerySchema = z.object({
  entityType: z
    .enum(['document', 'template', 'task', 'customization'])
    .optional(),
  userId: z
    .string()
    .optional(),
  limit: z
    .coerce
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .default(50),
  page: z
    .coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(1)
});

export type ActivityLogQueryInput = z.infer<typeof activityLogQuerySchema>;
