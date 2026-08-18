import * as dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../lib/prisma';
import { createSignatureRequest, getSignatureStatusForTask, submitSignature } from '../services/signature.service';
import crypto from 'crypto';

async function runPhase1KanbanTestSuite() {
  console.log('================================================================');
  console.log('  LEXDRAFT PHASE 1: WORKFLOW KANBAN SIGNING BUTTON & STATUS TESTS');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testId: string, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testId}: ${testName}`);
      if (detail) console.log(`         ${detail}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testId}: ${testName}`);
      if (detail) console.error(`         ${detail}`);
      failed++;
    }
  }

  const org = await prisma.organization.findFirst();
  const boss = await prisma.user.findFirst({ where: { role: 'BOSS', organizationId: org?.id } });
  const employee = await prisma.user.findFirst({ where: { role: 'EMPLOYEE', organizationId: org?.id } });
  const client = await prisma.client.findFirst({ where: { organizationId: org?.id } });
  const doc = await prisma.legalDocument.findFirst({ where: { organizationId: org?.id } });
  const task = await prisma.workflowTask.findFirst({ where: { organizationId: org?.id, documentId: doc?.id } });

  if (!org || !boss || !employee || !client || !doc || !task) {
    console.error('❌ Missing prerequisite database records for Phase 1 test execution');
    process.exit(1);
  }

  // Pre-test cleanup: remove prior signature requests for this test document
  const preExistingReqs = await prisma.signatureRequest.findMany({ where: { documentId: doc.id } });
  for (const r of preExistingReqs) {
    await prisma.documentSigner.deleteMany({ where: { signatureRequestId: r.id } });
    await prisma.signatureRequest.delete({ where: { id: r.id } });
  }

  try {
    // TEST 1: Task with document + no SignatureRequest -> Start Signing state
    const initialStatus = await getSignatureStatusForTask(task.id, org.id);
    assert(initialStatus.hasRequest === false, 'TEST 1', 'Task initially has no active SignatureRequest -> [ Start Signing Process ] button state');

    // TEST 2: Start Signing Process succeeds -> SignatureRequest created
    const signersInput = [
      { signerName: boss.name, signerEmail: boss.email, signerRole: 'Senior Partner', signerType: 'INTERNAL_USER' as const, signingOrder: 1, userId: boss.id },
      { signerName: 'Associate Lawyer', signerEmail: employee.email, signerRole: 'Associate Lawyer', signerType: 'INTERNAL_USER' as const, signingOrder: 2, userId: employee.id },
      { signerName: client.name, signerEmail: client.contactEmail || 'client@apexlegal.in', signerRole: 'Client Signer', signerType: 'EXISTING_CLIENT' as const, signingOrder: 3, clientId: client.id }
    ];

    const sigReq = await createSignatureRequest({
      taskId: task.id,
      documentId: doc.id,
      requestingUserId: boss.id,
      requestingUserRole: 'BOSS',
      organizationId: org.id,
      signers: signersInput
    });
    assert(sigReq !== undefined && sigReq.id !== undefined, 'TEST 2', 'Start Signing Process -> SignatureRequest created successfully');

    // TEST 3: After creation -> Button state becomes Check Status
    const statusAfterCreate = await getSignatureStatusForTask(task.id, org.id);
    assert(statusAfterCreate.hasRequest === true && (statusAfterCreate.requestStatus === 'PENDING' || statusAfterCreate.requestStatus === 'IN_PROGRESS'), 'TEST 3', 'After creation -> SignatureRequest status is IN_PROGRESS -> [ Check Status ] button state');

    // TEST 4: Page refresh / re-query -> SignatureRequest persisted and found
    const reQueriedReq = await prisma.signatureRequest.findFirst({
      where: { documentId: doc.id, status: { in: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] } },
      include: { signers: { orderBy: { signingOrder: 'asc' } } }
    });
    assert(reQueriedReq !== null && reQueriedReq.id === sigReq.id, 'TEST 4', 'Survives page refresh / re-query -> Backend SignatureRequest found');

    // TEST 5 & 6: Real SignatureRequest found with total signers & 3 signers created
    assert(statusAfterCreate.totalSigners === 3, 'TEST 5', 'Total signers count = 3');
    assert(statusAfterCreate.signers.length === 3, 'TEST 6', 'All 3 signers appear in signer list');

    // TEST 7: Initial sequence -> Signer 1 ACTIVE, Signer 2 PENDING, Signer 3 PENDING
    const s1 = statusAfterCreate.signers.find((s: any) => s.signingOrder === 1);
    const s2 = statusAfterCreate.signers.find((s: any) => s.signingOrder === 2);
    const s3 = statusAfterCreate.signers.find((s: any) => s.signingOrder === 3);

    assert(s1?.status === 'ACTIVE', 'TEST 7-A', 'Signer 1 (Order 1) initial status = ACTIVE');
    assert(s2?.status === 'PENDING', 'TEST 7-B', 'Signer 2 (Order 2) initial status = PENDING');
    assert(s3?.status === 'PENDING', 'TEST 7-C', 'Signer 3 (Order 3) initial status = PENDING');

    // TEST 8: Signer 1 signs -> 1 / 3 SIGNED, Signer 2 ACTIVE, Signer 3 PENDING
    const raw1 = crypto.randomBytes(32).toString('hex');
    const hash1 = crypto.createHash('sha256').update(raw1).digest('hex');
    await prisma.documentSigner.update({ where: { id: s1.id }, data: { tokenHash: hash1, status: 'ACTIVE' } });
    await submitSignature({ rawToken: raw1, signatureType: 'DRAWN', signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', ipAddress: '127.0.0.1', userAgent: 'Phase1 Test Runner' });

    const statusAfter1 = await getSignatureStatusForTask(task.id, org.id);
    const s1_after1 = statusAfter1.signers.find((s: any) => s.signingOrder === 1);
    const s2_after1 = statusAfter1.signers.find((s: any) => s.signingOrder === 2);
    const s3_after1 = statusAfter1.signers.find((s: any) => s.signingOrder === 3);

    assert(statusAfter1.signedCount === 1, 'TEST 8-A', 'Signed count = 1 / 3 SIGNED');
    assert(s1_after1?.status === 'SIGNED', 'TEST 8-B', 'Signer 1 status = SIGNED');
    assert(s2_after1?.status === 'ACTIVE', 'TEST 8-C', 'Signer 2 status = ACTIVE');
    assert(s3_after1?.status === 'PENDING', 'TEST 8-D', 'Signer 3 status = PENDING');

    // TEST 9: Signer 2 signs -> 2 / 3 SIGNED, Signer 3 ACTIVE
    const raw2 = crypto.randomBytes(32).toString('hex');
    const hash2 = crypto.createHash('sha256').update(raw2).digest('hex');
    await prisma.documentSigner.update({ where: { id: s2.id }, data: { tokenHash: hash2, status: 'ACTIVE' } });
    await submitSignature({ rawToken: raw2, signatureType: 'DRAWN', signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', ipAddress: '127.0.0.1', userAgent: 'Phase1 Test Runner' });

    const statusAfter2 = await getSignatureStatusForTask(task.id, org.id);
    const s2_after2 = statusAfter2.signers.find((s: any) => s.signingOrder === 2);
    const s3_after2 = statusAfter2.signers.find((s: any) => s.signingOrder === 3);

    assert(statusAfter2.signedCount === 2, 'TEST 9-A', 'Signed count = 2 / 3 SIGNED');
    assert(s2_after2?.status === 'SIGNED', 'TEST 9-B', 'Signer 2 status = SIGNED');
    assert(s3_after2?.status === 'ACTIVE', 'TEST 9-C', 'Signer 3 status = ACTIVE');

    // TEST 10: Signer 3 signs -> 3 / 3 SIGNED, requestStatus = COMPLETED
    const raw3 = crypto.randomBytes(32).toString('hex');
    const hash3 = crypto.createHash('sha256').update(raw3).digest('hex');
    await prisma.documentSigner.update({ where: { id: s3.id }, data: { tokenHash: hash3, status: 'ACTIVE' } });
    await submitSignature({ rawToken: raw3, signatureType: 'DRAWN', signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', ipAddress: '127.0.0.1', userAgent: 'Phase1 Test Runner' });

    const finalStatus = await getSignatureStatusForTask(task.id, org.id);
    assert(finalStatus.signedCount === 3 && finalStatus.requestStatus === 'COMPLETED', 'TEST 10', 'All signers signed -> 3 / 3 SIGNED and SignatureRequest COMPLETED');

    // Clean up test records
    await prisma.documentSigner.deleteMany({ where: { signatureRequestId: sigReq.id } });
    await prisma.signatureRequest.delete({ where: { id: sigReq.id } });

  } catch (err: any) {
    console.error('❌ Phase 1 Test Suite Exception:', err);
    failed++;
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`TOTAL PHASE 1 TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runPhase1KanbanTestSuite().catch((err) => {
  console.error('🚨 Phase 1 Test Suite Failure:', err);
  process.exit(1);
});
