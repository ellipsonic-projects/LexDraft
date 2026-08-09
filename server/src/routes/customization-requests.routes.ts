import { Router } from 'express';
import {
  getCustomizationRequests,
  postCustomizationRequest,
  approveCustomizationRequest,
  rejectCustomizationRequest
} from '../controllers/templates.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import {
  createCustomizationRequestSchema,
  rejectCustomizationRequestSchema
} from '../schemas/templates.schemas';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/customization-requests
 * BOSS: all org requests. EMPLOYEE: only their own.
 */
router.get('/', getCustomizationRequests);

/**
 * POST /api/customization-requests
 * EMPLOYEE only. Submit a variable addition request.
 */
router.post('/', authorize('EMPLOYEE'), validate(createCustomizationRequestSchema), postCustomizationRequest);

/**
 * PATCH /api/customization-requests/:id/approve
 * BOSS only. Atomic: approve request + merge variables + version + logs + notification.
 */
router.patch('/:id/approve', authorize('BOSS'), approveCustomizationRequest);

/**
 * PATCH /api/customization-requests/:id/reject
 * BOSS only. Atomic: reject + logs + notification.
 */
router.patch('/:id/reject', authorize('BOSS'), validate(rejectCustomizationRequestSchema), rejectCustomizationRequest);

export default router;
