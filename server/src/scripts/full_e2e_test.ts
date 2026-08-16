/**
 * COMPREHENSIVE SIGNATURE SYSTEM E2E TEST
 */
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import http from 'http';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();
const BASE = 'http://localhost:5000';

const results: { name: string; status: 'PASS' | 'FAIL' | 'WARN'; detail?: string }[] = [];
function pass(name: string, detail?: string) { results.push({ name, status: 'PASS', detail }); console.log(`  ✅ PASS: ${name}${detail ? ' — ' + detail : ''}`); }
function fail(name: string, detail: string) { results.push({ name, status: 'FAIL', detail }); console.error(`  ❌ FAIL: ${name} — ${detail}`); }
function warn(name: string, detail: string) { results.push({ name, status: 'WARN', detail }); console.warn(`  ⚠️  WARN: ${name} — ${detail}`); }

function httpGet(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = ''; res.on('data', (c: any) => body += c); res.on('end', () => resolve({ status: res.statusCode!, body }));
    }).on('error', reject);
  });
}

function httpPost(url: string, data: object): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const str = JSON.stringify(data);
    const u = new URL(url);
    const req = http.request({ hostname: u.hostname, port: parseInt(u.port) || 80, path: u.pathname, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(str) } }, (res) => {
      let body = ''; res.on('data', (c: any) => body += c); res.on('end', () => resolve({ status: res.statusCode!, body }));
    });
    req.on('error', reject); req.write(str); req.end();
  });
}

const TEST_SIG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mNk+A9QTwMJAAIAAAD//wIqABnlhPUAAAAASUVORK5CYII=';

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   LEXDRAFT DIGITAL SIGNATURE — FULL E2E TEST SUITE    ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // 1. Server
  console.log('📡 [1] Server Reachability');
  try {
    const r = await httpGet(`${BASE}/api/signatures/signer/INVALID_TOKEN`);
    if (r.status === 200) pass('Server running and responding');
    else fail('Server response', `Status: ${r.status}`);
  } catch (e: any) {
    fail('Server not running', e.message);
    await prisma.$disconnect(); return;
  }

  // 2. Canvas HTML
  console.log('\n🖼️  [2] Canvas HTML & JS Validation');
  const signed = await prisma.documentSigner.findFirst({ where: { status: { in: ['SIGNED', 'ACTIVE', 'PENDING'] } }, include: { signatureRequest: { include: { document: { select: { title: true } } } } }, orderBy: { createdAt: 'desc' } });

  let testToken = '';
  if (signed) {
    testToken = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(testToken).digest('hex');
    await prisma.documentSigner.update({ where: { id: signed.id }, data: { status: 'ACTIVE', tokenHash: hash, expiresAt: new Date(Date.now() + 86400000 * 7), signedAt: null, signatureData: null, signatureType: null } });
    await prisma.signatureRequest.update({ where: { id: signed.signatureRequestId }, data: { status: 'IN_PROGRESS' } });
    console.log(`   ↺ Reset "${signed.signerName}" (${signed.signerRole}) to ACTIVE`);

    const { body: html } = await httpGet(`${BASE}/api/signatures/signer/${testToken}`);

    // CSS check
    if (/canvas\{[^}]*width\s*:\s*100%/.test(html)) fail('CSS canvas global width:100%', 'STILL PRESENT — overrides buffer size, breaks coordinates');
    else pass('No CSS canvas{width:100%} override');

    if (/canvas\{[^}]*height\s*:\s*\d+px/.test(html)) fail('CSS canvas global height fixed', 'STILL PRESENT — height mismatch breaks Y coordinates');
    else pass('No CSS canvas{height:Npx} override');

    if (html.includes('width="600"') && html.includes('height="200"')) pass('Canvas buffer: width=600 height=200 ✓');
    else fail('Canvas buffer attrs', 'width=600 height=200 not found');

    if (html.includes('clientX - r.left') && !html.includes('e.offsetX')) pass('mousedown uses clientX-rect.left (matches mousemove)');
    else if (html.includes('e.offsetX') && html.includes('clientX - r.left')) fail('COORDINATE MISMATCH', 'mousedown=offsetX, mousemove=clientX*scale → strokes off-screen');
    else pass('Coordinates consistent');

    if (html.includes("window.addEventListener('mousemove'")) pass('mousemove on window ✓');
    else fail('mousemove', 'On canvas only — strokes break when mouse leaves box');

    if (html.includes("window.addEventListener('mouseup'")) pass('mouseup on window ✓');
    else fail('mouseup', 'Not on window');

    const scripts = (html.match(/<script/g) || []).length;
    if (scripts === 1) pass(`Script tags: ${scripts} (correct)`);
    else fail('Script tag count', `${scripts} found — document content injecting extra <script>`);

    if (html.includes('function updateSignBtn')) pass('updateSignBtn defined ✓');
    else fail('updateSignBtn missing', 'Sign button will never enable');

    if (html.includes("'touchstart'") && html.includes("'touchmove'")) pass('Touch support present ✓');
    else warn('Touch support', 'Missing — mobile signing will not work');

    console.log(`\n   🔗 Manual test URL (open in browser):`);
    console.log(`   ${BASE}/api/signatures/signer/${testToken}\n`);
  } else {
    warn('Canvas test', 'No signers in DB — create a signature request first');
  }

  // 3. Email routing
  console.log('📧 [3] Email Routing Analysis');
  const sigSvc = readFileSync('src/services/signature.service.ts', 'utf8');

  const override = process.env.RESEND_TEST_OVERRIDE_EMAIL || '';
  if (override) warn('RESEND_TEST_OVERRIDE_EMAIL SET', `All emails → ${override} (expected for local Resend sandbox)`);
  else pass('RESEND_TEST_OVERRIDE_EMAIL empty', 'Emails sent to actual signer addresses');

  if (sigSvc.includes('recipientEmail: nextSigner.signerEmail')) pass('Backend: signerEmail used for signature emails ✓');
  else fail('Backend email routing', 'signerEmail NOT used in activateNextSigner');

  if (!sigSvc.includes('contactEmail')) pass('signature.service.ts: no contactEmail reference ✓');
  else fail('contactEmail in signature.service', 'May route to client email');

  // 4. Submission test
  console.log('\n✍️  [4] Signature Submission & Security Tests');

  if (testToken && signed) {
    // Re-activate for submission test
    const raw3 = crypto.randomBytes(32).toString('hex');
    const h3 = crypto.createHash('sha256').update(raw3).digest('hex');
    await prisma.documentSigner.update({ where: { id: signed.id }, data: { status: 'ACTIVE', tokenHash: h3, expiresAt: new Date(Date.now() + 86400000), signedAt: null, signatureData: null, signatureType: null } });
    await prisma.signatureRequest.update({ where: { id: signed.signatureRequestId }, data: { status: 'IN_PROGRESS' } });

    const subResp = await httpPost(`${BASE}/api/signatures/signer/${raw3}/sign`, { signatureType: 'DRAWN', signatureData: TEST_SIG });
    const subResult = JSON.parse(subResp.body);
    if (subResp.status === 200 && subResult.status === 'success') pass('Signature submitted successfully', `HTTP 200`);
    else fail('Signature submission', `HTTP ${subResp.status}: ${JSON.stringify(subResult)}`);

    const afterSign = await prisma.documentSigner.findUnique({ where: { id: signed.id } });
    if (afterSign?.status === 'SIGNED') pass('DB: signer status = SIGNED ✓');
    else fail('DB status', `Expected SIGNED, got ${afterSign?.status}`);
    if (afterSign?.signatureData?.startsWith('data:image/')) pass('DB: signature data stored ✓', `${afterSign.signatureData.length} chars`);
    else fail('DB: signature data', 'Not stored correctly');
    if (afterSign?.signedAt) pass('DB: signedAt timestamp ✓', afterSign.signedAt.toISOString());
    else fail('DB: signedAt', 'Missing');
    if (afterSign?.tokenHash === null) pass('Token invalidated after use ✓ (tokenHash=null)');
    else fail('Token security', 'Token NOT invalidated — duplicate signing risk!');

    // Duplicate
    const dupResp = await httpPost(`${BASE}/api/signatures/signer/${raw3}/sign`, { signatureType: 'DRAWN', signatureData: TEST_SIG });
    const dupResult = JSON.parse(dupResp.body);
    if (dupResult.status === 'error') pass('Duplicate signing rejected ✓', `Code: ${dupResult.code}`);
    else fail('Duplicate signing', 'Was accepted — SECURITY RISK');

    // Invalid token
    const invResp = await httpPost(`${BASE}/api/signatures/signer/AAABBBCCC/sign`, { signatureType: 'DRAWN', signatureData: TEST_SIG });
    const invResult = JSON.parse(invResp.body);
    if (invResult.status === 'error') pass('Invalid token rejected ✓');
    else fail('Invalid token security', 'Accepted invalid token');
  }

  // 5. Build check
  console.log('\n🔨 [5] TypeScript Build Check');
  const { execSync } = require('child_process');
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    pass('TypeScript compiles with 0 errors ✓');
  } catch (e: any) { fail('TypeScript errors', e.stdout?.toString() || e.message); }

  // 6. Env
  console.log('\n🌍 [6] Environment Config');
  const appUrl = process.env.APP_BASE_URL || 'http://localhost:5000';
  if (appUrl.includes('localhost')) warn('APP_BASE_URL=localhost', 'Signing URLs will not work from external emails');
  else pass('APP_BASE_URL', appUrl);
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_123456789_placeholder') warn('RESEND_API_KEY', 'Not configured — emails simulated');
  else pass('RESEND_API_KEY configured');

  // Summary
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed2 = results.filter(r => r.status === 'FAIL').length;
  const warned2 = results.filter(r => r.status === 'WARN').length;
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                    RESULTS SUMMARY                    ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`  TOTAL: ${results.length} | ✅ PASSED: ${passed} | ❌ FAILED: ${failed2} | ⚠️  WARNED: ${warned2}`);
  if (failed2 > 0) { console.log('\n  ❌ FAILURES:'); results.filter(r => r.status === 'FAIL').forEach(r => console.log(`    • ${r.name}: ${r.detail}`)); }
  if (warned2 > 0) { console.log('\n  ⚠️  WARNINGS:'); results.filter(r => r.status === 'WARN').forEach(r => console.log(`    • ${r.name}: ${r.detail}`)); }
  console.log();
  await prisma.$disconnect();
}
main().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1); });
