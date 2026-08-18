import * as dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../lib/prisma';
import { signAccessToken } from '../utils/tokens';

const API_BASE = 'http://localhost:5000/api';

async function runLiveApplicationVerification() {
  console.log('================================================================');
  console.log('  LEXDRAFT LIVE LOCALHOST APPLICATION VERIFICATION (PHASE 1)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testId: string, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [LIVE PASS] ${testId}: ${testName}`);
      if (detail) console.log(`              ${detail}`);
      passed++;
    } else {
      console.error(`❌ [LIVE FAIL] ${testId}: ${testName}`);
      if (detail) console.error(`              ${detail}`);
      failed++;
    }
  }

  try {
    // ── STEP 0: FETCH LIVE BOSS USER & AUTHENTICATE ──
    const bossUser = await prisma.user.findFirst({ where: { role: 'BOSS' } });
    if (!bossUser) throw new Error('No BOSS user found in database');

    console.log(`🔹 Authenticating Live Partner User: ${bossUser.email}...`);

    const token = signAccessToken({
      userId: bossUser.id,
      email: bossUser.email,
      name: bossUser.name,
      role: 'BOSS',
      organizationId: bossUser.organizationId
    });

    assert(token !== '', 'AUTH', 'Partner Authentication Successful', `User: ${bossUser.name} (${bossUser.email})`);

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // Fetch live workspace records
    const orgId = bossUser.organizationId;
    const doc = await prisma.legalDocument.findFirst({ where: { organizationId: orgId } });
    const task = await prisma.workflowTask.findFirst({ where: { organizationId: orgId, documentId: doc?.id } });
    const employee = await prisma.user.findFirst({ where: { role: 'EMPLOYEE', organizationId: orgId } });
    const client = await prisma.client.findFirst({ where: { organizationId: orgId } });

    if (!doc || !task || !employee || !client) {
      throw new Error('Prerequisite live records missing in local database');
    }

    // Clean prior test signature requests for clean execution
    const preReqs = await prisma.signatureRequest.findMany({ where: { documentId: doc.id } });
    for (const r of preReqs) {
      await prisma.documentSigner.deleteMany({ where: { signatureRequestId: r.id } });
      await prisma.signatureRequest.delete({ where: { id: r.id } });
    }

    // ── LIVE TEST 1: START SIGNING & CHECK STATUS ──
    console.log('\n--- LIVE TEST 1: START SIGNING & CHECK STATUS ---');
    const startRes = await fetch(`${API_BASE}/signatures/request`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        taskId: task.id,
        documentId: doc.id,
        signers: [
          { signerName: bossUser.name, signerEmail: bossUser.email, signerRole: 'Senior Partner', signerType: 'INTERNAL_USER', signingOrder: 1, userId: bossUser.id },
          { signerName: 'test-old@example.com', signerEmail: 'test-old@example.com', signerRole: 'Associate Lawyer', signerType: 'INTERNAL_USER', signingOrder: 2, userId: employee.id },
          { signerName: client.name, signerEmail: client.contactEmail || 'client@apexlegal.in', signerRole: 'Client Signer', signerType: 'EXISTING_CLIENT', signingOrder: 3, clientId: client.id }
        ]
      })
    });

    const startData = await startRes.json() as any;
    assert(startRes.status === 201, 'LT1-A', 'POST /api/signatures/request -> 201 Created');
    const sigReqId = startData.data.signatureRequestId;

    // Fetch read-only live status via GET /api/signatures/document/:documentId endpoint (used by WorkflowKanban)
    const docStatusRes = await fetch(`${API_BASE}/signatures/document/${doc.id}`, { headers: authHeaders });
    const docStatusJson = await docStatusRes.json() as any;
    const sigReq = docStatusJson.data?.signatureRequest;

    assert(docStatusRes.status === 200 && sigReq !== null && sigReq !== undefined, 'LT1-B', 'GET /api/signatures/document/:documentId -> 200 OK & returns active SignatureRequest');
    assert(sigReq.signers?.length === 3, 'LT1-C', 'Total Signers = 3');
    assert(sigReq.status === 'PENDING' || sigReq.status === 'IN_PROGRESS', 'LT1-D', 'SignatureRequest Status = PENDING / IN_PROGRESS');

    // Clean up test records
    await prisma.documentSigner.deleteMany({ where: { signatureRequestId: sigReqId } });
    await prisma.signatureRequest.delete({ where: { id: sigReqId } });

  } catch (err: any) {
    console.error('❌ Live Application Verification Exception:', err.message || err);
    failed++;
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`TOTAL LIVE TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runLiveApplicationVerification().catch((err) => {
  console.error('🚨 Live Verification Script Failure:', err);
  process.exit(1);
});
