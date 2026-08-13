import { Request, Response, NextFunction } from 'express';
import {
  sendAgreementToClient,
  getApprovalReviewDetails,
  processClientAction
} from '../services/client-approval.service';

/**
 * Renders a minimal, clean, scanner-safe confirmation page.
 * Neutralizes automated email scanners (Safe Links, anti-phishing bots)
 * by requiring a human click on "Confirm Decision" to execute the state change.
 */
export async function getReviewPage(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.params.token;
    const action = req.query.action === 'reject' ? 'reject' : 'approve';

    const details = await getApprovalReviewDetails(token);

    if (!details.valid) {
      return res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>LexDraft — Agreement Review</title>
  <style>
    body { margin: 0; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; display: flex; justify-content: center; align-items: center; min-height: 80vh; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 480px; width: 100%; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { font-size: 14px; font-weight: 700; color: #0f172a; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 20px; }
    .msg { font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px; }
    .footer { font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">LEXDRAFT LEGAL WORKFLOW</div>
    <div class="msg">${details.message}</div>
    <div class="footer">LexDraft Document Delivery System</div>
  </div>
</body>
</html>
      `);
    }

    const isApprove = action === 'approve';

    return res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>LexDraft — ${isApprove ? 'Approve' : 'Reject'} Agreement</title>
  <style>
    body { margin: 0; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; display: flex; justify-content: center; align-items: center; min-height: 80vh; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 500px; width: 100%; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { font-size: 14px; font-weight: 700; color: #0f172a; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 20px; }
    .title { font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
    .meta { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin-bottom: 20px; font-size: 13px; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .meta-row:last-child { margin-bottom: 0; }
    .label { color: #64748b; }
    .val { font-weight: 600; color: #0f172a; }
    .instruction { font-size: 14px; color: #334155; margin-bottom: 24px; line-height: 1.5; }
    .btn { display: block; width: 100%; padding: 14px; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; color: #ffffff; cursor: pointer; text-align: center; box-sizing: border-box; }
    .btn-approve { background: #059669; }
    .btn-approve:hover { background: #047857; }
    .btn-reject { background: #dc2626; }
    .btn-reject:hover { background: #b91c1c; }
    .reason-box { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; margin-bottom: 16px; box-sizing: border-box; font-family: inherit; resize: vertical; }
    .footer { font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">LEXDRAFT LEGAL WORKFLOW</div>
    <div class="title">Confirm ${isApprove ? 'Agreement Approval' : 'Agreement Rejection'}</div>
    
    <div class="meta">
      <div class="meta-row"><span class="label">Client:</span><span class="val">${details.clientName}</span></div>
      <div class="meta-row"><span class="label">Matter:</span><span class="val">${details.matterTitle}</span></div>
      <div class="meta-row"><span class="label">Assigned Lawyer:</span><span class="val">${details.lawyerName}</span></div>
      <div class="meta-row"><span class="label">Agreement Version:</span><span class="val">v${details.versionNumber}</span></div>
    </div>

    <form method="POST" action="/api/client-actions/submit">
      <input type="hidden" name="token" value="${token}"/>
      <input type="hidden" name="action" value="${action}"/>

      ${isApprove
        ? `<p class="instruction">By clicking below, you confirm that you have reviewed the attached PDF agreement and approve it for final firm review.</p>`
        : `<p class="instruction">Please state any reason for rejection below (optional), then confirm rejection:</p>
           <textarea name="rejectionReason" class="reason-box" rows="3" placeholder="Reason for rejection (optional)..."></textarea>`
      }

      <button type="submit" class="btn ${isApprove ? 'btn-approve' : 'btn-reject'}">
        ${isApprove ? 'Confirm Approval' : 'Confirm Rejection'}
      </button>
    </form>

    <div class="footer">Zero-Login Secure Agreement Action • Single-Use Link</div>
  </div>
</body>
</html>
    `);
  } catch (err) {
    next(err);
  }
}

/**
 * Executes the client approval or rejection action.
 * Returns a minimal text confirmation response.
 */
export async function postClientAction(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.body.token || req.query.token;
    const action = req.body.action || req.query.action;
    const rejectionReason = req.body.rejectionReason;

    if (!token || !action || !['approve', 'reject'].includes(action)) {
      return res.status(400).send(`
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif; padding:40px; text-align:center; color:#334155;">
  <p>Invalid request parameters.</p>
</body>
</html>`);
    }

    const result = await processClientAction({
      rawToken: token,
      action: action as 'approve' | 'reject',
      rejectionReason
    });

    if (req.accepts('json') && !req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
      return res.status(result.success ? 200 : 400).json(result);
    }

    return res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>LexDraft — Decision Recorded</title>
  <style>
    body { margin: 0; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; display: flex; justify-content: center; align-items: center; min-height: 80vh; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 480px; width: 100%; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); text-align: center; }
    .icon { font-size: 36px; margin-bottom: 12px; }
    .header { font-size: 13px; font-weight: 700; color: #64748b; letter-spacing: 0.5px; margin-bottom: 16px; }
    .msg { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
    .sub { font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 24px; }
    .footer { font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${result.success ? '✓' : 'ℹ'}</div>
    <div class="header">LEXDRAFT LEGAL WORKFLOW</div>
    <div class="msg">${result.message}</div>
    <div class="sub">${result.success ? 'Your assigned lawyer has been notified and will proceed with next steps.' : ''}</div>
    <div class="footer">You may now close this window.</div>
  </div>
</body>
</html>
    `);
  } catch (err) {
    next(err);
  }
}

/**
 * Protected internal endpoint for Lawyers / Partners to trigger sending the agreement to client.
 */
export async function postSendToClient(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId } = req.params;
    const { documentId } = req.body;
    const user = req.user!;

    const result = await sendAgreementToClient({
      taskId,
      documentId,
      requestingUserId: user.userId,
      requestingUserRole: user.role,
      organizationId: user.organizationId
    });

    return res.status(200).json({
      success: true,
      message: 'Agreement dispatched to client for review.',
      data: result
    });
  } catch (err) {
    next(err);
  }
}
