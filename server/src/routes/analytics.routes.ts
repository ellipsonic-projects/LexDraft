import { Router } from 'express';
import { getFirmAnalyticsHandler } from '../controllers/analytics.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';

const router = Router();

// All analytics routes require authentication and BOSS role
router.use(authenticate);
router.use(authorize('BOSS'));

/**
 * GET /api/analytics
 * Returns comprehensive operational analytics for Senior Partners.
 */
router.get('/', getFirmAnalyticsHandler);

export default router;
