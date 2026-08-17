import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import {
  SignatureRequestStatus,
  SignerStatus,
  SignerType,
  SignatureType,
  EntityType,
  TaskStatus,
  DocumentStatus
} from '@prisma/client';
import {
  sendSignatureRequestEmail,
  sendSignatureCompletedEmail,
  sendSignatureDeclinedEmail,
  buildPdfBufferFromVersion
} from './email.service';

const APP_BASE_URL = (process.env.APP_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');
const SIGNER_TOKEN_EXPIRY_DAYS = parseInt(process.env.SIGNER_TOKEN_EXPIRY_DAYS || '7', 10);
const SIGNATURE_REQUEST_EXPIRY_DAYS = parseInt(process.env.SIGNATURE_REQUEST_EXPIRY_DAYS || '30', 10);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateSignerInput {
  signerName: string;
  signerEmail: string;
  signerRole: string;
  signerType: 'INTERNAL_USER' | 'EXISTING_CLIENT' | 'EXTERNAL';
  signingOrder: number;
  userId?: string;   // for INTERNAL_USER
  clientId?: string; // for EXISTING_CLIENT
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateSecureToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

/**
 * Injects signature images into the sig-line divs of the agreement HTML.
 * Matches signers by role and name (case-insensitive) in the execution block.
 * Preserves ALL original formatting, margins, typography, and agreement structure.
 */
export function injectSignaturesIntoHtml(
  html: string,
  signers: Array<{
    signerName: string;
    signerRole: string;
    signatureData: string | null;
    signedAt: Date | null;
  }>
): string {
  let result = html;
  for (const signer of signers) {
    if (!signer.signatureData) continue;
    const signedAt = signer.signedAt
      ? new Date(signer.signedAt).toLocaleString('en-IN', {
          day: 'numeric', month: 'long', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: true
        })
      : '';

    // Build signature overlay block - placed ABOVE the line
    const sigBlock = `
<div style="margin-bottom: -15pt; text-align: left; position: relative; z-index: 2;">
  <img src="${signer.signatureData}" alt="Signature of ${signer.signerName}"
       style="max-height:55px; max-width:200px; display:block; margin-bottom:2pt; mix-blend-mode: multiply;"/>
  <span style="font-size:7pt; color:#555; display:block; font-family:Arial,sans-serif; margin-bottom:2pt;">
    Digitally signed by ${signer.signerName} · ${signedAt}
  </span>
</div>`;

    const nameEscaped = signer.signerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const roleEscaped = signer.signerRole.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Strategy 1: Exact role & name match
    const patternBoth = new RegExp(
      `(<div class="sig-line"><\\/div>)(\\s*(?:<p class="sig-name">.*?${nameEscaped}.*?<\\/p>)?\\s*<p class="sig-role">.*?${roleEscaped}.*?<\\/p>)`,
      'i'
    );
    // Strategy 2: Role match only
    const patternRole = new RegExp(
      `(<div class="sig-line"><\\/div>)(\\s*<p class="sig-name">.*?<\\/p>\\s*<p class="sig-role">.*?${roleEscaped}.*?<\\/p>)`,
      'i'
    );
    // Strategy 3: Name match only
    const patternName = new RegExp(
      `(<div class="sig-line"><\\/div>)(\\s*<p class="sig-name">.*?${nameEscaped}.*?<\\/p>)`,
      'i'
    );
    // Strategy 4: Witness template placeholder match (e.g. Witness 1 — Name: ___)
    const patternWitnessPlaceholder = new RegExp(
      `(<div class="sig-line"><\\/div>)(\\s*<p class="sig-role">\\s*Witness(?:\\s*\\d+)?\\s*(?:&mdash;|-)?\\s*Name:.*?<\\/p>(?:\\s*<p class="sig-role">\\s*Address:.*?<\\/p>)?)`,
      'i'
    );

    if (patternBoth.test(result)) {
      result = result.replace(patternBoth, `${sigBlock}$1$2`);
    } else if (patternRole.test(result)) {
      result = result.replace(patternRole, `${sigBlock}$1$2`);
    } else if (patternName.test(result)) {
      result = result.replace(patternName, `${sigBlock}$1$2`);
    } else if (patternWitnessPlaceholder.test(result)) {
      result = result.replace(
        patternWitnessPlaceholder,
        `${sigBlock}$1<p class="sig-name">${signer.signerName}</p><p class="sig-role">${signer.signerRole}</p>`
      );
    } else {
      // Strategy 5: Fallback to first empty sig-line
      result = result.replace('<div class="sig-line"></div>', `${sigBlock}<div class="sig-line"></div>`);
    }
  }
  return result;
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Creates a SignatureRequest for the latest DocumentVersion and initialises all signers.
 * Immediately activates the first signer and dispatches their signing email.
 */
export async function createSignatureRequest(params: {
  taskId: string;
  documentId: string;
  requestingUserId: string;
  requestingUserRole: string;
  organizationId: string;
  signers: CreateSignerInput[];
}) {
  const { taskId, documentId, requestingUserId, requestingUserRole, organizationId, signers } = params;

  // 1. RBAC: only BOSS may start a signing process
  if (requestingUserRole !== 'BOSS') {
    throw new AppError('Only Senior Partners can initiate a signing process.', 403);
  }

  if (!signers || signers.length === 0) {
    throw new AppError('At least one signer is required.', 422);
  }

  // 2. Validate task belongs to org
  const task = await prisma.workflowTask.findFirst({
    where: { id: taskId, organizationId }
  });
  if (!task) throw new AppError('Workflow task not found.', 404);

  // 3. Validate document belongs to org
  const doc = await prisma.legalDocument.findFirst({
    where: { id: documentId, organizationId },
    include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } }
  });
  if (!doc) throw new AppError('Legal document not found.', 404);

  // Auto-approve document if Boss initiates signing process
  if (doc.status !== 'approved') {
    await prisma.legalDocument.update({
      where: { id: doc.id },
      data: { status: 'approved' }
    });
  }

  // 4. Ensure we have an exact DocumentVersion snapshot
  let latestVersion = doc.versions[0];
  if (!latestVersion) {
    latestVersion = await prisma.documentVersion.create({
      data: {
        documentId: doc.id,
        versionNumber: doc.currentVersion || 1,
        content: doc.content,
        variablesState: doc.variables || {},
        changeDescription: 'Approved version snapshot for signing',
        authorId: doc.authorId
      }
    });
  }

  // 5. Prevent duplicate active signing requests
  const existingActive = await prisma.signatureRequest.findFirst({
    where: {
      documentId,
      status: { in: ['PENDING', 'IN_PROGRESS'] }
    }
  });
  if (existingActive) {
    throw new AppError('An active signing process already exists for this document.', 409);
  }

  // 6. Validate signer inputs: INTERNAL_USER must have userId, EXISTING_CLIENT must have clientId
  for (const signer of signers) {
    if (signer.signerType === 'INTERNAL_USER' && !signer.userId) {
      throw new AppError(`Signer "${signer.signerName}" of type INTERNAL_USER must have a userId.`, 422);
    }
    if (signer.signerType === 'EXISTING_CLIENT' && !signer.clientId) {
      throw new AppError(`Signer "${signer.signerName}" of type EXISTING_CLIENT must have a clientId.`, 422);
    }
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SIGNATURE_REQUEST_EXPIRY_DAYS);

  // 7. Create SignatureRequest + all DocumentSigners in a transaction
  const signatureRequest = await prisma.$transaction(async (tx) => {
    const req = await tx.signatureRequest.create({
      data: {
        taskId,
        documentId,
        documentVersionId: latestVersion.id,
        status: SignatureRequestStatus.PENDING,
        createdById: requestingUserId,
        expiresAt
      }
    });

    // Sort signers by signingOrder before inserting
    const sorted = [...signers].sort((a, b) => a.signingOrder - b.signingOrder);
    for (const signer of sorted) {
      await tx.documentSigner.create({
        data: {
          signatureRequestId: req.id,
          userId: signer.userId || null,
          clientId: signer.clientId || null,
          signerName: signer.signerName,
          signerEmail: signer.signerEmail,
          signerRole: signer.signerRole,
          signerType: signer.signerType as SignerType,
          signingOrder: signer.signingOrder,
          status: SignerStatus.PENDING
        }
      });
    }

    return req;
  });

  // 8. Log audit event
  await prisma.activityLog.create({
    data: {
      userId: requestingUserId,
      action: 'SIGNATURE_REQUESTED',
      entityType: EntityType.document,
      entityId: doc.id,
      entityName: doc.title,
      details: `Signing process started for v${latestVersion.versionNumber} with ${signers.length} signer(s).`,
      organizationId
    }
  });

  // 9. Activate the first signer (lowest signingOrder)
  await activateNextSigner(signatureRequest.id, organizationId, requestingUserId, doc.id);

  return signatureRequest;
}

/**
 * Finds the next PENDING signer, makes them ACTIVE, issues a secure token, and emails them.
 */
export async function activateNextSigner(
  signatureRequestId: string,
  organizationId: string,
  triggeredByUserId: string,
  documentId: string
): Promise<void> {
  const req = await prisma.signatureRequest.findUnique({
    where: { id: signatureRequestId },
    include: {
      signers: { orderBy: { signingOrder: 'asc' } },
      document: true,
      documentVersion: true
    }
  });
  if (!req) return;

  const nextSigner = req.signers.find((s) => s.status === SignerStatus.PENDING);
  if (!nextSigner) {
    // All signers done → complete the request
    await completeSignatureRequest(signatureRequestId, organizationId, triggeredByUserId, req.document, req.documentVersion);
    return;
  }

  const { raw, hash } = generateSecureToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SIGNER_TOKEN_EXPIRY_DAYS);

  // Atomically set signer to ACTIVE, assign token, update request status to IN_PROGRESS
  await prisma.$transaction(async (tx) => {
    await tx.documentSigner.update({
      where: { id: nextSigner.id },
      data: {
        status: SignerStatus.ACTIVE,
        tokenHash: hash,
        expiresAt
      }
    });
    await tx.signatureRequest.update({
      where: { id: signatureRequestId },
      data: { status: SignatureRequestStatus.IN_PROGRESS }
    });
  });

  const signingUrl = `${APP_BASE_URL}/api/signatures/signer/${raw}`;

  // Dispatch email to this specific signer (NOT the client contact email)
  await sendSignatureRequestEmail({
    recipientEmail: nextSigner.signerEmail,
    signerName: nextSigner.signerName,
    signerRole: nextSigner.signerRole,
    documentTitle: req.document.title,
    documentVersion: req.documentVersion.versionNumber,
    signingUrl,
    expiresAt,
    totalSigners: req.signers.length,
    currentOrder: nextSigner.signingOrder,
    documentId
  });
}

/**
 * Returns safe signing page metadata for a given raw token.
 */
export async function getSignerDetails(rawToken: string) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const signer = await prisma.documentSigner.findUnique({
    where: { tokenHash },
    include: {
      signatureRequest: {
        include: {
          document: { select: { title: true } },
          documentVersion: { select: { versionNumber: true, content: true } },
          signers: { orderBy: { signingOrder: 'asc' }, select: { signerName: true, signerRole: true, status: true, signingOrder: true } }
        }
      }
    }
  });

  if (!signer) return { valid: false, reason: 'INVALID', message: 'This signing link is invalid or no longer exists.' };
  if (new Date() > signer.expiresAt!) return { valid: false, reason: 'EXPIRED', message: 'This signing link has expired. Please contact your assigned lawyer.' };
  if (signer.status !== SignerStatus.ACTIVE) {
    if (signer.status === SignerStatus.SIGNED) return { valid: false, reason: 'ALREADY_SIGNED', message: 'You have already signed this document.' };
    if (signer.status === SignerStatus.PENDING) return { valid: false, reason: 'NOT_YOUR_TURN', message: 'It is not yet your turn to sign. You will receive an email when it is.' };
    return { valid: false, reason: 'UNAVAILABLE', message: 'This signing link is no longer available.' };
  }
  if (signer.signatureRequest.status === SignatureRequestStatus.COMPLETED || signer.signatureRequest.status === SignatureRequestStatus.CANCELLED) {
    return { valid: false, reason: 'CLOSED', message: 'This signing process has been closed.' };
  }

  return {
    valid: true,
    signerId: signer.id,
    signerName: signer.signerName,
    signerRole: signer.signerRole,
    signerEmail: signer.signerEmail,
    documentTitle: signer.signatureRequest.document.title,
    documentVersionNumber: signer.signatureRequest.documentVersion.versionNumber,
    documentContent: signer.signatureRequest.documentVersion.content,
    expiresAt: signer.expiresAt,
    totalSigners: signer.signatureRequest.signers.length,
    currentOrder: signer.signingOrder,
    signers: signer.signatureRequest.signers,
    signatureRequestId: signer.signatureRequestId
  };
}

/**
 * Processes a signature submission. Validates the token strictly server-side.
 * Uses an atomic transaction to prevent duplicate signing.
 */
export async function submitSignature(params: {
  rawToken: string;
  signatureType: 'DRAWN' | 'UPLOADED' | 'DIGITAL_CERTIFICATE';
  signatureData: string; // base64 image string
  ipAddress: string;
  userAgent: string;
  deviceInfo?: string;
}) {
  const tokenHash = crypto.createHash('sha256').update(params.rawToken).digest('hex');
  const now = new Date();

  const signer = await prisma.documentSigner.findUnique({
    where: { tokenHash },
    include: {
      signatureRequest: {
        include: {
          document: true,
          documentVersion: true,
          signers: { orderBy: { signingOrder: 'asc' } }
        }
      }
    }
  });

  if (!signer) return { success: false, code: 'INVALID', message: 'Invalid signing token.' };
  if (now > signer.expiresAt!) return { success: false, code: 'EXPIRED', message: 'This signing link has expired.' };
  if (signer.status !== SignerStatus.ACTIVE) {
    if (signer.status === SignerStatus.SIGNED) return { success: false, code: 'ALREADY_SIGNED', message: 'This document has already been signed by you.' };
    return { success: false, code: 'OUT_OF_ORDER', message: 'It is not currently your turn to sign.' };
  }
  if (signer.signatureRequest.status === SignatureRequestStatus.COMPLETED ||
      signer.signatureRequest.status === SignatureRequestStatus.CANCELLED) {
    return { success: false, code: 'CLOSED', message: 'This signing process is closed.' };
  }

  // Validate signatureData: must be a non-empty base64 string for DRAWN/UPLOADED
  if (params.signatureType !== 'DIGITAL_CERTIFICATE') {
    if (!params.signatureData || !params.signatureData.startsWith('data:image/')) {
      return { success: false, code: 'INVALID_SIGNATURE', message: 'Invalid signature image data.' };
    }
  }

  // Atomic update: only proceed if signer is still ACTIVE (prevents race conditions)
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.documentSigner.updateMany({
      where: { id: signer.id, status: SignerStatus.ACTIVE },
      data: {
        status: SignerStatus.SIGNED,
        signatureType: params.signatureType as SignatureType,
        signatureData: params.signatureData,
        signedAt: now,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        deviceInfo: params.deviceInfo || null,
        tokenHash: null // invalidate the token immediately after use
      }
    });
    return result.count > 0;
  });

  if (!updated) {
    return { success: false, code: 'ALREADY_SIGNED', message: 'This document has already been signed.' };
  }

  // Log audit
  const docId = signer.signatureRequest.documentId;
  const docTitle = signer.signatureRequest.document.title;
  await prisma.activityLog.create({
    data: {
      userId: signer.userId || signer.signatureRequest.document.authorId,
      action: 'SIGNATURE_SIGNED',
      entityType: EntityType.document,
      entityId: docId,
      entityName: docTitle,
      details: `${signer.signerName} (${signer.signerRole}) signed document v${signer.signatureRequest.documentVersion.versionNumber} using ${params.signatureType}. IP: ${params.ipAddress}.`,
      organizationId: signer.signatureRequest.document.organizationId
    }
  });

  // Activate the next signer
  await activateNextSigner(
    signer.signatureRequestId,
    signer.signatureRequest.document.organizationId,
    signer.userId || signer.signatureRequest.document.authorId,
    docId
  );

  return { success: true, message: 'Your signature has been recorded successfully.' };
}

/**
 * Records a decline and marks the SignatureRequest as CANCELLED.
 */
export async function declineSignature(params: {
  rawToken: string;
  declineReason?: string;
  ipAddress: string;
  userAgent: string;
}) {
  const tokenHash = crypto.createHash('sha256').update(params.rawToken).digest('hex');
  const now = new Date();

  const signer = await prisma.documentSigner.findUnique({
    where: { tokenHash },
    include: {
      signatureRequest: {
        include: { document: true, documentVersion: true }
      }
    }
  });

  if (!signer) return { success: false, code: 'INVALID', message: 'Invalid token.' };
  if (signer.status !== SignerStatus.ACTIVE) return { success: false, code: 'UNAVAILABLE', message: 'This action is not available.' };

  await prisma.$transaction(async (tx) => {
    await tx.documentSigner.update({
      where: { id: signer.id },
      data: {
        status: SignerStatus.DECLINED,
        declinedAt: now,
        declineReason: params.declineReason || null,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        tokenHash: null
      }
    });
    await tx.signatureRequest.update({
      where: { id: signer.signatureRequestId },
      data: { status: SignatureRequestStatus.CANCELLED }
    });
  });

  const doc = signer.signatureRequest.document;
  await prisma.activityLog.create({
    data: {
      userId: signer.userId || doc.authorId,
      action: 'SIGNATURE_DECLINED',
      entityType: EntityType.document,
      entityId: doc.id,
      entityName: doc.title,
      details: `${signer.signerName} (${signer.signerRole}) declined to sign. Reason: ${params.declineReason || 'Not specified'}.`,
      organizationId: doc.organizationId
    }
  });

  // Notify internal lawyers of the decline
  await sendSignatureDeclinedEmail({
    documentTitle: doc.title,
    signerName: signer.signerName,
    signerRole: signer.signerRole,
    declineReason: params.declineReason,
    documentId: doc.id
  }).catch((e) => console.error('Failed to send signature declined email:', e));

  return { success: true, message: 'Your decision has been recorded.' };
}

/**
 * Called when all signers have signed. Builds the final signed PDF and notifies all parties.
 */
export async function completeSignatureRequest(
  signatureRequestId: string,
  organizationId: string,
  triggeredByUserId: string,
  doc: any,
  docVersion: any
) {
  const req = await prisma.signatureRequest.findUnique({
    where: { id: signatureRequestId },
    include: { signers: { orderBy: { signingOrder: 'asc' } } }
  });
  if (!req) return;

  // Build final signed PDF using the exact DocumentVersion content
  let finalHtml = docVersion.content;
  finalHtml = injectSignaturesIntoHtml(
    finalHtml,
    req.signers.map((s) => ({
      signerName: s.signerName,
      signerRole: s.signerRole,
      signatureData: s.signatureData,
      signedAt: s.signedAt
    }))
  );

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await buildPdfBufferFromVersion(finalHtml, doc.title);
  } catch (e: any) {
    console.error('Failed to build signed PDF:', e);
    throw new AppError(`Failed to generate final signed PDF: ${e.message}`, 500);
  }

  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new AppError('Final signed PDF generation produced an empty buffer.', 500);
  }

  // Atomically transition SignatureRequest, WorkflowTask, and LegalDocument to completed state
  await prisma.$transaction(async (tx) => {
    await tx.signatureRequest.update({
      where: { id: signatureRequestId },
      data: { status: SignatureRequestStatus.COMPLETED }
    });

    if (req.taskId) {
      await tx.workflowTask.updateMany({
        where: { id: req.taskId },
        data: { status: TaskStatus.completed }
      });
    }

    await tx.legalDocument.update({
      where: { id: doc.id },
      data: {
        status: DocumentStatus.approved,
        pdfExportUrl: `/api/documents/${doc.id}/pdf`
      }
    });

    await tx.activityLog.create({
      data: {
        userId: triggeredByUserId,
        action: 'SIGNATURE_COMPLETED',
        entityType: EntityType.document,
        entityId: doc.id,
        entityName: doc.title,
        details: `All ${req.signers.length} signer(s) completed. Document v${docVersion.versionNumber} fully signed.`,
        organizationId
      }
    });
  });

  // Send final signed PDF to all parties
  const recipientEmails = Array.from(new Set(req.signers.map((s) => s.signerEmail)));
  if (pdfBuffer.length > 0) {
    await sendSignatureCompletedEmail({
      recipientEmails,
      documentTitle: doc.title,
      documentVersion: docVersion.versionNumber,
      signers: req.signers.map((s) => ({ name: s.signerName, role: s.signerRole })),
      pdfBuffer,
      documentId: doc.id
    }).catch((e) => console.error('Failed to send signature completed email:', e));
  }
}

/**
 * Returns the full SignatureRequest for a given document (for Kanban display).
 */
export async function getSignatureRequestForDocument(documentId: string) {
  return prisma.signatureRequest.findFirst({
    where: { documentId, status: { in: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] } },
    include: { signers: { orderBy: { signingOrder: 'asc' } } },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Returns all signature requests for a given task (for Kanban display).
 */
export async function getSignatureRequestsForTask(taskId: string) {
  return prisma.signatureRequest.findMany({
    where: { taskId },
    include: { signers: { orderBy: { signingOrder: 'asc' } } },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Returns sanitized read-only signature status for a document with tenant isolation.
 */
export async function getSignatureStatusForDocument(documentId: string, organizationId: string) {
  const doc = await prisma.legalDocument.findFirst({
    where: { id: documentId, organizationId }
  });
  if (!doc) {
    throw new AppError('Document not found or access denied.', 404);
  }

  const req = await prisma.signatureRequest.findFirst({
    where: { documentId },
    include: { signers: { orderBy: { signingOrder: 'asc' } } },
    orderBy: { createdAt: 'desc' }
  });

  if (!req) {
    return {
      hasRequest: false,
      requestStatus: null,
      totalSigners: 0,
      signedCount: 0,
      pendingCount: 0,
      activeSigner: null,
      signers: []
    };
  }

  const totalSigners = req.signers.length;
  const signedCount = req.signers.filter((s) => s.status === 'SIGNED').length;
  const pendingCount = req.signers.filter((s) => s.status === 'PENDING' || s.status === 'ACTIVE').length;
  const activeSigner = req.signers.find((s) => s.status === 'ACTIVE') || null;

  return {
    hasRequest: true,
    signatureRequestId: req.id,
    requestStatus: req.status,
    totalSigners,
    signedCount,
    pendingCount,
    activeSigner: activeSigner ? { name: activeSigner.signerName, email: activeSigner.signerEmail, role: activeSigner.signerRole } : null,
    signers: req.signers.map((s) => ({
      id: s.id,
      signerName: s.signerName,
      signerEmail: s.signerEmail,
      signerRole: s.signerRole,
      signerType: s.signerType,
      signingOrder: s.signingOrder,
      status: s.status,
      signedAt: s.signedAt,
      declinedAt: s.declinedAt,
      declineReason: s.declineReason,
      expiresAt: s.expiresAt
    }))
  };
}

/**
 * Returns sanitized read-only signature status for a task with tenant isolation.
 */
export async function getSignatureStatusForTask(taskId: string, organizationId: string) {
  const task = await prisma.workflowTask.findFirst({
    where: { id: taskId, organizationId }
  });
  if (!task) {
    throw new AppError('Task not found or access denied.', 404);
  }

  const req = await prisma.signatureRequest.findFirst({
    where: {
      OR: [
        { taskId },
        ...(task.documentId ? [{ documentId: task.documentId }] : [])
      ]
    },
    include: { signers: { orderBy: { signingOrder: 'asc' } } },
    orderBy: { createdAt: 'desc' }
  });

  if (!req) {
    return {
      hasRequest: false,
      requestStatus: null,
      totalSigners: 0,
      signedCount: 0,
      pendingCount: 0,
      activeSigner: null,
      signers: []
    };
  }

  const totalSigners = req.signers.length;
  const signedCount = req.signers.filter((s) => s.status === 'SIGNED').length;
  const pendingCount = req.signers.filter((s) => s.status === 'PENDING' || s.status === 'ACTIVE').length;
  const activeSigner = req.signers.find((s) => s.status === 'ACTIVE') || null;

  return {
    hasRequest: true,
    signatureRequestId: req.id,
    requestStatus: req.status,
    totalSigners,
    signedCount,
    pendingCount,
    activeSigner: activeSigner ? { name: activeSigner.signerName, email: activeSigner.signerEmail, role: activeSigner.signerRole } : null,
    signers: req.signers.map((s) => ({
      id: s.id,
      signerName: s.signerName,
      signerEmail: s.signerEmail,
      signerRole: s.signerRole,
      signerType: s.signerType,
      signingOrder: s.signingOrder,
      status: s.status,
      signedAt: s.signedAt,
      declinedAt: s.declinedAt,
      declineReason: s.declineReason,
      expiresAt: s.expiresAt
    }))
  };
}
