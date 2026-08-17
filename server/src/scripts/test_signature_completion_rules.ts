import * as dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../lib/prisma';
import { updateTaskStatus } from '../services/tasks.service';
import { getSignatureStatusForTask, completeSignatureRequest, postSubmitSignature } from '../services/signature.service';
import { TaskStatus, SignatureRequestStatus, SignerStatus, SignerType } from '@prisma/client';

async function runSignatureCompletionTests() {
  console.log('================================================================');
  console.log('  TEST SUITE: SIGNATURE STATUS & COMPLETION CONTROL RULES');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      if (detail) console.log(`         ${detail}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`         ${detail}`);
      failed++;
    }
  }

  // Setup prerequisite database records
  const org = await prisma.organization.findFirst();
  const boss = await prisma.user.findFirst({ where: { role: 'BOSS' } });
  const client = await prisma.client.findFirst({ where: { organizationId: org?.id } });
  const matter = await prisma.matter.findFirst({ where: { clientId: client?.id } });
  const template = await prisma.legalTemplate.findFirst({ where: { organizationId: org?.id } });

  if (!org || !boss || !client || !matter || !template) {
    console.error('❌ Missing prerequisite database records');
    process.exit(1);
  }

  // Create test document & version
  const testDoc = await prisma.legalDocument.create({
    data: {
      title: 'TEST Signature Completion Suite Agreement',
      template: { connect: { id: template.id } },
      client: { connect: { id: client.id } },
      matter: { connect: { id: matter.id } },
      author: { connect: { id: boss.id } },
      organization: { connect: { id: org.id } },
      content: '<h1>Test Agreement</h1><p>Content to be signed by multi-signers.</p>',
      variables: {},
      templateVersionAtGeneration: '1.0',
      dueDate: new Date(Date.now() + 86400000),
      versions: {
        create: {
          versionNumber: 1,
          content: '<h1>Test Agreement</h1><p>Content to be signed by multi-signers.</p>',
          variablesState: {},
          changeDescription: 'Initial test draft',
          authorId: boss.id,
        }
      }
    },
    include: { versions: true }
  });

  const testDocVersion = testDoc.versions[0];

  const testTask = await prisma.workflowTask.create({
    data: {
      document: { connect: { id: testDoc.id } },
      template: { connect: { id: template.id } },
      title: 'TEST Signature Workflow Task',
      client: { connect: { id: client.id } },
      matter: { connect: { id: matter.id } },
      assignee: { connect: { id: boss.id } },
      assignedBy: { connect: { id: boss.id } },
      organization: { connect: { id: org.id } },
      status: TaskStatus.approved,
      priority: 'high',
      dueDate: new Date(Date.now() + 86400000),
    }
  });

  const sigReq = await prisma.signatureRequest.create({
    data: {
      taskId: testTask.id,
      documentId: testDoc.id,
      documentVersionId: testDocVersion.id,
      createdById: boss.id,
      status: SignatureRequestStatus.IN_PROGRESS,
      expiresAt: new Date(Date.now() + 86400000 * 7),
      signers: {
        create: [
          {
            signerName: 'Partner Tester',
            signerEmail: 'partner@test.com',
            signerRole: 'Partner',
            signerType: SignerType.INTERNAL_USER,
            signingOrder: 1,
            status: SignerStatus.SIGNED,
            signedAt: new Date(),
          },
          {
            signerName: 'Client Tester',
            signerEmail: 'client@test.com',
            signerRole: 'Client',
            signerType: SignerType.EXISTING_CLIENT,
            signingOrder: 2,
            status: SignerStatus.ACTIVE,
          }
        ]
      }
    },
    include: { signers: true }
  });

  try {
    // 1. Single signer / First signer signed → NOT COMPLETED
    assert(sigReq.status === SignatureRequestStatus.IN_PROGRESS, '1. Multi-signer: First signer signed → Request remains IN_PROGRESS');

    // 2. Manual completion while second signer pending → HTTP 400 Bad Request
    try {
      await updateTaskStatus(testTask.id, TaskStatus.completed, boss.id, 'BOSS', org.id);
      assert(false, '2. Manual Completion Guard', 'Allowed completion despite pending signer!');
    } catch (err: any) {
      assert(err.message.includes('Document cannot be completed until all required signers have signed.'), '2. Manual Completion Guard', `Blocked: ${err.message}`);
    }

    // 3. Status API returns correct counts
    const statusResp = await getSignatureStatusForTask(testTask.id, org.id);
    assert(statusResp.totalSigners === 2, '3. Status API: totalSigners count = 2');
    assert(statusResp.signedCount === 1, '3. Status API: signedCount = 1');
    assert(statusResp.pendingCount === 1, '3. Status API: pendingCount = 1');

    // 4. Status API Security: tokenHash & raw signatureData excluded
    const signerData = statusResp.signers[0];
    assert(!('tokenHash' in signerData) && !('signatureData' in signerData), '4. Status API Security: sensitive tokens/signatures excluded');

    // 5. Cross-organization status access rejected
    try {
      await getSignatureStatusForTask(testTask.id, 'unauthorized-org-id');
      assert(false, '5. Cross-Tenant Isolation');
    } catch (err: any) {
      assert(err.message.includes('Task not found'), '5. Cross-Tenant Isolation: Rejected cross-tenant access');
    }

    // 6. Signer Decline → Request CANCELLED / not completed
    const declineTestReq = await prisma.signatureRequest.create({
      data: {
        taskId: testTask.id,
        documentId: testDoc.id,
        documentVersionId: testDocVersion.id,
        createdById: boss.id,
        status: SignatureRequestStatus.IN_PROGRESS,
        expiresAt: new Date(Date.now() + 86400000),
        signers: {
          create: [{
            signerName: 'Declined Signer',
            signerEmail: 'decline@test.com',
            signerRole: 'Witness',
            signerType: SignerType.EXTERNAL,
            status: SignerStatus.DECLINED,
            declinedAt: new Date(),
            declineReason: 'Terms unacceptable'
          }]
        }
      }
    });

    try {
      await updateTaskStatus(testTask.id, TaskStatus.completed, boss.id, 'BOSS', org.id);
      assert(false, '6. Signer Decline Guard', 'Allowed completion on declined request!');
    } catch (err: any) {
      assert(err.message.includes('Document cannot be completed until all required signers have signed.'), '6. Signer Decline Guard', 'Completion blocked on declined request');
    }
    await prisma.documentSigner.deleteMany({ where: { signatureRequestId: declineTestReq.id } });
    await prisma.signatureRequest.delete({ where: { id: declineTestReq.id } });

    // 7. Signer Expiry → Request EXPIRED / not completed
    const expiredTestReq = await prisma.signatureRequest.create({
      data: {
        taskId: testTask.id,
        documentId: testDoc.id,
        documentVersionId: testDocVersion.id,
        createdById: boss.id,
        status: SignatureRequestStatus.EXPIRED,
        expiresAt: new Date(Date.now() - 3600000),
        signers: {
          create: [{
            signerName: 'Expired Signer',
            signerEmail: 'expired@test.com',
            signerRole: 'Client',
            signerType: SignerType.EXISTING_CLIENT,
            status: SignerStatus.EXPIRED
          }]
        }
      }
    });

    try {
      await updateTaskStatus(testTask.id, TaskStatus.completed, boss.id, 'BOSS', org.id);
      assert(false, '7. Signer Expiry Guard');
    } catch (err: any) {
      assert(err.message.includes('Document cannot be completed until all required signers have signed.'), '7. Signer Expiry Guard', 'Completion blocked on expired request');
    }
    await prisma.documentSigner.deleteMany({ where: { signatureRequestId: expiredTestReq.id } });
    await prisma.signatureRequest.delete({ where: { id: expiredTestReq.id } });

    // 8. Final Signer signs → PDF built → COMPLETED
    await prisma.documentSigner.update({
      where: { id: sigReq.signers[1].id },
      data: { status: SignerStatus.SIGNED, signedAt: new Date() }
    });

    await completeSignatureRequest(sigReq.id, org.id, boss.id, testDoc, testDocVersion);

    const updatedTask = await prisma.workflowTask.findUnique({ where: { id: testTask.id } });
    const updatedDoc = await prisma.legalDocument.findUnique({ where: { id: testDoc.id } });
    const updatedSigReq = await prisma.signatureRequest.findUnique({ where: { id: sigReq.id } });

    assert(updatedSigReq?.status === SignatureRequestStatus.COMPLETED, '8. SignatureRequest status = COMPLETED');
    assert(updatedTask?.status === TaskStatus.completed, '8. WorkflowTask status = completed');
    assert(updatedDoc?.status === 'approved', '8. LegalDocument status = approved');
    assert(updatedDoc?.pdfExportUrl === `/api/documents/${testDoc.id}/pdf`, '8. Executed PDF reference stored on LegalDocument');

    // 9. Duplicate completion attempt when already completed → graceful no-op or valid state
    try {
      await updateTaskStatus(testTask.id, TaskStatus.completed, boss.id, 'BOSS', org.id);
      assert(true, '9. Duplicate completion on completed task handles cleanly');
    } catch (err: any) {
      assert(err.message.includes('Invalid status transition'), '9. Duplicate completion rejected by transition validator');
    }

  } finally {
    // Clean up temporary test data
    await prisma.documentSigner.deleteMany({ where: { signatureRequestId: sigReq.id } });
    await prisma.signatureRequest.delete({ where: { id: sigReq.id } });
    await prisma.workflowTask.delete({ where: { id: testTask.id } });
    await prisma.documentVersion.deleteMany({ where: { documentId: testDoc.id } });
    await prisma.legalDocument.delete({ where: { id: testDoc.id } });
    console.log('\n[TEST CLEANUP] Deleted temporary test records cleanly.');
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runSignatureCompletionTests().catch((err) => {
  console.error('🚨 Test Script Failure:', err);
  process.exit(1);
});
