import { Request, Response, NextFunction } from 'express';
import {
  listTemplates,
  getTemplate,
  getTemplateVersions,
  createTemplate,
  editTemplate,
  listCustomizationRequests,
  submitCustomizationRequest,
  approveRequest,
  rejectRequest,
  removeTemplate
} from '../services/templates.service';

// ─── Templates ────────────────────────────────────────────────────────────────

/**
 * GET /api/templates
 * Returns all templates. EMPLOYEE always gets active only.
 * BOSS may pass ?status=all or ?status=inactive.
 */
export const getTemplates = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawStatus = req.query.status as string | undefined;
    // EMPLOYEE can only see active templates
    const status =
      req.user!.role === 'BOSS' && (rawStatus === 'all' || rawStatus === 'inactive')
        ? (rawStatus as 'all' | 'inactive')
        : 'active';

    const templates = await listTemplates(req.user!.organizationId, status);
    res.status(200).json({ status: 'success', data: { templates } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/templates/:id
 * Returns a single template with variables, version history, and pending customizations.
 */
export const getTemplateById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const template = await getTemplate(req.params.id, req.user!.organizationId);
    res.status(200).json({ status: 'success', data: { template } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/templates
 * BOSS only. Creates a new template.
 */
export const postTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const template = await createTemplate(
      req.body,
      req.user!.userId,
      req.user!.organizationId
    );
    res.status(201).json({ status: 'success', data: { template } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/templates/:id
 * BOSS only. Edits template metadata/content/variables.
 * Creates an immutable TemplateVersion snapshot. Never deletes history.
 */
export const patchTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const template = await editTemplate(
      req.params.id,
      req.body,
      req.user!.userId,
      req.user!.organizationId
    );
    res.status(200).json({ status: 'success', data: { template } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/templates/:id/versions
 * Returns the full version history for a template.
 */
export const getVersionHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const versions = await getTemplateVersions(req.params.id, req.user!.organizationId);
    res.status(200).json({ status: 'success', data: { versions } });
  } catch (err) {
    next(err);
  }
};

// ─── Customization Requests ───────────────────────────────────────────────────

/**
 * GET /api/customization-requests
 * BOSS sees all org requests. EMPLOYEE sees only their own.
 */
export const getCustomizationRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const all = await listCustomizationRequests(req.user!.organizationId);
    // Scope: EMPLOYEE only sees their own
    const requests =
      req.user!.role === 'BOSS'
        ? all
        : all.filter((r) => r.requestedBy.id === req.user!.userId);

    res.status(200).json({ status: 'success', data: { requests } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/customization-requests
 * EMPLOYEE only. Submits a variable addition request.
 */
export const postCustomizationRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const request = await submitCustomizationRequest(
      req.body,
      req.user!.userId,
      req.user!.organizationId
    );
    res.status(201).json({ status: 'success', data: { request } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/customization-requests/:id/approve
 * BOSS only. Approves and merges custom variables into the template.
 */
export const approveCustomizationRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const template = await approveRequest(
      req.params.id,
      req.user!.userId,
      req.user!.name,
      req.user!.organizationId
    );
    res.status(200).json({ status: 'success', data: { template } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/customization-requests/:id/reject
 * BOSS only. Rejects the request and notifies the requester.
 */
export const rejectCustomizationRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const request = await rejectRequest(
      req.params.id,
      req.user!.userId,
      req.user!.name,
      req.user!.organizationId,
      req.body
    );
    res.status(200).json({ status: 'success', data: { request } });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/templates/:id
 * BOSS only. Deletes a template (or marks as inactive if historically used).
 */
export const deleteTemplateById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await removeTemplate(
      req.params.id,
      req.user!.userId,
      req.user!.organizationId
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};
