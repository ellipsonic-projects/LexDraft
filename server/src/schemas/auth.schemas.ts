import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required.' })
    .email('Must be a valid email address.')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required.' })
    .min(6, 'Password must be at least 6 characters.')
});

export type LoginInput = z.infer<typeof loginSchema>;
