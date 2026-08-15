import { Router } from 'express';
import { getClients, postClient } from '../controllers/clients.controller';
import { getMatters, postMatter } from '../controllers/clients.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import {
  createClientSchema,
  createMatterSchema
} from '../schemas/clients-matters-tasks.schemas';

const router = Router();

// ─── Clients ──────────────────────────────────────────────────────────────────

/**
 * GET /api/clients
 * Both roles can list clients.
 */
router.get('/clients', authenticate, getClients);

/**
 * POST /api/clients
 * Only BOSS (Senior Partner) can create clients.
 */
router.post('/clients', authenticate, authorize('BOSS'), validate(createClientSchema), postClient);

// ─── Matters ──────────────────────────────────────────────────────────────────

/**
 * GET /api/matters
 * Both roles can list matters. Optional ?clientId= query filter.
 */
router.get('/matters', authenticate, getMatters);

/**
 * POST /api/matters
 * Only BOSS can create matters.
 */
router.post('/matters', authenticate, authorize('BOSS'), validate(createMatterSchema), postMatter);

export default router;
