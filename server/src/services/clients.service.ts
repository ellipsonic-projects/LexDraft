import { AppError } from '../middlewares/errorHandler';
import {
  findAllClients,
  findClientById,
  createClient as repoCreateClient,
  findAllMatters,
  matterCodeExistsForClient,
  createMatter as repoCreateMatter
} from '../repositories/clients.repository';
import {
  CreateClientInput,
  CreateMatterInput
} from '../schemas/clients-matters-tasks.schemas';

// ─── Client Service ───────────────────────────────────────────────────────────

/**
 * Returns all clients for the organization.
 */
export const listClients = async (organizationId: string) => {
  return findAllClients(organizationId);
};

/**
 * Creates a new client in the organization.
 * No business rules beyond validation at the schema layer.
 */
export const createClient = async (
  data: CreateClientInput,
  organizationId: string
) => {
  return repoCreateClient(data, organizationId);
};

// ─── Matter Service ───────────────────────────────────────────────────────────

/**
 * Returns all matters for the organization, optionally filtered by clientId.
 * Validates that the requested clientId belongs to the organization.
 */
export const listMatters = async (
  organizationId: string,
  clientId?: string
) => {
  // If a clientId filter is supplied, verify it belongs to this org first
  if (clientId) {
    const client = await findClientById(clientId, organizationId);
    if (!client) {
      throw new AppError('Client not found.', 404);
    }
  }
  return findAllMatters(organizationId, clientId);
};

/**
 * Creates a new matter for a client.
 * Validates:
 *   - The client exists and belongs to this organization.
 *   - The matterCode is unique for this client (409 before DB constraint fires).
 */
export const createMatter = async (
  data: CreateMatterInput,
  organizationId: string
) => {
  // 1. Verify client belongs to this organization
  const client = await findClientById(data.clientId, organizationId);
  if (!client) {
    throw new AppError('Client not found.', 404);
  }

  // 2. Check matterCode uniqueness per client
  const duplicate = await matterCodeExistsForClient(data.matterCode, data.clientId);
  if (duplicate) {
    throw new AppError(
      `Matter code "${data.matterCode}" already exists for this client.`,
      409
    );
  }

  return repoCreateMatter({
    clientId: data.clientId,
    title: data.title,
    matterCode: data.matterCode
  });
};
