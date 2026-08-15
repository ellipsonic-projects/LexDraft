import { Request, Response, NextFunction } from 'express';
import {
  createSignatureRequest,
  getSignerDetails,
  submitSignature,
  declineSignature,
  getSignatureRequestForDocument,
  getSignatureRequestsForTask
} from '../services/signature.service';

// ─── Internal API Endpoints (require JWT auth) ────────────────────────────────

/**
 * POST /api/signatures/request
 * BOSS only. Creates a signing request for an approved document.
 * Body: { taskId, documentId, signers: CreateSignerInput[] }
 */
export async function postCreateSignatureRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const { taskId, documentId, signers } = req.body;

    if (!taskId || !documentId || !signers) {
      return res.status(400).json({ status: 'error', message: 'taskId, documentId, and signers are required.' });
    }

    const result = await createSignatureRequest({
      taskId,
      documentId,
      requestingUserId: user.userId,
      requestingUserRole: user.role,
      organizationId: user.organizationId,
      signers
    });

    return res.status(201).json({
      status: 'success',
      message: 'Signing process started. First signer has been notified.',
      data: { signatureRequestId: result.id }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/signatures/document/:documentId
 * Returns the active signature request for a document (for Kanban/Editor display).
 */
export async function getDocumentSignatureRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const { documentId } = req.params;
    const result = await getSignatureRequestForDocument(documentId);
    return res.status(200).json({ status: 'success', data: { signatureRequest: result } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/signatures/task/:taskId
 * Returns all signature requests for a task.
 */
export async function getTaskSignatureRequests(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId } = req.params;
    const result = await getSignatureRequestsForTask(taskId);
    return res.status(200).json({ status: 'success', data: { signatureRequests: result } });
  } catch (err) {
    next(err);
  }
}

// ─── Zero-Login Public Endpoints (secured by token only) ─────────────────────

/**
 * GET /api/signatures/signer/:token
 * Renders the signing page as server-side HTML.
 * Viewing this page does NOT sign the document — only the POST /sign endpoint does.
 * Logs SIGNATURE_VIEWED but does NOT change the signer's status.
 */
export async function getSigningPage(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.params;
    const details = await getSignerDetails(token);

    if (!details.valid) {
      const codeMessages: Record<string, { icon: string; heading: string }> = {
        EXPIRED: { icon: '⏰', heading: 'Link Expired' },
        ALREADY_SIGNED: { icon: '✅', heading: 'Already Signed' },
        NOT_YOUR_TURN: { icon: '⏳', heading: 'Not Your Turn Yet' },
        CLOSED: { icon: '🔒', heading: 'Process Closed' },
        INVALID: { icon: '🔗', heading: 'Invalid Link' }
      };
      const cm = codeMessages[details.reason || 'INVALID'] || { icon: '⚠️', heading: 'Unavailable' };
      return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>LexDraft — Signing</title>
  <style>
    body{margin:0;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#f1f5f9,#e2e8f0);min-height:100vh;display:flex;flex-direction:column;align-items:center;}
    .logo{margin-bottom:24px;display:flex;align-items:center;gap:10px;font-size:18px;font-weight:700;color:#1e293b;}
    .logo-box{width:36px;height:36px;background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:14px;}
    .card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;max-width:480px;width:100%;padding:40px 32px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.06);}
    .icon{font-size:52px;margin-bottom:16px;}
    h2{margin:0 0 12px;font-size:22px;color:#1e293b;font-weight:700;}
    p{margin:0;font-size:14px;color:#64748b;line-height:1.6;}
  </style>
</head>
<body>
  <div class="logo"><div class="logo-box">LD</div> LexDraft</div>
  <div class="card">
    <div class="icon">${cm.icon}</div>
    <h2>${cm.heading}</h2>
    <p>${details.message}</p>
  </div>
</body>
</html>`);
    }

    // Build signer progress rows
    const signersHtml = (details.signers || []).map((s: any, i: number) => {
      const isCurrent = s.signingOrder === details.currentOrder;
      const isSigned = s.status === 'SIGNED';
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;background:${isCurrent ? '#eff6ff' : isSigned ? '#f0fdf4' : '#f8fafc'};border:1px solid ${isCurrent ? '#bfdbfe' : isSigned ? '#bbf7d0' : '#e2e8f0'};margin-bottom:6px;">
  <div style="width:20px;height:20px;border-radius:50%;background:${isSigned ? '#22c55e' : isCurrent ? '#3b82f6' : '#e2e8f0'};color:${isSigned || isCurrent ? '#fff' : '#94a3b8'};font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${isSigned ? '✓' : i + 1}</div>
  <span style="font-size:13px;color:#1e293b;font-weight:${isCurrent ? 600 : 400};">${s.signerName}</span>
  <span style="font-size:11px;color:#64748b;">— ${s.signerRole}</span>
  ${isCurrent ? '<span style="margin-left:auto;font-size:11px;font-weight:700;color:#3b82f6;">← You</span>' : ''}
  ${isSigned ? '<span style="margin-left:auto;font-size:11px;font-weight:600;color:#22c55e;">✓ Signed</span>' : ''}
</div>`;
    }).join('');

    const expiryDate = new Date(details.expiresAt as Date).toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Sign: ${details.documentTitle} — LexDraft</title>
  <style>
    *{box-sizing:border-box;}
    body{margin:0;padding:24px 16px 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#f1f5f9,#e2e8f0);min-height:100vh;}
    .logo{text-align:center;margin-bottom:24px;display:flex;align-items:center;justify-content:center;gap:10px;font-size:18px;font-weight:700;color:#1e293b;}
    .logo-box{width:36px;height:36px;background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:14px;}
    .wrap{max-width:720px;margin:0 auto;}
    .card{background:#fff;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,.06);margin-bottom:20px;overflow:hidden;}
    .header-card{background:linear-gradient(135deg,#1e293b,#0f172a);padding:28px 32px;color:#fff;}
    .tabs{display:flex;border-bottom:1px solid #e2e8f0;}
    .tab{flex:1;padding:12px;border:none;background:none;font-size:13px;cursor:pointer;border-bottom:2px solid transparent;color:#64748b;font-weight:500;}
    .tab.active{border-bottom-color:#6366f1;color:#6366f1;font-weight:700;}
    canvas{display:block;width:100%;height:150px;touch-action:none;cursor:crosshair;background:#fff;}
    .canvas-wrap{border:2px solid #e2e8f0;border-radius:8px;overflow:hidden;}
    .btn{display:block;width:100%;padding:13px;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;text-align:center;}
    .btn-sign{background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;}
    .btn-sign:disabled{background:#e2e8f0;color:#94a3b8;cursor:not-allowed;}
    .btn-decline{background:#fff;border:1px solid #fecaca;color:#dc2626;font-size:14px;padding:11px;}
    .btn-back{background:#fff;border:1px solid #e2e8f0;color:#64748b;font-size:14px;padding:11px;}
    .btn-confirm-decline{background:#dc2626;color:#fff;padding:11px;font-size:14px;}
    .upload-drop{border:2px dashed #cbd5e1;border-radius:8px;padding:32px 20px;text-align:center;cursor:pointer;background:#f8fafc;transition:all 0.2s;}
    .upload-drop:hover{border-color:#6366f1;background:#f0f0ff;}
    .notice{background:#f8fafc;border-radius:8px;padding:12px 14px;font-size:11px;color:#64748b;line-height:1.5;margin-top:14px;}
    .warning{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;font-size:12px;color:#92400e;margin-top:14px;}
    .success-msg{display:none;text-align:center;padding:40px 32px;}
    summary{cursor:pointer;padding:14px 20px;font-size:13px;font-weight:600;color:#1e293b;list-style:none;display:flex;justify-content:space-between;align-items:center;}
    .section-label{font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;}
    details > div{border-top:1px solid #e2e8f0;padding:20px;max-height:400px;overflow-y:auto;font-size:13px;color:#1e293b;line-height:1.6;}
    input[type=file]{display:none;}
    img#upload-preview{display:none;max-height:120px;max-width:100%;margin:0 auto 8px;}
    @keyframes spin{to{transform:rotate(360deg)}}
    .spinner{width:40px;height:40px;border:3px solid #e2e8f0;border-top-color:#6366f1;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 12px;}
    #decline-form{display:none;}
  </style>
</head>
<body>
<div class="logo"><div class="logo-box">LD</div> LexDraft</div>
<div class="wrap">

  <!-- Header -->
  <div class="header-card" style="border-radius:16px;margin-bottom:20px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <div style="width:40px;height:40px;border-radius:10px;background:rgba(99,102,241,.3);display:flex;align-items:center;justify-content:center;font-size:20px;">✍️</div>
      <div>
        <div style="font-size:12px;color:#94a3b8;letter-spacing:.5px;">SIGNATURE REQUEST</div>
        <div style="font-size:18px;font-weight:700;">LexDraft Legal Workflow</div>
      </div>
    </div>
    <div style="border-top:1px solid rgba(255,255,255,.1);padding-top:16px;">
      <div style="font-size:12px;color:#94a3b8;margin-bottom:4px;">Dear ${details.signerName},</div>
      <div style="font-size:14px;color:#cbd5e1;line-height:1.5;">You are requested to digitally sign <strong style="color:#fff;">"${details.documentTitle}"</strong> (v${details.documentVersionNumber}) in your capacity as <strong style="color:#fff;">${details.signerRole}</strong>. You are signer <strong style="color:#fff;">${details.currentOrder}</strong> of <strong style="color:#fff;">${details.totalSigners}</strong>.</div>
    </div>
    <div style="margin-top:14px;padding:10px 14px;background:#fffbeb;border-radius:8px;font-size:12px;color:#92400e;">⏰ This link expires on <strong>${expiryDate}</strong>. Do not share this link.</div>
  </div>

  <!-- Signing order progress -->
  <div class="card" style="padding:16px 20px;">
    <div class="section-label">Signing Order</div>
    ${signersHtml}
  </div>

  <!-- Document preview -->
  <details class="card">
    <summary>📄 Preview Document Before Signing <span style="font-size:12px;color:#94a3b8;">Click to expand</span></summary>
    <div>${details.documentContent}</div>
  </details>

  <!-- Signature panel -->
  <div class="card" id="sig-panel">
    <div id="sign-section">
      <div style="padding:20px 24px 0;">
        <div style="font-size:13px;font-weight:600;color:#1e293b;margin-bottom:12px;">Choose Signature Method</div>
      </div>
      <div class="tabs">
        <button class="tab active" onclick="switchTab('DRAWN')" id="tab-DRAWN">✏️ Draw Signature</button>
        <button class="tab" onclick="switchTab('UPLOADED')" id="tab-UPLOADED">📁 Upload Image</button>
      </div>
      <div style="padding:20px 24px;">
        <!-- DRAWN -->
        <div id="panel-DRAWN">
          <div class="canvas-wrap">
            <canvas id="sig-canvas" width="600" height="150"></canvas>
          </div>
          <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;">
            <span id="canvas-hint" style="font-size:12px;color:#94a3b8;">Draw your signature above</span>
            <button type="button" onclick="clearCanvas()" style="background:none;border:1px solid #e2e8f0;border-radius:6px;padding:4px 10px;font-size:12px;color:#64748b;cursor:pointer;">Clear</button>
          </div>
        </div>
        <!-- UPLOADED -->
        <div id="panel-UPLOADED" style="display:none;">
          <div class="upload-drop" onclick="document.getElementById('file-input').click()" id="drop-zone">
            <div style="font-size:28px;margin-bottom:8px;">📁</div>
            <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#1e293b;">Click or drag to upload</p>
            <p style="margin:0;font-size:12px;color:#94a3b8;">PNG, JPG or SVG · Max 2 MB</p>
          </div>
          <img id="upload-preview" alt="Uploaded signature"/>
          <input type="file" id="file-input" accept="image/*" onchange="handleFileUpload(event)"/>
        </div>

        <div class="warning">⏰ This link expires on <strong>${expiryDate}</strong>. Do not share this link.</div>
        <div class="notice">🔒 By clicking "Sign Document", you agree that this electronic signature is the legal equivalent of your handwritten signature. Your IP address, device information, and timestamp will be recorded as part of the audit trail.</div>

        <div style="margin-top:16px;display:flex;gap:12px;">
          <button class="btn btn-decline" style="flex:1;" onclick="showDeclineForm()">✕ Decline</button>
          <button class="btn btn-sign" style="flex:2;" id="sign-btn" disabled onclick="submitSignature()">✍️ Sign Document</button>
        </div>
      </div>
    </div>

    <!-- Decline form (hidden by default) -->
    <div id="decline-form" style="padding:24px;">
      <h3 style="margin:0 0 8px;color:#dc2626;font-size:16px;font-weight:700;">⚠️ Decline to Sign</h3>
      <p style="margin:0 0 16px;color:#64748b;font-size:13px;">This will cancel the entire signing process and notify the responsible lawyer.</p>
      <label style="display:block;font-size:12px;font-weight:600;color:#64748b;margin-bottom:8px;">Reason (optional)</label>
      <textarea id="decline-reason" placeholder="e.g. I require a clause modification before signing..." rows="3" style="width:100%;padding:10px;border-radius:8px;border:1px solid #e2e8f0;font-size:13px;resize:vertical;margin-bottom:16px;font-family:inherit;color:#1e293b;"></textarea>
      <div style="display:flex;gap:12px;">
        <button class="btn btn-back" style="flex:1;" onclick="hideDeclineForm()">← Go Back</button>
        <button class="btn btn-confirm-decline" style="flex:1;" onclick="submitDecline()">Confirm Decline</button>
      </div>
    </div>

    <!-- Success / Error message -->
    <div class="success-msg" id="result-msg">
      <div id="result-icon" style="font-size:52px;margin-bottom:16px;">✅</div>
      <h2 id="result-heading" style="margin:0 0 12px;font-size:22px;color:#1e293b;font-weight:700;">Signature Confirmed!</h2>
      <p id="result-body" style="margin:0;color:#64748b;font-size:14px;line-height:1.6;"></p>
    </div>
  </div>

  <p style="text-align:center;font-size:11px;color:#94a3b8;">LexDraft Legal Workflow · Confidential Document Signing Portal<br/>This page is secured by a 256-bit cryptographic token.</p>
</div>

<script>
  const TOKEN = ${JSON.stringify(token)};
  const API = ${JSON.stringify((req.protocol + '://' + req.get('host') + '/api'))};
  let activeTab = 'DRAWN';
  let signatureData = null;
  let canvasEmpty = true;

  // ─── Canvas Drawing ───────────────────────────────────────────────────────
  const canvas = document.getElementById('sig-canvas');
  const ctx = canvas.getContext('2d');
  let isDrawing = false;
  let lastPos = { x: 0, y: 0 };
  let hasStrokes = false;

  function initCanvas() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
  }

  // Initialize canvas on DOM content loaded, load, and window resize
  window.addEventListener('load', initCanvas);
  window.addEventListener('resize', () => { if (!hasStrokes) initCanvas(); });
  setTimeout(initCanvas, 50);
  setTimeout(initCanvas, 300);

  function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
    const clientY = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  function startDrawing(e) {
    if (e.target !== canvas) return;
    if (e.cancelable) e.preventDefault();
    isDrawing = true;
    lastPos = getCanvasPos(e);
  }

  function draw(e) {
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault();
    const currentPos = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();
    lastPos = currentPos;

    if (!hasStrokes) {
      hasStrokes = true;
      const hint = document.getElementById('canvas-hint');
      if (hint) { hint.textContent = '✓ Signature drawn'; hint.style.color = '#16a34a'; }
    }
    signatureData = canvas.toDataURL('image/png');
    updateSignBtn();
  }

  function stopDrawing() {
    if (isDrawing) {
      isDrawing = false;
      if (hasStrokes) {
        signatureData = canvas.toDataURL('image/png');
        updateSignBtn();
      }
    }
  }

  canvas.addEventListener('mousedown', startDrawing);
  window.addEventListener('mousemove', draw);
  window.addEventListener('mouseup', stopDrawing);

  canvas.addEventListener('touchstart', startDrawing, { passive: false });
  window.addEventListener('touchmove', draw, { passive: false });
  window.addEventListener('touchend', stopDrawing);

  function clearCanvas() {
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    hasStrokes = false;
    signatureData = null;
    const hint = document.getElementById('canvas-hint');
    if (hint) { hint.textContent = 'Draw your signature above'; hint.style.color = '#94a3b8'; }
    updateSignBtn();
  }

  // ─── Upload ───────────────────────────────────────────────────────────────
  function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('image/')) { alert('Please upload an image file.'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('File too large. Max 2 MB.'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      signatureData = e.target.result;
      const preview = document.getElementById('upload-preview');
      preview.src = signatureData;
      preview.style.display = 'block';
      document.getElementById('drop-zone').style.display = 'none';
      updateSignBtn();
    };
    reader.readAsDataURL(file);
  }

  const dropZone = document.getElementById('drop-zone');
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = '#6366f1'; });
  dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = '#cbd5e1'; });
  dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.style.borderColor = '#cbd5e1'; if (e.dataTransfer.files[0]) { const dt = new DataTransfer(); dt.items.add(e.dataTransfer.files[0]); document.getElementById('file-input').files = dt.files; handleFileUpload({ target: { files: dt.files } }); } });

  // ─── Tab Switching ────────────────────────────────────────────────────────
  function switchTab(tab) {
    activeTab = tab;
    signatureData = null;
    updateSignBtn();
    ['DRAWN', 'UPLOADED'].forEach((t) => {
      document.getElementById('panel-' + t).style.display = t === tab ? 'block' : 'none';
      document.getElementById('tab-' + t).classList.toggle('active', t === tab);
    });
    if (tab === 'UPLOADED') {
      document.getElementById('upload-preview').style.display = 'none';
      document.getElementById('drop-zone').style.display = 'block';
      document.getElementById('file-input').value = '';
    }
  }

  function updateSignBtn() {
    document.getElementById('sign-btn').disabled = !signatureData;
  }

  // ─── Decline form ─────────────────────────────────────────────────────────
  function showDeclineForm() {
    document.getElementById('sign-section').style.display = 'none';
    document.getElementById('decline-form').style.display = 'block';
  }
  function hideDeclineForm() {
    document.getElementById('sign-section').style.display = 'block';
    document.getElementById('decline-form').style.display = 'none';
  }

  // ─── Submit Signature ─────────────────────────────────────────────────────
  async function submitSignature() {
    if (!signatureData) return;
    const btn = document.getElementById('sign-btn');
    btn.disabled = true; btn.textContent = 'Submitting…';
    try {
      const res = await fetch(API + '/signatures/signer/' + TOKEN + '/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureType: activeTab, signatureData })
      });
      const data = await res.json();
      if (data.status === 'success') {
        showResult('✅', 'Signature Confirmed!', data.message + '<br><br>You will receive a copy of the fully-executed agreement once all signers have completed the process.');
      } else {
        btn.disabled = false; btn.textContent = '✍️ Sign Document';
        alert('Error: ' + (data.message || 'Submission failed.'));
      }
    } catch(e) {
      btn.disabled = false; btn.textContent = '✍️ Sign Document';
      alert('Network error. Please try again.');
    }
  }

  // ─── Submit Decline ───────────────────────────────────────────────────────
  async function submitDecline() {
    const reason = document.getElementById('decline-reason').value.trim();
    try {
      const res = await fetch(API + '/signatures/signer/' + TOKEN + '/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ declineReason: reason || 'Not specified' })
      });
      const data = await res.json();
      if (data.status === 'success') {
        showResult('📝', 'Decline Recorded', 'Your decision has been noted. The assigning lawyer has been notified.');
      } else {
        alert('Error: ' + (data.message || 'Failed.'));
      }
    } catch(e) {
      alert('Network error. Please try again.');
    }
  }

  function showResult(icon, heading, body) {
    document.getElementById('sign-section').style.display = 'none';
    document.getElementById('decline-form').style.display = 'none';
    const msg = document.getElementById('result-msg');
    document.getElementById('result-icon').textContent = icon;
    document.getElementById('result-heading').textContent = heading;
    document.getElementById('result-body').innerHTML = body;
    msg.style.display = 'block';
  }
</script>
</body>
</html>`);
  } catch (err) {
    next(err);
  }
}


/**
 * POST /api/signatures/signer/:token/sign
 * Submits the actual signature. Validates strictly server-side.
 * Body: { signatureType: 'DRAWN'|'UPLOADED'|'DIGITAL_CERTIFICATE', signatureData: '<base64>' }
 */
export async function postSubmitSignature(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.params;
    const { signatureType, signatureData } = req.body;

    if (!signatureType || !['DRAWN', 'UPLOADED', 'DIGITAL_CERTIFICATE'].includes(signatureType)) {
      return res.status(400).json({ status: 'error', message: 'Valid signatureType is required (DRAWN, UPLOADED, or DIGITAL_CERTIFICATE).' });
    }

    if (signatureType !== 'DIGITAL_CERTIFICATE' && !signatureData) {
      return res.status(400).json({ status: 'error', message: 'signatureData is required for DRAWN and UPLOADED signatures.' });
    }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const ua = req.headers['user-agent'] || 'unknown';

    const result = await submitSignature({
      rawToken: token,
      signatureType,
      signatureData: signatureData || 'DIGITAL_CERTIFICATE_PLACEHOLDER',
      ipAddress: ip,
      userAgent: ua,
      deviceInfo: `${ua.substring(0, 200)}`
    });

    return res.status(result.success ? 200 : 400).json({
      status: result.success ? 'success' : 'error',
      message: result.message,
      code: result.code
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/signatures/signer/:token/decline
 * Records a decline. Cancels the signing process.
 * Body: { declineReason?: string }
 */
export async function postDeclineSignature(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.params;
    const { declineReason } = req.body;

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const ua = req.headers['user-agent'] || 'unknown';

    const result = await declineSignature({
      rawToken: token,
      declineReason,
      ipAddress: ip,
      userAgent: ua
    });

    return res.status(result.success ? 200 : 400).json({
      status: result.success ? 'success' : 'error',
      message: result.message,
      code: result.code
    });
  } catch (err) {
    next(err);
  }
}
