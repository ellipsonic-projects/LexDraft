import { z } from 'zod';

// ─── Allowed Categories ───────────────────────────────────────────────────────
export const TEMPLATE_CATEGORIES = [
  'Real Estate',
  'Corporate',
  'IP & Tech',
  'Employment',
  'Litigation',
  'General'
] as const;

export type TemplateCategory = typeof TEMPLATE_CATEGORIES[number];

// ─── Variable type enum (mirrors Prisma VariableType enum) ───────────────────
const VARIABLE_TYPES = ['text', 'currency', 'date', 'number', 'multiline', 'address', 'select'] as const;

// ─── Single variable schema (used both standalone and nested in requests) ─────
export const templateVariableSchema = z.object({
  key: z
    .string({ required_error: 'Variable key is required.' })
    .min(1, 'Variable key cannot be empty.')
    .max(80, 'Variable key must be at most 80 characters.')
    .regex(
      /^[A-Za-z_][A-Za-z0-9_]*$/,
      'Variable key must start with a letter or underscore and contain only letters, numbers, or underscores.'
    ),
  label: z
    .string({ required_error: 'Variable label is required.' })
    .min(1, 'Label cannot be empty.')
    .max(120, 'Label must be at most 120 characters.'),
  type: z.enum(VARIABLE_TYPES, {
    required_error: 'Variable type is required.',
    message: `Variable type must be one of: ${VARIABLE_TYPES.join(', ')}.`
  }),
  required: z.boolean({ required_error: 'required flag is required.' }),
  defaultValue: z.string().max(500).optional(),
  options: z
    .array(z.string().min(1).max(100))
    .max(50, 'At most 50 options are allowed.')
    .optional()
    .default([])
});

export type TemplateVariableInput = z.infer<typeof templateVariableSchema>;

// ─── Create Template ──────────────────────────────────────────────────────────
export const createTemplateSchema = z.object({
  name: z
    .string({ required_error: 'Template name is required.' })
    .min(3, 'Template name must be at least 3 characters.')
    .max(150, 'Template name must be at most 150 characters.')
    .trim(),
  category: z.enum(TEMPLATE_CATEGORIES, {
    required_error: 'Category is required.',
    message: `Category must be one of: ${TEMPLATE_CATEGORIES.join(', ')}.`
  }),
  description: z
    .string({ required_error: 'Description is required.' })
    .min(10, 'Description must be at least 10 characters.')
    .max(500, 'Description must be at most 500 characters.')
    .trim(),
  originalFileName: z
    .string({ required_error: 'Original file name is required.' })
    .min(1, 'Original file name is required.')
    .max(200)
    .trim(),
  contentTemplate: z
    .string({ required_error: 'Content template is required.' })
    .min(20, 'Content template must be at least 20 characters.'),
  variables: z
    .array(templateVariableSchema)
    .max(100, 'A template can have at most 100 variables.')
    .optional()
    .default([])
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

// ─── Update (Edit) Template ───────────────────────────────────────────────────
export const updateTemplateSchema = z.object({
  name: z
    .string()
    .min(3, 'Template name must be at least 3 characters.')
    .max(150)
    .trim()
    .optional(),
  category: z
    .enum(TEMPLATE_CATEGORIES, {
      message: `Category must be one of: ${TEMPLATE_CATEGORIES.join(', ')}.`
    })
    .optional(),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters.')
    .max(500)
    .trim()
    .optional(),
  contentTemplate: z
    .string()
    .min(20, 'Content template must be at least 20 characters.')
    .optional(),
  status: z.enum(['active', 'inactive']).optional(),
  variables: z
    .array(templateVariableSchema)
    .max(100)
    .optional(),
  changeSummary: z
    .string({ required_error: 'Change summary is required when editing a template.' })
    .min(5, 'Change summary must be at least 5 characters.')
    .max(500)
    .trim()
}).refine(
  (data) => Object.keys(data).some((k) => k !== 'changeSummary' && data[k as keyof typeof data] !== undefined),
  { message: 'At least one field must be provided for update.' }
);

export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

// ─── Customization Request ────────────────────────────────────────────────────
export const createCustomizationRequestSchema = z.object({
  templateId: z
    .string({ required_error: 'Template ID is required.' })
    .min(1, 'Template ID is required.'),
  reason: z
    .string({ required_error: 'Reason is required.' })
    .min(10, 'Reason must be at least 10 characters.')
    .max(1000, 'Reason must be at most 1000 characters.')
    .trim(),
  customVariables: z
    .array(templateVariableSchema)
    .min(1, 'At least one custom variable must be provided.')
    .max(20, 'At most 20 custom variables per request.')
});

export type CreateCustomizationRequestInput = z.infer<typeof createCustomizationRequestSchema>;

// ─── Reject Customization Request ────────────────────────────────────────────
export const rejectCustomizationRequestSchema = z.object({
  rejectionNote: z
    .string()
    .max(500, 'Rejection note must be at most 500 characters.')
    .trim()
    .optional()
});

export type RejectCustomizationRequestInput = z.infer<typeof rejectCustomizationRequestSchema>;
