import { Request, Response, NextFunction } from 'express';
import { DocumentStatus } from '@prisma/client';
import {
  listDocuments,
  getDocument,
  generateDocument,
  saveDraft,
  restoreVersion
} from '../services/documents.service';
import { AppError } from '../middlewares/errorHandler';

/**
 * GET /api/documents
 * List documents visible to the requesting user.
 */
export const getDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { clientId, matterId, status, templateId } = req.query;

    const filters = {
      ...(clientId ? { clientId: String(clientId) } : {}),
      ...(matterId ? { matterId: String(matterId) } : {}),
      ...(status ? { status: status as DocumentStatus } : {}),
      ...(templateId ? { templateId: String(templateId) } : {})
    };

    const documents = await listDocuments(
      req.user!.organizationId,
      req.user!.userId,
      req.user!.role,
      filters
    );

    res.status(200).json({ status: 'success', data: { documents } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/documents/:id
 * Retrieve a single document with full relations, versions, and comments.
 */
export const getDocumentById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const document = await getDocument(
      req.params.id,
      req.user!.userId,
      req.user!.role,
      req.user!.organizationId
    );

    res.status(200).json({ status: 'success', data: { document } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/documents/generate
 * Generates a legal document from an active template.
 */
export const postGenerateDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const document = await generateDocument(
      req.body,
      req.user!.userId,
      req.user!.role,
      req.user!.organizationId
    );

    res.status(201).json({ status: 'success', data: { document } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/documents/:id/save-draft
 * Saves draft changes and records an immutable DocumentVersion snapshot.
 */
export const postSaveDraft = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const document = await saveDraft(
      req.params.id,
      req.body,
      req.user!.userId,
      req.user!.role,
      req.user!.organizationId
    );

    res.status(200).json({ status: 'success', data: { document } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/documents/:id/restore-version/:versionNumber
 * Restores a historical version without destroying existing history.
 */
export const postRestoreVersion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const versionNumber = parseInt(req.params.versionNumber, 10);
    if (isNaN(versionNumber) || versionNumber < 1) {
      return next(new AppError('Invalid version number. Must be a positive integer.', 400));
    }

    const document = await restoreVersion(
      req.params.id,
      versionNumber,
      req.user!.userId,
      req.user!.role,
      req.user!.organizationId
    );

    res.status(200).json({ status: 'success', data: { document } });
  } catch (err) {
    next(err);
  }
};
