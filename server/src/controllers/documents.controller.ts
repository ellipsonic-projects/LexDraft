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

/**
 * GET /api/documents/:id/pdf
 * Returns cryptographic verification and PDF download metadata for a sealed document.
 */
export const getDocumentPdf = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const pdfMetadata = await (await import('../services/documents.service')).getDocumentPdf(
      req.params.id,
      req.user!.userId,
      req.user!.role,
      req.user!.organizationId
    );

    res.status(200).json({ status: 'success', data: pdfMetadata });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/documents/:id/deliver
 * Senior Partner marks document as delivered to client and finalizes linked task.
 */
export const postDeliverDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const document = await (await import('../services/documents.service')).deliverDocument(
      req.params.id,
      req.user!.userId,
      req.user!.name,
      req.user!.role,
      req.user!.organizationId
    );

    res.status(200).json({ status: 'success', data: { document } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/documents/:id/renew
 * Renews an approved/sealed document by cloning it into a new draft.
 */
export const postRenewDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const document = await (await import('../services/documents.service')).renewDocument(
      req.params.id,
      req.body,
      req.user!.userId,
      req.user!.name,
      req.user!.role,
      req.user!.organizationId
    );

    res.status(201).json({ status: 'success', data: { document } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/documents/expiring
 * Returns documents nearing expiration (or expired) with days remaining.
 */
export const getExpiringDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const expiringDocuments = await (await import('../services/documents.service')).listExpiringDocuments(
      req.user!.userId,
      req.user!.role,
      req.user!.organizationId
    );

    res.status(200).json({ status: 'success', data: { expiringDocuments } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/documents/check-expiries
 * Automatically checks and notifies of upcoming expiries.
 */
export const postCheckExpiries = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await (await import('../services/documents.service')).checkAndNotifyExpiries(
      req.user!.organizationId
    );

    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

