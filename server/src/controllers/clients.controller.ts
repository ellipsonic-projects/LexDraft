import { Request, Response, NextFunction } from 'express';
import { listClients, createClient } from '../services/clients.service';
import { listMatters, createMatter } from '../services/clients.service';

// ─── Clients ──────────────────────────────────────────────────────────────────

/**
 * GET /api/clients
 * Returns all clients in the organization.
 */
export const getClients = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const clients = await listClients(req.user!.organizationId);
    res.status(200).json({ status: 'success', data: { clients } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/clients
 * Creates a new client. Requires BOSS role.
 */
export const postClient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const client = await createClient(req.body, req.user!.organizationId);
    res.status(201).json({ status: 'success', data: { client } });
  } catch (err) {
    next(err);
  }
};

// ─── Matters ──────────────────────────────────────────────────────────────────

/**
 * GET /api/matters
 * Returns all matters. Optional ?clientId= filter.
 */
export const getMatters = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const clientId = req.query.clientId as string | undefined;
    const matters = await listMatters(req.user!.organizationId, clientId);
    res.status(200).json({ status: 'success', data: { matters } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/matters
 * Creates a new matter. Requires BOSS role.
 */
export const postMatter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const matter = await createMatter(req.body, req.user!.organizationId);
    res.status(201).json({ status: 'success', data: { matter } });
  } catch (err) {
    next(err);
  }
};
