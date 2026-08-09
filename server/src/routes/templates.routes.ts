import { Router } from 'express';
import {
  getTemplates,
  getTemplateById,
  postTemplate,
  patchTemplate,
  getVersionHistory
} from '../controllers/templates.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import {
  createTemplateSchema,
  updateTemplateSchema
} from '../schemas/templates.schemas';

const router = Router();

// All routes require a valid access token
router.use(authenticate);

// ─── Template Routes ──────────────────────────────────────────────────────────

/**
 * GET /api/templates
 * Both roles can list active templates.
 * BOSS may pass ?status=all or ?status=inactive.
 */
router.get('/', getTemplates);

/**
 * GET /api/templates/:id
 * Both roles can retrieve a single template's full detail.
 */
router.get('/:id', getTemplateById);

/**
 * POST /api/templates
 * BOSS only. Creates a new template.
 */
router.post('/', authorize('BOSS'), validate(createTemplateSchema), postTemplate);

/**
 * PATCH /api/templates/:id
 * BOSS only. Edits template fields. Creates immutable version snapshot.
 */
router.patch('/:id', authorize('BOSS'), validate(updateTemplateSchema), patchTemplate);

/**
 * GET /api/templates/:id/versions
 * Both roles can view full version history.
 */
router.get('/:id/versions', getVersionHistory);

export default router;
