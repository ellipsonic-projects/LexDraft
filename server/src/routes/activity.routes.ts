import { Router } from 'express';
import { getActivityLogs } from '../controllers/activity.controller';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

// All activity routes require authentication
router.use(authenticate);

/**
 * GET /api/activity-logs
 * Returns audit trail logs with role-based scoping.
 */
router.get('/', getActivityLogs);

export default router;
