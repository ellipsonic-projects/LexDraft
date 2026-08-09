import { PrismaClient } from '@prisma/client';

/**
 * Singleton PrismaClient instance shared across the entire application.
 *
 * Prisma recommends a single PrismaClient per process. Multiple instances
 * create separate connection pools, which can exhaust the database's
 * connection limit as the number of repositories grows.
 *
 * All repositories must import from this module instead of
 * calling `new PrismaClient()` directly.
 */
export const prisma = new PrismaClient();
