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
import { prisma } from '../lib/prisma';
import { generatePdfFromHtml } from '../services/pdf.service';
import { injectSignaturesIntoHtml } from '../services/signature.service';

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
    const documentId = req.params.id;
    const { organizationId, userId, role } = req.user!;

    // 1. Fetch document and check access bounds
    const doc = await prisma.legalDocument.findFirst({
      where: { id: documentId, organizationId },
      include: {
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 }
      }
    });

    if (!doc) {
      throw new AppError('Document not found.', 404);
    }

    if (role === 'EMPLOYEE' && doc.authorId !== userId) {
      throw new AppError('Access denied. You can only view documents you authored.', 403);
    }

    // 2. Select HTML content (latest version content if available, fallback to current content)
    let htmlContent = doc.versions[0]?.content || doc.content;

    const sigReq = await prisma.signatureRequest.findFirst({
      where: { documentId: doc.id, status: 'COMPLETED' },
      include: { signers: { orderBy: { signingOrder: 'asc' } } }
    });

    if (sigReq) {
      htmlContent = injectSignaturesIntoHtml(
        htmlContent,
        sigReq.signers.map((s) => ({
          signerName: s.signerName,
          signerRole: s.signerRole,
          signatureData: s.signatureData,
          signedAt: s.signedAt,
          signingOrder: s.signingOrder
        }))
      );
    }

    // 3. Generate PDF buffer using Puppeteer shared service
    const pdfBuffer = await generatePdfFromHtml(htmlContent);

    // 4. Return as A4 PDF attachment download
    const cleanTitle = doc.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const isSealed = doc.lockedAt !== null || doc.status === DocumentStatus.approved;
    const fileName = `${cleanTitle}_v${doc.currentVersion}_${isSealed ? 'Sealed' : 'Draft'}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.status(200).send(pdfBuffer);
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

/**
 * DELETE /api/documents/:id
 * Hard deletes a document and resets any linked tasks.
 */
export const deleteDocumentController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await (await import('../services/documents.service')).deleteDocument(
      req.params.id,
      req.user!.userId,
      req.user!.role,
      req.user!.organizationId
    );

    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};
