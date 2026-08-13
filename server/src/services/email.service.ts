import { Resend } from 'resend';
import PDFDocument from 'pdfkit';
import { prisma } from '../lib/prisma';
import { EmailDeliveryStatus } from '@prisma/client';

// ─── Environment Configuration ───────────────────────────────────────────────
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const RESEND_FROM_NAME = process.env.RESEND_FROM_NAME || 'LexDraft Legal Workflow';

// Initialize Resend Client
const resendClient = RESEND_API_KEY && RESEND_API_KEY !== 're_123456789_placeholder'
  ? new Resend(RESEND_API_KEY)
  : null;

/**
 * Strips HTML tags and decodes basic entities for clean text extraction in PDF generation.
 */
function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Builds a professionally formatted A4 legal agreement PDF Buffer directly from the persisted DocumentVersion content.
 * Reuses standard Indian legal formatting: A4 margins, Times-Roman typography, 1.5 line spacing, structured headings.
 */
export async function buildPdfBufferFromVersion(
  versionContent: string,
  title: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 54, bottom: 54, left: 54, right: 54 },
        info: {
          Title: title,
          Author: 'LexDraft Legal Workflow System',
          Creator: 'LexDraft Enterprise Legal Tech'
        },
        bufferPages: true
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: Error) => reject(err));

      // Header Banner
      doc
        .font('Times-Bold')
        .fontSize(16)
        .text(title.toUpperCase(), { align: 'center' });
      
      doc.moveDown(0.5);

      doc
        .font('Times-Italic')
        .fontSize(10)
        .fillColor('#475569')
        .text('LexDraft Document Delivery • Executed Version Record', { align: 'center' });

      doc.moveDown(1);
      doc.strokeColor('#cbd5e1').lineWidth(0.75).moveTo(54, doc.y).lineTo(541, doc.y).stroke();
      doc.moveDown(1.5);

      // Body text parsed from versionContent
      const plainContent = stripHtml(versionContent);
      const paragraphs = plainContent.split(/\n\n+/);

      doc.fillColor('#0f172a').fontSize(11).font('Times-Roman');

      for (const paragraph of paragraphs) {
        const trimmed = paragraph.trim();
        if (!trimmed) continue;

        // Check if paragraph is a clause title / heading
        if (/^(ARTICLE|SECTION|\d+\.|\([a-z]\)|WHEREAS|IN WITNESS WHEREOF|SCHEDULE)/i.test(trimmed)) {
          doc.moveDown(0.5);
          doc.font('Times-Bold').text(trimmed, {
            lineGap: 4,
            align: 'justify'
          });
          doc.font('Times-Roman');
        } else {
          doc.text(trimmed, {
            lineGap: 4,
            align: 'justify',
            indent: 12
          });
        }
        doc.moveDown(0.5);
      }

      // Page numbers footer
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc
          .font('Times-Roman')
          .fontSize(9)
          .fillColor('#94a3b8')
          .text(
            `Page ${i + 1} of ${range.count}`,
            54,
            792,
            { align: 'center', width: 487 }
          );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
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

  if (!resendClient) {
    const errorMsg = 'Resend client not configured (missing or placeholder RESEND_API_KEY).';
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
    const payload: any = {
      from: `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL}>`,
      to: params.to,
      subject: params.subject,
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
<head><meta charset="utf-8"/></head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px;">
    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 24px;">
      <span style="font-size: 16px; font-weight: 700; color: #0f172a; letter-spacing: 0.5px;">LEXDRAFT</span>
      <span style="font-size: 12px; color: #64748b; margin-left: 8px;">Legal Workflow System</span>
    </div>
    
    <p style="font-size: 15px; line-height: 1.6; margin-bottom: 16px;">Dear <strong>${params.clientName}</strong>,</p>
    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 24px;">Your legal matter has been assigned through LexDraft.</p>
    
    <div style="background: #f1f5f9; border-left: 4px solid #0f172a; padding: 16px; margin-bottom: 24px; border-radius: 0 6px 6px 0;">
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr><td style="padding: 4px 0; color: #64748b; width: 140px;">Matter:</td><td style="font-weight: 600; color: #0f172a;">${params.matterTitle}</td></tr>
        <tr><td style="padding: 4px 0; color: #64748b;">Assigned Lawyer:</td><td style="font-weight: 600; color: #0f172a;">${params.lawyerName}</td></tr>
        <tr><td style="padding: 4px 0; color: #64748b;">Priority:</td><td style="font-weight: 600; color: #0f172a;">${params.priority.toUpperCase()}</td></tr>
        <tr><td style="padding: 4px 0; color: #64748b;">Assigned Date:</td><td style="color: #334155;">${params.assignedDate}</td></tr>
        <tr><td style="padding: 4px 0; color: #64748b;">Due Date:</td><td style="color: #334155;">${params.dueDate}</td></tr>
        <tr><td style="padding: 4px 0; color: #64748b;">Current Status:</td><td style="font-weight: 700; color: #2563eb;">ASSIGNED</td></tr>
      </table>
    </div>

    <p style="font-size: 13px; line-height: 1.6; color: #475569; margin-bottom: 28px;">
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
<head><meta charset="utf-8"/></head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px;">
    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 24px;">
      <span style="font-size: 16px; font-weight: 700; color: #0f172a; letter-spacing: 0.5px;">LEXDRAFT</span>
      <span style="font-size: 12px; color: #64748b; margin-left: 8px;">Legal Workflow System</span>
    </div>
    
    <p style="font-size: 15px; line-height: 1.6; margin-bottom: 16px;">Dear <strong>${params.clientName}</strong>,</p>
    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 24px;">Your <strong>${params.matterTitle}</strong> matter is now in progress.</p>
    
    <div style="background: #f1f5f9; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 24px; border-radius: 0 6px 6px 0;">
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr><td style="padding: 4px 0; color: #64748b; width: 140px;">Matter:</td><td style="font-weight: 600; color: #0f172a;">${params.matterTitle}</td></tr>
        <tr><td style="padding: 4px 0; color: #64748b;">Assigned Lawyer:</td><td style="font-weight: 600; color: #0f172a;">${params.lawyerName}</td></tr>
        <tr><td style="padding: 4px 0; color: #64748b;">Status:</td><td style="font-weight: 700; color: #2563eb;">IN PROGRESS</td></tr>
        <tr><td style="padding: 4px 0; color: #64748b;">Due Date:</td><td style="color: #334155;">${params.dueDate}</td></tr>
      </table>
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
<head><meta charset="utf-8"/></head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px;">
    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 24px;">
      <span style="font-size: 16px; font-weight: 700; color: #0f172a; letter-spacing: 0.5px;">LEXDRAFT</span>
      <span style="font-size: 12px; color: #64748b; margin-left: 8px;">Legal Workflow System</span>
    </div>
    
    <p style="font-size: 15px; line-height: 1.6; margin-bottom: 16px;">Dear <strong>${params.clientName}</strong>,</p>
    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
      Your <strong>${params.matterTitle}</strong> is ready for your review.
    </p>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; margin-bottom: 24px; border-radius: 6px;">
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr><td style="padding: 4px 0; color: #64748b; width: 120px;">Matter:</td><td style="font-weight: 600; color: #0f172a;">${params.matterTitle}</td></tr>
        <tr><td style="padding: 4px 0; color: #64748b;">Lawyer:</td><td style="font-weight: 600; color: #0f172a;">${params.lawyerName}</td></tr>
        <tr><td style="padding: 4px 0; color: #64748b;">Version:</td><td style="color: #334155;">v${params.versionNumber}</td></tr>
        <tr><td style="padding: 4px 0; color: #64748b;">Attachment:</td><td style="color: #0f172a; font-weight: 600;">📎 ${pdfFilename}</td></tr>
      </table>
    </div>

    <p style="font-size: 13px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
      The complete agreement is attached to this email as a PDF. Please review the attached document and click your decision below:
    </p>

    <!-- Action Buttons (Scanner-Safe Review Links) -->
    <div style="margin: 28px 0; text-align: center;">
      <a href="${params.approveUrl}" style="display: inline-block; padding: 12px 28px; background-color: #059669; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 6px; margin-right: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
        Approve Agreement
      </a>
      <a href="${params.rejectUrl}" style="display: inline-block; padding: 12px 28px; background-color: #dc2626; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
        Reject Agreement
      </a>
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
<head><meta charset="utf-8"/></head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px;">
    <div style="border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 24px;">
      <span style="font-size: 16px; font-weight: 700; color: #059669;">CLIENT DECISION RECORDED</span>
      <span style="font-size: 12px; color: #64748b; margin-left: 8px;">LexDraft Workflow</span>
    </div>
    
    <p style="font-size: 15px; line-height: 1.6; margin-bottom: 16px;">
      Client <strong>${params.clientName}</strong> has <strong>APPROVED</strong> the agreement.
    </p>
    
    <div style="background: #f0fdf4; border-left: 4px solid #059669; padding: 16px; margin-bottom: 24px; border-radius: 0 6px 6px 0;">
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr><td style="padding: 4px 0; color: #64748b; width: 140px;">Client:</td><td style="font-weight: 600; color: #0f172a;">${params.clientName}</td></tr>
        <tr><td style="padding: 4px 0; color: #64748b;">Agreement:</td><td style="font-weight: 600; color: #0f172a;">${params.matterTitle} (v${params.versionNumber})</td></tr>
        <tr><td style="padding: 4px 0; color: #64748b;">Lawyer:</td><td style="color: #0f172a;">${params.lawyerName}</td></tr>
        <tr><td style="padding: 4px 0; color: #64748b;">Status:</td><td style="font-weight: 700; color: #059669;">CLIENT APPROVED</td></tr>
        <tr><td style="padding: 4px 0; color: #64748b;">Approved At:</td><td style="color: #334155;">${params.approvedAt}</td></tr>
      </table>
    </div>

    <p style="font-size: 13px; line-height: 1.6; color: #475569; margin-bottom: 20px;">
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
<head><meta charset="utf-8"/></head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px;">
    <div style="border-bottom: 2px solid #dc2626; padding-bottom: 12px; margin-bottom: 24px;">
      <span style="font-size: 16px; font-weight: 700; color: #dc2626;">CLIENT DECISION RECORDED</span>
      <span style="font-size: 12px; color: #64748b; margin-left: 8px;">LexDraft Workflow</span>
    </div>
    
    <p style="font-size: 15px; line-height: 1.6; margin-bottom: 16px;">
      Client <strong>${params.clientName}</strong> has <strong>REJECTED</strong> agreement version v${params.versionNumber}.
    </p>
    
    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 24px; border-radius: 0 6px 6px 0;">
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr><td style="padding: 4px 0; color: #64748b; width: 140px;">Client:</td><td style="font-weight: 600; color: #0f172a;">${params.clientName}</td></tr>
        <tr><td style="padding: 4px 0; color: #64748b;">Agreement:</td><td style="font-weight: 600; color: #0f172a;">${params.matterTitle} (v${params.versionNumber})</td></tr>
        <tr><td style="padding: 4px 0; color: #64748b;">Lawyer:</td><td style="color: #0f172a;">${params.lawyerName}</td></tr>
        <tr><td style="padding: 4px 0; color: #64748b;">Status:</td><td style="font-weight: 700; color: #dc2626;">CLIENT REJECTED</td></tr>
        <tr><td style="padding: 4px 0; color: #64748b;">Rejected At:</td><td style="color: #334155;">${params.rejectedAt}</td></tr>
        ${params.rejectionReason ? `<tr><td style="padding: 4px 0; color: #64748b;">Reason:</td><td style="color: #334155;">${params.rejectionReason}</td></tr>` : ''}
      </table>
    </div>

    <p style="font-size: 13px; line-height: 1.6; color: #475569; margin-bottom: 20px;">
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
