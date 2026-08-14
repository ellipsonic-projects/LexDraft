import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { prisma } from '../lib/prisma';
import { EmailDeliveryStatus } from '@prisma/client';

// ─── SMTP / Nodemailer Configuration ──────────────────────────────────────────
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true'; // true for port 465, false for 587
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || '';
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || 'LexDraft Legal Workflow';

// Initialize SMTP Transporter
const smtpTransporter = SMTP_HOST && SMTP_USER && SMTP_PASS
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    })
  : null;

// ─── Resend Configuration ───────────────────────────────────────────────────
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const RESEND_FROM_NAME = process.env.RESEND_FROM_NAME || 'LexDraft Legal Workflow';

/**
 * RESEND_TEST_OVERRIDE_EMAIL:
 * When set, ALL outgoing emails are redirected to this address regardless of the
 * actual recipient. Required when using Resend's free sandbox plan, which only
 * allows sending to the account owner's verified email.
 *
 * Set this to your verified email in .env (local) and as an env var in Render (production).
 * Remove or leave blank once you've verified a custom domain in Resend.
 *
 * Example: RESEND_TEST_OVERRIDE_EMAIL=manishgowdat23@gmail.com
 */
const RESEND_TEST_OVERRIDE_EMAIL = process.env.RESEND_TEST_OVERRIDE_EMAIL || '';

// Initialize Resend Client
const resendClient = RESEND_API_KEY && RESEND_API_KEY !== 're_123456789_placeholder'
  ? new Resend(RESEND_API_KEY)
  : null;

import { generatePdfFromHtml } from './pdf.service';

/**
 * Builds a professionally formatted A4 legal agreement PDF Buffer directly from the persisted DocumentVersion content.
 * Reuses the shared Puppeteer PDF export pipeline.
 */
export async function buildPdfBufferFromVersion(
  versionContent: string,
  _title: string
): Promise<Buffer> {
  return generatePdfFromHtml(versionContent);
}

/**
 * Logs transactional email dispatch result in database.
 */
async function logEmailDispatch(params: {
  recipientEmail: string;
  emailType: string;
  status: EmailDeliveryStatus;
  resendId?: string;
  errorMessage?: string;
  taskId?: string;
  documentId?: string;
}) {
  try {
    await prisma.emailLog.create({
      data: {
        recipientEmail: params.recipientEmail,
        emailType: params.emailType,
        status: params.status,
        resendId: params.resendId,
        errorMessage: params.errorMessage,
        taskId: params.taskId,
        documentId: params.documentId
      }
    });
  } catch (err) {
    console.error('Failed to record EmailLog entry:', err);
  }
}

/**
 * Generic email dispatcher with fail-safe resilience.
 */
async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: Buffer }[];
  emailType: string;
  taskId?: string;
  documentId?: string;
}): Promise<{ success: boolean; resendId?: string; error?: string }> {
  const recipientStr = Array.isArray(params.to) ? params.to.join(', ') : params.to;

  // 1. Check if SMTP is configured
  if (smtpTransporter) {
    try {
      const mailOptions = {
        from: `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
        attachments: params.attachments?.map(att => ({
          filename: att.filename,
          content: att.content
        }))
      };

      const info = await smtpTransporter.sendMail(mailOptions);
      console.log(`[SMTP Email Sent] Message ID: ${info.messageId} to ${recipientStr}`);

      await logEmailDispatch({
        recipientEmail: recipientStr,
        emailType: params.emailType,
        status: EmailDeliveryStatus.SENT,
        resendId: info.messageId,
        taskId: params.taskId,
        documentId: params.documentId
      });

      return { success: true, resendId: info.messageId };
    } catch (err: any) {
      console.error(`SMTP Exception during email dispatch to ${recipientStr}:`, err);
      await logEmailDispatch({
        recipientEmail: recipientStr,
        emailType: params.emailType,
        status: EmailDeliveryStatus.FAILED,
        errorMessage: err.message || 'SMTP delivery network error',
        taskId: params.taskId,
        documentId: params.documentId
      });
      return { success: false, error: err.message };
    }
  }

  // 2. Otherwise try Resend
  if (!resendClient) {
    const errorMsg = 'No SMTP configuration nor Resend client configured.';
    console.warn(`[Email Service Simulation] Dispatched to ${recipientStr}: ${params.subject}`);
    await logEmailDispatch({
      recipientEmail: recipientStr,
      emailType: params.emailType,
      status: EmailDeliveryStatus.FAILED,
      errorMessage: errorMsg,
      taskId: params.taskId,
      documentId: params.documentId
    });
    return { success: false, error: errorMsg };
  }

  try {
    // Apply sandbox override: redirect to verified email if explicitly set in env
    const actualRecipient = RESEND_TEST_OVERRIDE_EMAIL
      ? RESEND_TEST_OVERRIDE_EMAIL
      : params.to;

    // When overriding, prefix the subject so you can see who the email was "really" for
    const actualSubject = RESEND_TEST_OVERRIDE_EMAIL && actualRecipient !== params.to
      ? `[→ ${recipientStr}] ${params.subject}`
      : params.subject;

    if (RESEND_TEST_OVERRIDE_EMAIL) {
      console.log(`[Email Override] Redirecting ${params.emailType} from "${recipientStr}" → "${RESEND_TEST_OVERRIDE_EMAIL}"`);
    }

    const payload: any = {
      from: `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL}>`,
      to: actualRecipient,
      subject: actualSubject,
      html: params.html,
      text: params.text
    };

    if (params.attachments && params.attachments.length > 0) {
      payload.attachments = params.attachments.map(att => ({
        filename: att.filename,
        content: att.content
      }));
    }

    const { data, error } = await resendClient.emails.send(payload);

    if (error) {
      console.error(`Resend API Error for ${recipientStr}:`, error);
      await logEmailDispatch({
        recipientEmail: recipientStr,
        emailType: params.emailType,
        status: EmailDeliveryStatus.FAILED,
        errorMessage: error.message || 'Resend delivery failure',
        taskId: params.taskId,
        documentId: params.documentId
      });
      return { success: false, error: error.message };
    }

    await logEmailDispatch({
      recipientEmail: recipientStr,
      emailType: params.emailType,
      status: EmailDeliveryStatus.SENT,
      resendId: data?.id,
      taskId: params.taskId,
      documentId: params.documentId
    });

    return { success: true, resendId: data?.id };
  } catch (err: any) {
    console.error(`Exception during email dispatch to ${recipientStr}:`, err);
    await logEmailDispatch({
      recipientEmail: recipientStr,
      emailType: params.emailType,
      status: EmailDeliveryStatus.FAILED,
      errorMessage: err.message || 'Unknown network error',
      taskId: params.taskId,
      documentId: params.documentId
    });
    return { success: false, error: err.message };
  }
}

// ─── 1. Task Assigned Email ───────────────────────────────────────────────────

export async function sendTaskAssignedEmail(params: {
  recipientEmail: string;
  clientName: string;
  matterTitle: string;
  lawyerName: string;
  priority: string;
  dueDate: string;
  assignedDate: string;
  taskId: string;
}) {
  const subject = 'LexDraft — Legal Matter Assigned';

  const text = `Dear ${params.clientName},

Your legal matter has been assigned through LexDraft.

Matter:
${params.matterTitle}

Assigned Lawyer:
${params.lawyerName}

Priority:
${params.priority.toUpperCase()}

Assigned Date:
${params.assignedDate}

Due Date:
${params.dueDate}

Current Status:
ASSIGNED

Your assigned lawyer will work on the matter and you will receive updates as it progresses.

Regards,
LexDraft
Legal Workflow System`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin: 0; padding: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <div style="max-width: 600px; width: 100%; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-sizing: border-box; overflow: hidden;">
    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px;">
      <span style="font-size: 16px; font-weight: 700; color: #0f172a; letter-spacing: 0.5px;">LEXDRAFT</span>
      <span style="font-size: 12px; color: #64748b; margin-left: 8px;">Legal Workflow System</span>
    </div>
    
    <p style="font-size: 15px; line-height: 1.5; margin-bottom: 16px;">Dear <strong>${params.clientName}</strong>,</p>
    <p style="font-size: 14px; line-height: 1.5; color: #334155; margin-bottom: 20px;">Your legal matter has been assigned through LexDraft.</p>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0f172a; padding: 16px; margin-bottom: 20px; border-radius: 8px; box-sizing: border-box;">
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Matter</div>
        <div style="font-size: 14px; font-weight: 600; color: #0f172a; line-height: 1.4; word-break: break-word;">${params.matterTitle}</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Assigned Lawyer</div>
        <div style="font-size: 14px; font-weight: 600; color: #0f172a; line-height: 1.4;">${params.lawyerName}</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Priority</div>
        <div style="font-size: 13px; font-weight: 700; color: #b45309; line-height: 1.4;">${params.priority.toUpperCase()}</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Assigned Date</div>
        <div style="font-size: 13px; color: #334155; line-height: 1.4;">${params.assignedDate}</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Due Date</div>
        <div style="font-size: 13px; color: #334155; line-height: 1.4;">${params.dueDate}</div>
      </div>
      <div>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Current Status</div>
        <div style="font-size: 13px; font-weight: 700; color: #2563eb; line-height: 1.4;">ASSIGNED</div>
      </div>
    </div>

    <p style="font-size: 13px; line-height: 1.5; color: #475569; margin-bottom: 24px;">
      Your assigned lawyer will work on the matter and you will receive updates as it progresses.
    </p>

    <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #64748b;">
      <p style="margin: 0;">Regards,</p>
      <p style="margin: 2px 0 0 0; font-weight: 600; color: #0f172a;">LexDraft Legal Workflow System</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to: params.recipientEmail,
    subject,
    text,
    html,
    emailType: 'TASK_ASSIGNED',
    taskId: params.taskId
  });
}

// ─── 2. Task In Progress Email ────────────────────────────────────────────────

export async function sendTaskInProgressEmail(params: {
  recipientEmail: string;
  clientName: string;
  matterTitle: string;
  lawyerName: string;
  dueDate: string;
  taskId: string;
}) {
  const subject = 'LexDraft — Your Legal Matter Is Now In Progress';

  const text = `Dear ${params.clientName},

Your ${params.matterTitle} matter is now in progress.

Assigned Lawyer:
${params.lawyerName}

Status:
IN PROGRESS

Due Date:
${params.dueDate}

Regards,
LexDraft
Legal Workflow System`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin: 0; padding: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <div style="max-width: 600px; width: 100%; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-sizing: border-box; overflow: hidden;">
    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px;">
      <span style="font-size: 16px; font-weight: 700; color: #0f172a; letter-spacing: 0.5px;">LEXDRAFT</span>
      <span style="font-size: 12px; color: #64748b; margin-left: 8px;">Legal Workflow System</span>
    </div>
    
    <p style="font-size: 15px; line-height: 1.5; margin-bottom: 16px;">Dear <strong>${params.clientName}</strong>,</p>
    <p style="font-size: 14px; line-height: 1.5; color: #334155; margin-bottom: 20px;">Your <strong>${params.matterTitle}</strong> matter is now in progress.</p>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 20px; border-radius: 8px; box-sizing: border-box;">
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Matter</div>
        <div style="font-size: 14px; font-weight: 600; color: #0f172a; line-height: 1.4; word-break: break-word;">${params.matterTitle}</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Assigned Lawyer</div>
        <div style="font-size: 14px; font-weight: 600; color: #0f172a; line-height: 1.4;">${params.lawyerName}</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Status</div>
        <div style="font-size: 13px; font-weight: 700; color: #2563eb; line-height: 1.4;">IN PROGRESS</div>
      </div>
      <div>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Due Date</div>
        <div style="font-size: 13px; color: #334155; line-height: 1.4;">${params.dueDate}</div>
      </div>
    </div>

    <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #64748b;">
      <p style="margin: 0;">Regards,</p>
      <p style="margin: 2px 0 0 0; font-weight: 600; color: #0f172a;">LexDraft Legal Workflow System</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to: params.recipientEmail,
    subject,
    text,
    html,
    emailType: 'TASK_IN_PROGRESS',
    taskId: params.taskId
  });
}

// ─── 3. Final Agreement Email with PDF Attachment ─────────────────────────────

export async function sendAgreementForReviewEmail(params: {
  recipientEmail: string;
  clientName: string;
  matterTitle: string;
  lawyerName: string;
  versionNumber: number;
  pdfBuffer: Buffer;
  approveUrl: string;
  rejectUrl: string;
  taskId: string;
  documentId: string;
}) {
  const subject = 'LexDraft — Agreement Ready for Your Review';
  const cleanTitle = params.matterTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
  const pdfFilename = `${cleanTitle}_v${params.versionNumber}.pdf`;

  const text = `Dear ${params.clientName},

Your ${params.matterTitle} (Version ${params.versionNumber}) is ready for your review.

Matter:
${params.matterTitle}

Lawyer:
${params.lawyerName}

The final agreement is attached to this email as a PDF.

Please review the attached agreement.

To Approve:
${params.approveUrl}

To Reject:
${params.rejectUrl}

Regards,
LexDraft
Legal Workflow System

ATTACHMENT:
${pdfFilename}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin: 0; padding: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <div style="max-width: 600px; width: 100%; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-sizing: border-box; overflow: hidden;">
    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px;">
      <span style="font-size: 16px; font-weight: 700; color: #0f172a; letter-spacing: 0.5px;">LEXDRAFT</span>
      <span style="font-size: 12px; color: #64748b; margin-left: 8px;">Legal Workflow System</span>
    </div>
    
    <p style="font-size: 15px; line-height: 1.5; margin-bottom: 16px;">Dear <strong>${params.clientName}</strong>,</p>
    <p style="font-size: 14px; line-height: 1.5; color: #334155; margin-bottom: 20px;">
      Your <strong>${params.matterTitle}</strong> is ready for your review.
    </p>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; margin-bottom: 20px; border-radius: 8px; box-sizing: border-box;">
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Matter</div>
        <div style="font-size: 14px; font-weight: 600; color: #0f172a; line-height: 1.4; word-break: break-word;">${params.matterTitle}</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Lawyer</div>
        <div style="font-size: 14px; font-weight: 600; color: #0f172a; line-height: 1.4;">${params.lawyerName}</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Version</div>
        <div style="font-size: 13px; color: #334155; line-height: 1.4;">v${params.versionNumber}</div>
      </div>
      <div>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Attachment</div>
        <div style="font-size: 13px; color: #059669; font-weight: 600; line-height: 1.4; word-break: break-all;">📎 ${pdfFilename}</div>
      </div>
    </div>

    <p style="font-size: 13px; line-height: 1.5; color: #475569; margin-bottom: 20px;">
      The complete agreement is attached to this email as a PDF. Please review the attached document and click your decision below:
    </p>

    <!-- Action Buttons (Scanner-Safe Review Links) -->
    <div style="margin: 20px 0; text-align: center; font-size: 0;">
      <div style="display: inline-block; margin: 6px; vertical-align: middle;">
        <a href="${params.approveUrl}" style="display: inline-block; padding: 12px 28px; background-color: #059669; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); min-width: 160px; text-align: center; box-sizing: border-box;">
          Approve Agreement
        </a>
      </div>
      <div style="display: inline-block; margin: 6px; vertical-align: middle;">
        <a href="${params.rejectUrl}" style="display: inline-block; padding: 12px 28px; background-color: #dc2626; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); min-width: 160px; text-align: center; box-sizing: border-box;">
          Reject Agreement
        </a>
      </div>
    </div>

    <p style="font-size: 11px; line-height: 1.5; color: #94a3b8; text-align: center; margin-top: 20px;">
      Security Notice: These single-use links will expire in 7 days. No login is required.
    </p>

    <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 28px; font-size: 12px; color: #64748b;">
      <p style="margin: 0;">Regards,</p>
      <p style="margin: 2px 0 0 0; font-weight: 600; color: #0f172a;">LexDraft Legal Workflow System</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to: params.recipientEmail,
    subject,
    text,
    html,
    attachments: [
      {
        filename: pdfFilename,
        content: params.pdfBuffer
      }
    ],
    emailType: 'AGREEMENT_REVIEW',
    taskId: params.taskId,
    documentId: params.documentId
  });
}

// ─── 4. Internal Notification: Client Approved ────────────────────────────────

export async function sendClientApprovalNotification(params: {
  recipientEmails: string[];
  clientName: string;
  matterTitle: string;
  lawyerName: string;
  versionNumber: number;
  approvedAt: string;
  taskId: string;
  documentId: string;
}) {
  if (params.recipientEmails.length === 0) return { success: true };

  const subject = 'LexDraft — Client Approved Agreement';

  const text = `LexDraft Notification — Client Approved Agreement

Client:
${params.clientName}

Agreement:
${params.matterTitle} (v${params.versionNumber})

Lawyer:
${params.lawyerName}

Status:
CLIENT APPROVED

Approved:
${params.approvedAt}

The agreement is awaiting Senior Partner final review.

Regards,
LexDraft Legal Workflow System`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin: 0; padding: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <div style="max-width: 600px; width: 100%; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-sizing: border-box; overflow: hidden;">
    <div style="border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 20px;">
      <span style="font-size: 16px; font-weight: 700; color: #059669; letter-spacing: 0.5px;">CLIENT DECISION RECORDED</span>
      <span style="font-size: 12px; color: #64748b; margin-left: 8px;">LexDraft Workflow</span>
    </div>
    
    <p style="font-size: 15px; line-height: 1.5; margin-bottom: 16px;">
      Client <strong>${params.clientName}</strong> has <strong>APPROVED</strong> the agreement.
    </p>
    
    <div style="background: #f0fdf4; border: 1px solid #d1fae5; border-left: 4px solid #059669; padding: 16px; margin-bottom: 20px; border-radius: 8px; box-sizing: border-box;">
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Client</div>
        <div style="font-size: 14px; font-weight: 600; color: #0f172a; line-height: 1.4;">${params.clientName}</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Agreement</div>
        <div style="font-size: 14px; font-weight: 600; color: #0f172a; line-height: 1.4; word-break: break-word;">${params.matterTitle} (v${params.versionNumber})</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Lawyer</div>
        <div style="font-size: 14px; font-weight: 600; color: #0f172a; line-height: 1.4;">${params.lawyerName}</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Status</div>
        <div style="font-size: 13px; font-weight: 700; color: #059669; line-height: 1.4;">CLIENT APPROVED</div>
      </div>
      <div>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Approved At</div>
        <div style="font-size: 13px; color: #334155; line-height: 1.4;">${params.approvedAt}</div>
      </div>
    </div>

    <p style="font-size: 13px; line-height: 1.5; color: #475569; margin-bottom: 20px;">
      The legal matter is currently in <strong>UNDER REVIEW</strong> status awaiting Senior Partner final review.
    </p>

    <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #64748b;">
      <p style="margin: 0;">LexDraft Internal Notification</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to: params.recipientEmails,
    subject,
    text,
    html,
    emailType: 'CLIENT_APPROVED',
    taskId: params.taskId,
    documentId: params.documentId
  });
}

// ─── 5. Internal Notification: Client Rejected ────────────────────────────────

export async function sendClientRejectionNotification(params: {
  recipientEmails: string[];
  clientName: string;
  matterTitle: string;
  lawyerName: string;
  versionNumber: number;
  rejectedAt: string;
  rejectionReason?: string;
  taskId: string;
  documentId: string;
}) {
  if (params.recipientEmails.length === 0) return { success: true };

  const subject = 'LexDraft — Client Rejected Agreement';

  const text = `LexDraft Notification — Client Rejected Agreement

Client:
${params.clientName}

Agreement:
${params.matterTitle} (v${params.versionNumber})

Lawyer:
${params.lawyerName}

Status:
CLIENT REJECTED

Rejected:
${params.rejectedAt}
${params.rejectionReason ? `\nReason:\n${params.rejectionReason}` : ''}

Please review the agreement and create a new version for re-submission.

Regards,
LexDraft Legal Workflow System`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin: 0; padding: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <div style="max-width: 600px; width: 100%; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-sizing: border-box; overflow: hidden;">
    <div style="border-bottom: 2px solid #dc2626; padding-bottom: 12px; margin-bottom: 20px;">
      <span style="font-size: 16px; font-weight: 700; color: #dc2626;">CLIENT DECISION RECORDED</span>
      <span style="font-size: 12px; color: #64748b; margin-left: 8px;">LexDraft Workflow</span>
    </div>
    
    <p style="font-size: 15px; line-height: 1.5; margin-bottom: 16px;">
      Client <strong>${params.clientName}</strong> has <strong>REJECTED</strong> agreement version v${params.versionNumber}.
    </p>
    
    <div style="background: #fef2f2; border: 1px solid #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 20px; border-radius: 8px; box-sizing: border-box;">
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Client</div>
        <div style="font-size: 14px; font-weight: 600; color: #0f172a; line-height: 1.4;">${params.clientName}</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Agreement</div>
        <div style="font-size: 14px; font-weight: 600; color: #0f172a; line-height: 1.4; word-break: break-word;">${params.matterTitle} (v${params.versionNumber})</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Lawyer</div>
        <div style="font-size: 14px; font-weight: 600; color: #0f172a; line-height: 1.4;">${params.lawyerName}</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Status</div>
        <div style="font-size: 13px; font-weight: 700; color: #dc2626; line-height: 1.4;">CLIENT REJECTED</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Rejected At</div>
        <div style="font-size: 13px; color: #334155; line-height: 1.4;">${params.rejectedAt}</div>
      </div>
      ${params.rejectionReason ? `<div>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; margin-bottom: 2px;">Reason</div>
        <div style="font-size: 13px; color: #dc2626; line-height: 1.4; word-break: break-word; font-style: italic;">${params.rejectionReason}</div>
      </div>` : ''}
    </div>

    <p style="font-size: 13px; line-height: 1.5; color: #475569; margin-bottom: 20px;">
      The lawyer may modify the agreement to create <strong>v${params.versionNumber + 1}</strong>. The rejected version v${params.versionNumber} remains preserved.
    </p>

    <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #64748b;">
      <p style="margin: 0;">LexDraft Internal Notification</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to: params.recipientEmails,
    subject,
    text,
    html,
    emailType: 'CLIENT_REJECTED',
    taskId: params.taskId,
    documentId: params.documentId
  });
}
