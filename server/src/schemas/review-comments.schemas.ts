import { z } from 'zod';

export const reviewDecisionSchema = z.object({
  decision: z.enum(['approved', 'rejected'], {
    required_error: 'Decision is required and must be either "approved" or "rejected".'
  }),
  notes: z
    .string()
    .max(2000, 'Review notes cannot exceed 2000 characters.')
    .optional()
    .default('')
});

export type ReviewDecisionInput = z.infer<typeof reviewDecisionSchema>;

export const createCommentSchema = z.object({
  commentText: z
    .string({ required_error: 'Comment text is required.' })
    .min(1, 'Comment text cannot be empty.')
    .max(2000, 'Comment cannot exceed 2000 characters.')
    .trim(),
  selectedText: z
    .string()
    .max(1000, 'Selected text snippet cannot exceed 1000 characters.')
    .optional()
    .default(''),
  parentCommentId: z
    .string()
    .min(1)
    .optional()
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const resolveCommentSchema = z.object({
  resolved: z
    .boolean()
    .optional()
    .default(true)
});

export type ResolveCommentInput = z.infer<typeof resolveCommentSchema>;
