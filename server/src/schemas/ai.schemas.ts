// ─── AI Validation Schemas ────────────────────────────────────────────────────
// Zod schemas for /api/ai routes

import { z } from 'zod';

export const reviewRequestSchema = z.object({
  documentId: z.string().uuid('Invalid documentId'),
  documentVersionId: z.string().uuid('Invalid documentVersionId'),
});

const REWRITE_ACTIONS = [
  'REWRITE_LEGALLY',
  'REWRITE_PROFESSIONALLY',
  'SIMPLIFY',
  'SUMMARIZE',
  'MAKE_DEFENSIBLE',
  'EXPAND',
  'SHORTEN',
  'IMPROVE_CLARITY',
  'IMPROVE_FORMALITY',
] as const;

export const rewriteRequestSchema = z.object({
  documentId: z.string().uuid('Invalid documentId'),
  documentVersionId: z.string().uuid('Invalid documentVersionId'),
  selectedText: z
    .string()
    .min(5, 'Selected text must be at least 5 characters')
    .max(10000, 'Selected text must be under 10,000 characters'),
  action: z.enum(REWRITE_ACTIONS, {
    errorMap: () => ({
      message: `action must be one of: ${REWRITE_ACTIONS.join(', ')}`,
    }),
  }),
  context: z.string().max(1000).optional(),
});

export const rewriteAcceptedSchema = z.object({
  documentId: z.string().uuid('Invalid documentId'),
  action: z.enum(REWRITE_ACTIONS),
  documentTitle: z.string().min(1),
});

export type ReviewRequestBody = z.infer<typeof reviewRequestSchema>;
export type RewriteRequestBody = z.infer<typeof rewriteRequestSchema>;
export type RewriteAcceptedBody = z.infer<typeof rewriteAcceptedSchema>;
