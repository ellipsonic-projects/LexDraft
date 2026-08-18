import * as dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  createSignatureRequest, 
  submitSignature, 
  getSignatureStatusForTask 
} from '../services/signature.service';
import { SignerStatus, SignatureRequestStatus, DocumentStatus, TaskStatus } from '@prisma/client';

async function runCompleteWorkflowIntegrationTest() {
  console.log('================================================================');
  console.log('  LEXDRAFT SIGNING WORKFLOW: PRODUCTION INTEGRATION TEST SUITE');
  console.log('================================================================\n');

  // 1. Setup Isolated Temporary Test Records
  console.log('🔹 Setting up temporary isolated test records...');
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error('❌ Organization record required in database to run tests.');
    process.exit(1);
  }

  const bossUser = await prisma.user.findFirst({ where: { role: 'BOSS', organizationId: org.id } });
  if (!bossUser) {
    console.error('❌ Senior Partner (BOSS) user record required to run tests.');
    process.exit(1);
  }

  const testSuffix = crypto.randomBytes(4).toString('hex');
  const client = await prisma.client.create({
    data: {
      name: `Test Client ${testSuffix}`,
      contactEmail: `client-${testSuffix}@example.com`,
      contactPhone: '9999999999',
      organizationId: org.id
    }
  });

  const matter = await prisma.matter.create({
    data: {
      title: `Test Matter ${testSuffix}`,
      matterCode: `MAT-${testSuffix.toUpperCase()}`,
      clientId: client.id
    }
  });

  const doc = await prisma.legalDocument.create({
    data: {
      title: `Verification Agreement ${testSuffix}`,
      templateId: 'tpl_house_rental',
      clientId: client.id,
      matterId: matter.id,
      authorId: bossUser.id,
      status: DocumentStatus.approved, // APPROVED = ready to begin signing
      content: `
        <div class="page">
          <h1>TEST RENTAL AGREEMENT</h1>
          <div class="execution">
            <p class="exec-heading"><strong>IN WITNESS WHEREOF</strong>, the Parties have executed this Agreement by affixing their signatures below.</p>
            <div class="sig-row">
              <div class="sig-col">
                <div class="sig-line"></div>
                <p class="sig-role">Witness 1 &mdash; Name: _______________________</p>
                <p class="sig-role">Address: ________________________________</p>
              </div>
            </div>
          </div>
        </div>
      `,
      variables: {},
      templateVersionAtGeneration: '1.0',
      dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      organizationId: org.id
    }
  });

  const docVersion = await prisma.documentVersion.create({
    data: {
      documentId: doc.id,
      versionNumber: 1,
      content: doc.content,
      variablesState: {},
      changeDescription: 'Initial Approved Draft',
      authorId: bossUser.id
    }
  });

  const task = await prisma.workflowTask.create({
    data: {
      documentId: doc.id,
      templateId: 'tpl_house_rental', // reuse standard rental template key
      title: `Signing Workflow Task ${testSuffix}`,
      clientId: client.id,
      matterId: matter.id,
      assigneeId: bossUser.id,
      assignedById: bossUser.id,
      status: TaskStatus.approved, // TaskStatus.approved corresponds to ready for signing
      dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      organizationId: org.id
    }
  });

  let testPassed = true;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      if (details) console.log(`         ${details}`);
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (details) console.error(`         ${details}`);
      testPassed = false;
    }
  }

  try {
    // 2. Test 1: Task shows Start Signing Process button state (hasRequest === false)
    const initialStatus = await getSignatureStatusForTask(task.id, org.id);
    assert(!initialStatus.hasRequest, 'Step 1: Unstarted task shows "Start Signing Process"', `hasRequest: ${initialStatus.hasRequest}`);

    // 3. Test 2: Starting signing creates SignatureRequest
    console.log('\n🔹 Starting signing process...');
    const sigReq = await createSignatureRequest({
      taskId: task.id,
      documentId: doc.id,
      requestingUserId: bossUser.id,
      requestingUserRole: 'BOSS',
      organizationId: org.id,
      signers: [
        { signerName: 'Partner Rajesh', signerEmail: 'partner@apexlegal.in', signerRole: 'Landlord', signerType: 'INTERNAL_USER', userId: bossUser.id, signingOrder: 1 },
        { signerName: 'Tenant Aarav', signerEmail: 'aarav@mehtapremises.com', signerRole: 'Tenant', signerType: 'EXTERNAL', signingOrder: 2 },
        { signerName: 'Witness Priya', signerEmail: 'priya@example.com', signerRole: 'Witness', signerType: 'EXTERNAL', signingOrder: 3 }
      ]
    });

    assert(sigReq !== null, 'Step 2: SignatureRequest successfully created', `ID: ${sigReq?.id}`);

    // 4. Test 3: Button changes to Check Status (hasRequest === true)
    const activeStatus = await getSignatureStatusForTask(task.id, org.id);
    assert(activeStatus.hasRequest === true, 'Step 3: Button state changes to "Check Status"', `Status: ${activeStatus.requestStatus}`);
    assert(activeStatus.signedCount === 0 && activeStatus.totalSigners === 3, 'Step 4: Real-time progress displays correct total counts', `Progress: ${activeStatus.signedCount}/${activeStatus.totalSigners}`);

    // 5. Test 5: Verify sequential statuses (Signer 1 is ACTIVE, others PENDING)
    let signers = await prisma.documentSigner.findMany({
      where: { signatureRequestId: sigReq.id },
      orderBy: { signingOrder: 'asc' }
    });
    assert(signers[0].status === SignerStatus.ACTIVE, 'Step 5: Signer 1 is initially ACTIVE', `Signer 1 status: ${signers[0].status}`);
    assert(signers[1].status === SignerStatus.PENDING, 'Step 6: Signer 2 is initially PENDING', `Signer 2 status: ${signers[1].status}`);
    assert(signers[2].status === SignerStatus.PENDING, 'Step 7: Signer 3 is initially PENDING', `Signer 3 status: ${signers[2].status}`);

    const dummySig = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    // 6. Test 6: Signer 1 signs -> updates progress to 1/3
    console.log('\n🔹 Signer 1 signs...');
    const rawToken1 = crypto.randomBytes(32).toString('hex');
    const hashToken1 = crypto.createHash('sha256').update(rawToken1).digest('hex');
    await prisma.documentSigner.update({ where: { id: signers[0].id }, data: { tokenHash: hashToken1 } });

    await submitSignature({
      rawToken: rawToken1,
      signatureType: 'DRAWN',
      signatureData: dummySig,
      ipAddress: '127.0.0.1',
      userAgent: 'TestBrowser'
    });

    const progress1 = await getSignatureStatusForTask(task.id, org.id);
    assert(progress1.signedCount === 1, 'Step 8: Signer 1 signing updates progress to 1/3', `Progress: ${progress1.signedCount}/${progress1.totalSigners}`);

    signers = await prisma.documentSigner.findMany({
      where: { signatureRequestId: sigReq.id },
      orderBy: { signingOrder: 'asc' }
    });
    assert(signers[1].status === SignerStatus.ACTIVE, 'Step 9: Signer 2 successfully promoted to ACTIVE status', `Signer 2 status: ${signers[1].status}`);

    // 7. Test 7: Signer 2 signs -> updates progress to 2/3
    console.log('\n🔹 Signer 2 signs...');
    const rawToken2 = crypto.randomBytes(32).toString('hex');
    const hashToken2 = crypto.createHash('sha256').update(rawToken2).digest('hex');
    await prisma.documentSigner.update({ where: { id: signers[1].id }, data: { tokenHash: hashToken2 } });

    await submitSignature({
      rawToken: rawToken2,
      signatureType: 'DRAWN',
      signatureData: dummySig,
      ipAddress: '127.0.0.1',
      userAgent: 'TestBrowser'
    });

    const progress2 = await getSignatureStatusForTask(task.id, org.id);
    assert(progress2.signedCount === 2, 'Step 10: Signer 2 signing updates progress to 2/3', `Progress: ${progress2.signedCount}/${progress2.totalSigners}`);

    signers = await prisma.documentSigner.findMany({
      where: { signatureRequestId: sigReq.id },
      orderBy: { signingOrder: 'asc' }
    });
    assert(signers[2].status === SignerStatus.ACTIVE, 'Step 11: Signer 3 promoted to ACTIVE status', `Signer 3 status: ${signers[2].status}`);

    // 8. Test 8: Final signer signs -> triggers dynamic PDF compilation, storage, email, and task completion
    console.log('\n🔹 Final signer signs...');
    const rawToken3 = crypto.randomBytes(32).toString('hex');
    const hashToken3 = crypto.createHash('sha256').update(rawToken3).digest('hex');
    await prisma.documentSigner.update({ where: { id: signers[2].id }, data: { tokenHash: hashToken3 } });

    await submitSignature({
      rawToken: rawToken3,
      signatureType: 'DRAWN',
      signatureData: dummySig,
      ipAddress: '127.0.0.1',
      userAgent: 'TestBrowser'
    });

    // 9. Verify completion DB statuses
    const updatedSigReq = await prisma.signatureRequest.findUnique({ where: { id: sigReq.id } });
    assert(updatedSigReq?.status === SignatureRequestStatus.COMPLETED, 'Step 12: SignatureRequest status marked as COMPLETED', `Status: ${updatedSigReq?.status}`);

    const updatedDoc = await prisma.legalDocument.findUnique({ where: { id: doc.id } });
    assert(updatedDoc?.status === DocumentStatus.approved, 'Step 13: LegalDocument remains in approved (sealed) status', `Status: ${updatedDoc?.status}`);
    assert(updatedDoc?.pdfExportUrl !== null, 'Step 14: LegalDocument contains dynamic pdfExportUrl path reference', `pdfExportUrl: ${updatedDoc?.pdfExportUrl}`);

    const updatedTask = await prisma.workflowTask.findUnique({ where: { id: task.id } });
    assert(updatedTask?.status === TaskStatus.completed, 'Step 15: WorkflowTask is marked as completed', `Task Status: ${updatedTask?.status}`);

    // 10. Verify PDF generated and stored on disk
    const expectedDiskPath = path.join(__dirname, '..', '..', 'exports', `doc_${doc.id}_sealed.pdf`);
    const fileExists = fs.existsSync(expectedDiskPath);
    assert(fileExists, 'Step 16: Final signed A4 PDF document successfully saved to local storage folder on disk', `Path: ${expectedDiskPath}`);
    if (fileExists) {
      const stats = fs.statSync(expectedDiskPath);
      assert(stats.size > 0, 'Step 17: Generated PDF file has valid non-zero size', `Size: ${stats.size} bytes`);
    }

    // 11. Verify activity logs are recorded
    const logs = await prisma.activityLog.findMany({
      where: { entityId: doc.id },
      orderBy: { timestamp: 'asc' }
    });
    
    const actions = logs.map(l => l.action);
    assert(actions.includes('SIGNATURE_COMPLETED'), 'Step 18: SIGNATURE_COMPLETED activity log exists');
    assert(actions.includes('FINAL_SIGNED_PDF_CREATED'), 'Step 19: FINAL_SIGNED_PDF_CREATED activity log exists');
    assert(actions.includes('FINAL_SIGNED_DOCUMENT_STORED'), 'Step 20: FINAL_SIGNED_DOCUMENT_STORED activity log exists');

    // 12. Test 19: Verify duplicate creation is prevented
    console.log('\n🔹 Verifying duplicate signature request creation prevention...');
    let duplicateThrown = false;
    try {
      await createSignatureRequest({
        taskId: task.id,
        documentId: doc.id,
        requestingUserId: bossUser.id,
        requestingUserRole: 'BOSS',
        organizationId: org.id,
        signers: [
          { signerName: 'Duplicate Signer', signerEmail: 'dup@example.com', signerRole: 'Witness', signerType: 'EXTERNAL', signingOrder: 1 }
        ]
      });
    } catch (e) {
      duplicateThrown = true;
    }
    assert(duplicateThrown, 'Step 21: Creating new signing request on completed/sealed document is blocked', `Blocked correctly: ${duplicateThrown}`);

  } catch (error) {
    console.error('❌ Unexpected error occurred during integration test execution:', error);
    testPassed = false;
  } finally {
    // 13. Clean up Database Test Records
    console.log('\n🔹 Cleaning up temporary database records...');
    const reqs = await prisma.signatureRequest.findMany({ where: { documentId: doc.id } });
    for (const r of reqs) {
      await prisma.documentSigner.deleteMany({ where: { signatureRequestId: r.id } });
      await prisma.signatureRequest.delete({ where: { id: r.id } });
    }
    await prisma.workflowTask.delete({ where: { id: task.id } });
    await prisma.documentVersion.delete({ where: { id: docVersion.id } });
    await prisma.legalDocument.delete({ where: { id: doc.id } });
    await prisma.matter.delete({ where: { id: matter.id } });
    await prisma.client.delete({ where: { id: client.id } });

    // Clean up temporary PDF file on disk
    const testPdfPath = path.join(__dirname, '..', '..', 'exports', `doc_${doc.id}_sealed.pdf`);
    if (fs.existsSync(testPdfPath)) {
      fs.unlinkSync(testPdfPath);
      console.log('🔹 Temporary test PDF removed from exports folder.');
    }

    if (testPassed) {
      console.log('\n================================================================');
      console.log('✅ ALL PRODUCTION INTEGRATION WORKFLOW TESTS PASSED');
      console.log('================================================================\n');
      process.exit(0);
    } else {
      console.error('\n================================================================');
      console.error('❌ SOME INTEGRATION TESTS FAILED');
      console.error('================================================================\n');
      process.exit(1);
    }
  }
}

runCompleteWorkflowIntegrationTest().catch(console.error);
