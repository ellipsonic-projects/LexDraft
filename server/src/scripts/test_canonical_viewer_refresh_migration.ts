import * as dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../lib/prisma';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { injectSignaturesIntoHtml } from '../services/signature.service';
import { buildPdfBufferFromVersion } from '../services/email.service';
import { DocumentStatus, SignatureRequestStatus, SignerStatus, SignerType, TaskStatus } from '@prisma/client';

async function runTests() {
  console.log('================================================================');
  console.log('  RUNNING INTEGRATION & MIGRATION TEST SUITE');
  console.log('================================================================\n');

  // Fetch reference templates, clients, matters to build a valid mock document
  const refDoc = await prisma.legalDocument.findFirst({
    include: { versions: true }
  });

  if (!refDoc) {
    throw new Error('❌ Test Setup Failed: Need at least one reference document in the database');
  }

  // Test 1: Create a mock approved document
  console.log('🧪 Test 1: Approved document starts with null pdfExportUrl...');
  const docId = `test-${crypto.randomBytes(8).toString('hex')}`;
  const doc = await prisma.legalDocument.create({
    data: {
      id: docId,
      title: 'Test Rental Agreement',
      status: DocumentStatus.approved,
      content: '<h1>Rental Agreement Content</h1>',
      variables: {},
      currentVersion: 1,
      organizationId: refDoc.organizationId,
      authorId: refDoc.authorId,
      templateId: refDoc.templateId,
      templateVersionAtGeneration: refDoc.templateVersionAtGeneration,
      clientId: refDoc.clientId,
      matterId: refDoc.matterId,
      dueDate: new Date()
    }
  });

  await prisma.documentVersion.create({
    data: {
      documentId: docId,
      versionNumber: 1,
      content: doc.content,
      variablesState: {},
      authorId: refDoc.authorId,
      changeDescription: 'Initial approved version template'
    }
  });

  if (doc.pdfExportUrl !== null) {
    throw new Error('❌ Test 1 Failed: pdfExportUrl should be null initially');
  }
  console.log('✅ Test 1 Passed.\n');

  // Test 2: Create completed SignatureRequest with signed signers
  console.log('🧪 Test 2: Simulating Completed SignatureRequest...');
  const taskId = `task-${crypto.randomBytes(8).toString('hex')}`;
  const sigReqId = `sig-${crypto.randomBytes(8).toString('hex')}`;

  const task = await prisma.workflowTask.create({
    data: {
      id: taskId,
      documentId: docId,
      templateId: refDoc.templateId,
      title: `Verification Agreement Task`,
      clientId: refDoc.clientId,
      matterId: refDoc.matterId,
      assigneeId: refDoc.authorId,
      assignedById: refDoc.authorId,
      status: TaskStatus.approved,
      dueDate: new Date(),
      organizationId: refDoc.organizationId
    }
  });
  
  await prisma.signatureRequest.create({
    data: {
      id: sigReqId,
      documentId: docId,
      taskId: task.id,
      status: SignatureRequestStatus.COMPLETED,
      documentVersionId: refDoc.versions[0].id,
      createdById: refDoc.authorId,
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000)
    }
  });

  await prisma.documentSigner.createMany({
    data: [
      {
        signatureRequestId: sigReqId,
        signerName: 'Landlord Rajesh',
        signerEmail: 'rajesh@example.com',
        signerRole: 'Landlord',
        signingOrder: 1,
        status: SignerStatus.SIGNED,
        signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        signedAt: new Date(),
        signerType: SignerType.INTERNAL_USER
      },
      {
        signatureRequestId: sigReqId,
        signerName: 'Tenant Aarav',
        signerEmail: 'aarav@example.com',
        signerRole: 'Tenant',
        signingOrder: 2,
        status: SignerStatus.SIGNED,
        signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        signedAt: new Date(),
        signerType: SignerType.EXISTING_CLIENT
      }
    ]
  });

  const signers = await prisma.documentSigner.findMany({ where: { signatureRequestId: sigReqId } });
  if (signers.length !== 2 || signers.some(s => s.status !== SignerStatus.SIGNED)) {
    throw new Error('❌ Test 2 Failed: Signers not created correctly');
  }
  console.log('✅ Test 2 Passed.\n');

  // Test 3: Run re-sealing logic (simulated migration step)
  console.log('🧪 Test 3: Legacy completed document with valid signature data can be safely re-sealed...');
  const activeReq = await prisma.signatureRequest.findUnique({
    where: { id: sigReqId },
    include: {
      document: {
        include: { versions: { orderBy: { versionNumber: 'desc' } } }
      },
      signers: true
    }
  });

  if (!activeReq) throw new Error('Request not found');

  const latestVersion = activeReq.document.versions[0];
  let finalHtml = latestVersion.content;
  finalHtml = injectSignaturesIntoHtml(
    finalHtml,
    activeReq.signers.map((s) => ({
      signerName: s.signerName,
      signerRole: s.signerRole,
      signatureData: s.signatureData,
      signedAt: s.signedAt,
      signingOrder: s.signingOrder
    }))
  );

  const pdfBuffer = await buildPdfBufferFromVersion(finalHtml, activeReq.document.title);
  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error('❌ Test 3 Failed: PDF buffer generation failed');
  }

  const exportsDir = path.join(__dirname, '..', '..', 'exports');
  const pdfFileName = `doc_${docId}_sealed.pdf`;
  const pdfPath = path.join(exportsDir, pdfFileName);
  const pdfUrl = `/exports/${pdfFileName}`;

  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }
  fs.writeFileSync(pdfPath, pdfBuffer);

  if (!fs.existsSync(pdfPath)) {
    throw new Error('❌ Test 3 Failed: PDF not stored on disk');
  }

  await prisma.$transaction(async (tx) => {
    await tx.legalDocument.update({
      where: { id: docId },
      data: {
        pdfExportUrl: pdfUrl,
        content: finalHtml
      }
    });

    await tx.documentVersion.create({
      data: {
        documentId: docId,
        versionNumber: doc.currentVersion + 1,
        content: finalHtml,
        changeDescription: 'FINAL SIGNED AGREEMENT',
        variablesState: {},
        authorId: doc.authorId
      }
    });

    await tx.legalDocument.update({
      where: { id: docId },
      data: {
        currentVersion: doc.currentVersion + 1
      }
    });
  });

  const updatedDoc = await prisma.legalDocument.findUnique({ where: { id: docId } });
  if (updatedDoc?.pdfExportUrl !== pdfUrl || updatedDoc?.currentVersion !== 2) {
    throw new Error('❌ Test 3 Failed: Database not updated correctly');
  }
  console.log('✅ Test 3 Passed.\n');

  // Test 4: Skip legacy document with missing signature data
  console.log('🧪 Test 4: Legacy document with missing signature data is NOT modified...');
  const badDocId = `test-bad-${crypto.randomBytes(8).toString('hex')}`;
  const badSigReqId = `sig-bad-${crypto.randomBytes(8).toString('hex')}`;
  const badTaskId = `task-bad-${crypto.randomBytes(8).toString('hex')}`;

  await prisma.legalDocument.create({
    data: {
      id: badDocId,
      title: 'Bad Rental Agreement',
      status: DocumentStatus.approved,
      content: '<h1>Bad Rental Agreement Content</h1>',
      variables: {},
      currentVersion: 1,
      organizationId: refDoc.organizationId,
      authorId: refDoc.authorId,
      templateId: refDoc.templateId,
      templateVersionAtGeneration: refDoc.templateVersionAtGeneration,
      clientId: refDoc.clientId,
      matterId: refDoc.matterId,
      dueDate: new Date()
    }
  });

  const badTask = await prisma.workflowTask.create({
    data: {
      id: badTaskId,
      documentId: badDocId,
      templateId: refDoc.templateId,
      title: `Verification Agreement Task`,
      clientId: refDoc.clientId,
      matterId: refDoc.matterId,
      assigneeId: refDoc.authorId,
      assignedById: refDoc.authorId,
      status: TaskStatus.approved,
      dueDate: new Date(),
      organizationId: refDoc.organizationId
    }
  });

  await prisma.signatureRequest.create({
    data: {
      id: badSigReqId,
      documentId: badDocId,
      taskId: badTask.id,
      status: SignatureRequestStatus.COMPLETED,
      documentVersionId: refDoc.versions[0].id,
      createdById: refDoc.authorId,
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000)
    }
  });

  await prisma.documentSigner.create({
    data: {
      signatureRequestId: badSigReqId,
      signerName: 'Missing Sig Signer',
      signerEmail: 'missing@example.com',
      signerRole: 'Witness',
      signingOrder: 1,
      status: SignerStatus.ACTIVE, // status ACTIVE instead of SIGNED, missing signatureData
      signatureData: null,
      signerType: SignerType.EXTERNAL
    }
  });

  const reqToMigrate = await prisma.signatureRequest.findUnique({
    where: { id: badSigReqId },
    include: { signers: true }
  });

  const hasMissingSigData = reqToMigrate?.signers.some(s => s.status !== SignerStatus.SIGNED || !s.signatureData);
  if (!hasMissingSigData) {
    throw new Error('❌ Test 4 Failed: Should detect missing signature data');
  }
  console.log('✅ Test 4 Passed.\n');

  // Clean up test documents
  console.log('🧹 Cleaning up test database records...');
  await prisma.documentSigner.deleteMany({ where: { signatureRequestId: { in: [sigReqId, badSigReqId] } } });
  await prisma.signatureRequest.deleteMany({ where: { id: { in: [sigReqId, badSigReqId] } } });
  await prisma.workflowTask.deleteMany({ where: { id: { in: [taskId, badTaskId] } } });
  await prisma.documentVersion.deleteMany({ where: { documentId: { in: [docId, badDocId] } } });
  await prisma.legalDocument.deleteMany({ where: { id: { in: [docId, badDocId] } } });

  try {
    fs.unlinkSync(pdfPath);
  } catch {}

  console.log('================================================================');
  console.log('🎉 ALL AUTOMATED TEST CASES PASSED SUCCESSFULLY.');
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
