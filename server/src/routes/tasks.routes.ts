import { Router } from 'express';
import { getTasks, getTaskById, postTask, patchTaskStatus } from '../controllers/tasks.controller';
import { postSendToClient } from '../controllers/client-approval.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import {
  createTaskSchema,
  updateTaskStatusSchema
} from '../schemas/clients-matters-tasks.schemas';

const router = Router();

// All routes require a valid access token
router.use(authenticate);

/**
 * GET /api/tasks
 * Partners see all. Associates see only their assigned tasks.
 * Role-based scoping is enforced in the service layer.
 */
router.get('/', getTasks);

/**
 * GET /api/tasks/:id
 * Retrieve a single task. IDOR protected:
 * - EMPLOYEE: can only view their own assigned task (403 otherwise).
 * - Cross-org task IDs return 404 (tenant isolation).
 */
router.get('/:id', getTaskById);

/**
 * POST /api/tasks
 * Only BOSS can create and assign tasks.
 */
router.post('/', authorize('BOSS'), validate(createTaskSchema), postTask);

/**
 * PATCH /api/tasks/:id/status
 * Both roles can call this, but EMPLOYEE is restricted in the service layer:
 *   - Can only update their own tasks.
 *   - Cannot directly set 'approved' or 'completed'.
 */
router.patch('/:id/status', validate(updateTaskStatusSchema), patchTaskStatus);

/**
 * POST /api/tasks/:taskId/send-to-client
 * Dispatches the legal agreement to the client with attached PDF and single-use review links.
 */
router.post('/:taskId/send-to-client', postSendToClient);

export default router;

