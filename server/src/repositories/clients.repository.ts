import { Client, Matter } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { CreateClientInput } from '../schemas/clients-matters-tasks.schemas';

/**
 * Returns all clients for the given organization.
 */
export const findAllClients = async (organizationId: string): Promise<Client[]> => {
  return prisma.client.findMany({
    where: { organizationId },
    orderBy: { name: 'asc' }
  });
};

/**
 * Returns a single client by ID, scoped to the organization.
 */
export const findClientById = async (
  id: string,
  organizationId: string
): Promise<Client | null> => {
  return prisma.client.findFirst({
    where: { id, organizationId }
  });
};

/**
 * Creates a new client in the organization.
 */
export const createClient = async (
  data: CreateClientInput,
  organizationId: string
): Promise<Client> => {
  return prisma.client.create({
    data: { ...data, organizationId }
  });
};

/**
 * Returns all matters for the given organization.
 * Optionally filtered by clientId.
 */
export const findAllMatters = async (
  organizationId: string,
  clientId?: string
): Promise<Matter[]> => {
  return prisma.matter.findMany({
    where: {
      client: { organizationId },
      ...(clientId ? { clientId } : {})
    },
    include: { client: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' }
  });
};

/**
 * Returns a single matter by ID, scoped to the organization via its client.
 */
export const findMatterById = async (
  id: string,
  organizationId: string
): Promise<Matter | null> => {
  return prisma.matter.findFirst({
    where: { id, client: { organizationId } }
  });
};

/**
 * Checks if a matterCode already exists for this client.
 * matterCode must be unique per client (enforced in schema too, but we
 * check here to return a clear 409 Conflict before hitting the DB constraint).
 */
export const matterCodeExistsForClient = async (
  matterCode: string,
  clientId: string
): Promise<boolean> => {
  const existing = await prisma.matter.findUnique({
    where: { matterCode_clientId: { matterCode, clientId } }
  });
  return existing !== null;
};

/**
 * Creates a new matter linked to a client.
 */
export const createMatter = async (data: {
  clientId: string;
  title: string;
  matterCode: string;
}): Promise<Matter> => {
  return prisma.matter.create({ data });
};
