import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { TaskStatus, DocumentStatus, ClientApprovalStatus, EntityType } from '@prisma/client';
import {
  buildPdfBufferFromVersion,
  sendAgreementForReviewEmail,
  sendClientApprovalNotification,
  sendClientRejectionNotification
} from './email.service';

const APP_BASE_URL = (process.env.APP_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');
const TOKEN_EXPIRY_DAYS = parseInt(process.env.CLIENT_APPROVAL_TOKEN_EXPIRY_DAYS || '7', 10);

/**
 * Initiates agreement review delivery to the client.
 * Enforces authorization, captures exact immutable DocumentVersion snapshot,
 * generates a 256-bit crypto-random token, creates ClientAgreementApproval,
 * sets task status to 'under_review', generates PDF from version, and emails client.
 */
export async function sendAgreementToClient(params: {
  taskId: string;
  documentId?: string;
  requestingUserId: string;
  requestingUserRole: string;
  organizationId: string;
}) {
  const { taskId, requestingUserId, requestingUserRole, organizationId } = params;

  // 1. Validate Task
  const task = await prisma.workflowTask.findFirst({
    where: { id: taskId, organizationId },
    include: {
      client: true,
      assignee: true,
      assignedBy: true,
      template: true
    }
  });

  if (!task) {
    throw new AppError('Workflow task not found.', 404);
  }

  // IDOR check for associates
  if (requestingUserRole === 'EMPLOYEE' && task.assigneeId !== requestingUserId) {
    throw new AppError('Access denied. You can only send agreements for tasks assigned to you.', 403);
  }

  // 2. Validate Document
  const docId = params.documentId || task.documentId;
  if (!docId) {
    throw new AppError('No legal document is associated with this task. Generate the agreement first.', 422);
  }

  const doc = await prisma.legalDocument.findFirst({
    where: { id: docId, organizationId },
    include: {
      versions: { orderBy: { versionNumber: 'desc' }, take: 1 }
    }
  });

  if (!doc) {
    throw new AppError('Legal document not found.', 404);
  }

  // 3. Ensure exact DocumentVersion snapshot exists
  let latestVersion = doc.versions[0];
  if (!latestVersion) {
    // Create initial version snapshot if not already created
    latestVersion = await prisma.documentVersion.create({
      data: {
        documentId: doc.id,
        versionNumber: doc.currentVersion || 1,
        content: doc.content,
        variablesState: doc.variables || {},
        changeDescription: 'Initial draft ready for client review',
        authorId: doc.authorId
      }
    });
  }

  // 4. Invalidate any existing PENDING approval tokens for earlier reviews of this task
  await prisma.clientAgreementApproval.updateMany({
    where: {
      taskId: task.id,
      status: ClientApprovalStatus.PENDING
    },
    data: {
      status: ClientApprovalStatus.EXPIRED
    }
  });

  // 5. Generate secure 256-bit crypto-random token & hash
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS);

  // 6. Create ClientAgreementApproval record
  const approval = await prisma.clientAgreementApproval.create({
    data: {
      taskId: task.id,
      clientId: task.clientId,
      documentId: doc.id,
      documentVersionId: latestVersion.id,
      documentVersion: latestVersion.versionNumber,
      recipientEmail: task.client.contactEmail,
      status: ClientApprovalStatus.PENDING,
      tokenHash,
      expiresAt
    }
  });

  // 7. Update Task Status & Document Status to 'under_review'
  await prisma.workflowTask.update({
    where: { id: task.id },
    data: {
      status: TaskStatus.under_review,
      documentId: doc.id
    }
  });

  if (doc.status !== DocumentStatus.approved) {
    await prisma.legalDocument.update({
      where: { id: doc.id },
      data: { status: DocumentStatus.under_review }
    });
  }

  // 8. Generate PDF Buffer from exact DocumentVersion
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await buildPdfBufferFromVersion(
      latestVersion.content,
      doc.title
    );
  } catch (pdfErr) {
    console.error('PDF Generation failed, fallback to plain text PDF buffer:', pdfErr);
    pdfBuffer = await buildPdfBufferFromVersion(doc.content, doc.title);
  }

  // 9. Build Scanner-Safe Review URLs
  const reviewBaseUrl = `${APP_BASE_URL}/api/client-actions/review/${rawToken}`;
  const approveUrl = `${reviewBaseUrl}?action=approve`;
  const rejectUrl = `${reviewBaseUrl}?action=reject`;

  // 10. Dispatch Transactional Email via Resend
  const emailResult = await sendAgreementForReviewEmail({
    recipientEmail: task.client.contactEmail,
    clientName: task.client.name,
    matterTitle: doc.title,
    lawyerName: task.assignee.name,
    versionNumber: latestVersion.versionNumber,
    pdfBuffer,
    approveUrl,
    rejectUrl,
    taskId: task.id,
    documentId: doc.id
  });

  // 11. Create Audit Log
  await prisma.activityLog.create({
    data: {
      userId: requestingUserId,
      action: 'AGREEMENT_SENT_FOR_REVIEW',
      entityType: EntityType.document,
      entityId: doc.id,
      entityName: doc.title,
      details: `Dispatched agreement v${latestVersion.versionNumber} to client ${task.client.name} (${task.client.contactEmail}) for review.`,
      organizationId
    }
  });

  return {
    success: true,
    approvalId: approval.id,
    versionNumber: latestVersion.versionNumber,
    recipientEmail: task.client.contactEmail,
    emailSent: emailResult.success,
    emailError: emailResult.error
  };
}

/**
 * Validates a client review token and returns safe summary metadata for the minimal confirmation view.
 */
export async function getApprovalReviewDetails(rawToken: string) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const approval = await prisma.clientAgreementApproval.findUnique({
    where: { tokenHash },
    include: {
      client: { select: { name: true } },
      document: { select: { title: true } },
      task: {
        include: {
          assignee: { select: { name: true, title: true } }
        }
      }
    }
  });

  if (!approval) {
    return { valid: false, reason: 'INVALID', message: 'This review link is invalid or no longer available.' };
  }

  const now = new Date();
  if (now > approval.expiresAt) {
    return { valid: false, reason: 'EXPIRED', message: 'This review link has expired. Please contact your assigned lawyer for assistance.' };
  }

  if (approval.status !== ClientApprovalStatus.PENDING) {
    return {
      valid: false,
      reason: 'ALREADY_RECORDED',
      decision: approval.status,
      message: 'Your decision has already been recorded.'
    };
  }

  return {
    valid: true,
    clientName: approval.client.name,
    matterTitle: approval.document.title,
    lawyerName: approval.task.assignee.name,
    versionNumber: approval.documentVersion,
    expiresAt: approval.expiresAt
  };
}

/**
 * Processes a client Approve or Reject action with strict database atomicity,
 * updating status, writing audit logs, and dispatching internal notifications.
 */
export async function processClientAction(params: {
  rawToken: string;
  action: 'approve' | 'reject';
  rejectionReason?: string;
}) {
  const tokenHash = crypto.createHash('sha256').update(params.rawToken).digest('hex');
  const now = new Date();

  // Find record
  const approval = await prisma.clientAgreementApproval.findUnique({
    where: { tokenHash },
    include: {
      client: true,
      document: true,
      task: {
        include: {
          assignee: true,
          assignedBy: true
        }
      }
    }
  });

  if (!approval) {
    return { success: false, code: 'INVALID', message: 'This review link is invalid or no longer available.' };
  }

  if (now > approval.expiresAt) {
    return { success: false, code: 'EXPIRED', message: 'This review link has expired. Please contact your assigned lawyer for assistance.' };
  }

  if (approval.status !== ClientApprovalStatus.PENDING) {
    return { success: false, code: 'ALREADY_RECORDED', message: 'Your decision has already been recorded.' };
  }

  const newStatus = params.action === 'approve'
    ? ClientApprovalStatus.ACCEPTED
    : ClientApprovalStatus.REJECTED;

  // Atomic database update using conditional WHERE status = PENDING
  const updateResult = await prisma.$transaction(async (tx) => {
    const updatedApproval = await tx.clientAgreementApproval.updateMany({
      where: {
        id: approval.id,
        status: ClientApprovalStatus.PENDING
      },
      data: {
        status: newStatus,
        usedAt: now,
        approvedAt: params.action === 'approve' ? now : null,
        rejectedAt: params.action === 'reject' ? now : null,
        rejectionReason: params.rejectionReason || null
      }
    });

    if (updatedApproval.count === 0) {
      throw new Error('ALREADY_USED');
    }

    // Record audit log
    await tx.activityLog.create({
      data: {
        userId: approval.task.assigneeId,
        action: params.action === 'approve' ? 'CLIENT_APPROVED' : 'CLIENT_REJECTED',
        entityType: EntityType.document,
        entityId: approval.documentId,
        entityName: approval.document.title,
        details: params.action === 'approve'
          ? `Client ${approval.client.name} approved agreement v${approval.documentVersion}.`
          : `Client ${approval.client.name} rejected agreement v${approval.documentVersion}.${params.rejectionReason ? ` Reason: ${params.rejectionReason}` : ''}`,
        organizationId: approval.task.organizationId
      }
    });

    // Create in-app notification for the assigned lawyer and senior partner
    await tx.notification.create({
      data: {
        userId: approval.task.assigneeId,
        title: params.action === 'approve' ? 'Agreement Approved by Client' : 'Agreement Rejected by Client',
        message: `${approval.client.name} has ${params.action === 'approve' ? 'approved' : 'rejected'} ${approval.document.title} (v${approval.documentVersion}).`,
        type: params.action === 'approve' ? 'approval' : 'rejection',
        linkId: approval.documentId
      }
    });

    if (approval.task.assignedById !== approval.task.assigneeId) {
      await tx.notification.create({
        data: {
          userId: approval.task.assignedById,
          title: params.action === 'approve' ? 'Agreement Approved by Client' : 'Agreement Rejected by Client',
          message: `${approval.client.name} has ${params.action === 'approve' ? 'approved' : 'rejected'} ${approval.document.title} (v${approval.documentVersion}).`,
          type: params.action === 'approve' ? 'approval' : 'rejection',
          linkId: approval.documentId
        }
      });
    }

    return true;
  }).catch((err) => {
    if (err.message === 'ALREADY_USED') {
      return false;
    }
    throw err;
  });

  if (!updateResult) {
    return { success: false, code: 'ALREADY_RECORDED', message: 'Your decision has already been recorded.' };
  }

  // Dispatch internal notifications (asynchronous, non-blocking)
  const internalEmails = Array.from(new Set([
    approval.task.assignee.email,
    approval.task.assignedBy.email
  ])).filter(Boolean);

  const formattedTimestamp = now.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  if (params.action === 'approve') {
    sendClientApprovalNotification({
      recipientEmails: internalEmails,
      clientName: approval.client.name,
      matterTitle: approval.document.title,
      lawyerName: approval.task.assignee.name,
      versionNumber: approval.documentVersion,
      approvedAt: formattedTimestamp,
      taskId: approval.taskId,
      documentId: approval.documentId
    }).catch(e => console.error('Error dispatching client approval notification email:', e));
  } else {
    sendClientRejectionNotification({
      recipientEmails: internalEmails,
      clientName: approval.client.name,
      matterTitle: approval.document.title,
      lawyerName: approval.task.assignee.name,
      versionNumber: approval.documentVersion,
      rejectedAt: formattedTimestamp,
      rejectionReason: params.rejectionReason,
      taskId: approval.taskId,
      documentId: approval.documentId
    }).catch(e => console.error('Error dispatching client rejection notification email:', e));
  }

  return {
    success: true,
    decision: newStatus,
    message: 'Your decision has been recorded successfully.'
  };
}
