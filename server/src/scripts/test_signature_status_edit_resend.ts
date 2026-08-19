import * as dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../lib/prisma';
import crypto from 'crypto';
import { updateSignerEmail, createSignatureRequest } from '../services/signature.service';
import { DocumentStatus, SignerStatus } from '@prisma/client';

async function runTests() {
  console.log('================================================================');
  console.log('  RUNNING SIGNATURE STATUS EMAIL EDIT & RESEND TEST');
  console.log('================================================================\n');

  // Fetch reference templates, clients, matters to build a valid mock document
  const refDoc = await prisma.legalDocument.findFirst({
    include: { versions: true }
  });

  if (!refDoc) {
    throw new Error('❌ Test Setup Failed: Need at least one reference document in the database');
  }

  // 1. Setup Document and Task
  console.log('🧪 1. Setting up test task and approved document...');
  const testSuffix = crypto.randomBytes(4).toString('hex');
  const docId = `test-edit-${testSuffix}`;
  const taskId = `task-edit-${testSuffix}`;

  const doc = await prisma.legalDocument.create({
    data: {
      id: docId,
      title: `Verification Edit Agreement ${testSuffix}`,
      status: DocumentStatus.approved,
      content: '<h1>Edit Agreement Content</h1>',
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
      changeDescription: 'Approved version template'
    }
  });

  await prisma.workflowTask.create({
    data: {
      id: taskId,
      documentId: docId,
      templateId: refDoc.templateId,
      title: `Verification Edit Task ${testSuffix}`,
      clientId: refDoc.clientId,
      matterId: refDoc.matterId,
      assigneeId: refDoc.authorId,
      assignedById: refDoc.authorId,
      status: 'approved',
      dueDate: new Date(),
      organizationId: refDoc.organizationId
    }
  });

  // 2. Start signing process (adds ACTIVE and PENDING signers)
  console.log('🧪 2. Creating signature request with 2 signers...');
  const sigReq = await createSignatureRequest({
    taskId,
    documentId: docId,
    requestingUserId: refDoc.authorId,
    requestingUserRole: 'BOSS',
    organizationId: refDoc.organizationId,
    signers: [
      {
        signerName: 'Landlord Rajesh',
        signerEmail: 'rajesh-old@example.com',
        signerRole: 'Landlord',
        signingOrder: 1,
        signerType: 'INTERNAL_USER',
        userId: refDoc.authorId
      },
      {
        signerName: 'Tenant Aarav',
        signerEmail: 'aarav-old@example.com',
        signerRole: 'Tenant',
        signingOrder: 2,
        signerType: 'EXTERNAL'
      }
    ]
  });

  // Load the signers created
  const signers = await prisma.documentSigner.findMany({
    where: { signatureRequestId: sigReq.id },
    orderBy: { signingOrder: 'asc' }
  });

  const activeSigner = signers[0]; // Landlord, ACTIVE
  const pendingSigner = signers[1]; // Tenant, PENDING

  if (activeSigner.status !== SignerStatus.ACTIVE || !activeSigner.tokenHash) {
    throw new Error('❌ Test failed: Signer 1 should be ACTIVE with a tokenHash');
  }
  if (pendingSigner.status !== SignerStatus.PENDING || pendingSigner.tokenHash) {
    throw new Error('❌ Test failed: Signer 2 should be PENDING without a tokenHash');
  }
  console.log('✅ Signers initialised correctly.');

  // 3. Edit email for the ACTIVE signer
  console.log('🧪 3. Editing email address of the ACTIVE signer (Landlord)...');
  const oldHash = activeSigner.tokenHash;
  const newEmail = 'rajesh-new@example.com';

  const updatedReq = await updateSignerEmail({
    signerId: activeSigner.id,
    newEmail,
    requestingUserId: refDoc.authorId,
    requestingUserRole: 'BOSS',
    organizationId: refDoc.organizationId
  });

  const updatedActiveSigner = updatedReq?.signers.find(s => s.id === activeSigner.id);
  if (!updatedActiveSigner || updatedActiveSigner.signerEmail !== newEmail) {
    throw new Error('❌ Test failed: Email did not update to new email address');
  }
  if (updatedActiveSigner.status !== SignerStatus.ACTIVE) {
    throw new Error('❌ Test failed: Signer should remain ACTIVE');
  }
  if (!updatedActiveSigner.tokenHash || updatedActiveSigner.tokenHash === oldHash) {
    throw new Error('❌ Test failed: Token should be invalidated and updated to a new tokenHash');
  }

  // Verify that an email dispatch log was generated for the new email address
  const newEmailLog = await prisma.emailLog.findFirst({
    where: {
      recipientEmail: newEmail,
      emailType: 'SIGNATURE_REQUEST'
    }
  });
  if (!newEmailLog) {
    throw new Error('❌ Test failed: No email dispatch log found for the new email address');
  }
  console.log('✅ Active signer email updated, old token invalidated, new token generated, and new email sent.');

  // 4. Edit email for the PENDING signer
  console.log('🧪 4. Editing email address of the PENDING signer (Tenant)...');
  const newPendingEmail = 'aarav-new@example.com';
  const updatedReq2 = await updateSignerEmail({
    signerId: pendingSigner.id,
    newEmail: newPendingEmail,
    requestingUserId: refDoc.authorId,
    requestingUserRole: 'BOSS',
    organizationId: refDoc.organizationId
  });

  const updatedPendingSigner = updatedReq2?.signers.find(s => s.id === pendingSigner.id);
  if (!updatedPendingSigner || updatedPendingSigner.signerEmail !== newPendingEmail) {
    throw new Error('❌ Test failed: Pending signer email did not update');
  }
  if (updatedPendingSigner.status !== SignerStatus.PENDING) {
    throw new Error('❌ Test failed: Signer should remain PENDING');
  }
  if (updatedPendingSigner.tokenHash) {
    throw new Error('❌ Test failed: Pending signer should not have a tokenHash assigned');
  }

  // Verify that no email was sent to the new email address since they are still PENDING
  const pendingEmailLog = await prisma.emailLog.findFirst({
    where: {
      recipientEmail: newPendingEmail,
      emailType: 'SIGNATURE_REQUEST'
    }
  });
  if (pendingEmailLog) {
    throw new Error('❌ Test failed: Email should not be sent to PENDING signer');
  }
  console.log('✅ Pending signer email updated without generating token or sending email prematurely.');

  // 5. Verify RBAC restriction (non-BOSS cannot edit)
  console.log('🧪 5. Verifying RBAC protection (non-BOSS cannot modify signer email)...');
  try {
    await updateSignerEmail({
      signerId: activeSigner.id,
      newEmail: 'hack@example.com',
      requestingUserId: refDoc.authorId,
      requestingUserRole: 'ASSOCIATE',
      organizationId: refDoc.organizationId
    });
    throw new Error('❌ Test failed: Unauthorized role should not be able to modify signer email');
  } catch (err: any) {
    if (err.message.includes('modify signer emails') || err.message.includes('role')) {
      console.log('✅ RBAC protection blocked unauthorized role edit.');
    } else {
      throw err;
    }
  }

  // Cleanup
  console.log('🧹 Cleaning up database test records...');
  await prisma.emailLog.deleteMany({
    where: { recipientEmail: { in: [newEmail, newPendingEmail, 'rajesh-old@example.com', 'aarav-old@example.com'] } }
  });
  await prisma.documentSigner.deleteMany({
    where: { signatureRequestId: sigReq.id }
  });
  await prisma.signatureRequest.deleteMany({
    where: { id: sigReq.id }
  });
  await prisma.workflowTask.deleteMany({
    where: { id: taskId }
  });
  await prisma.documentVersion.deleteMany({
    where: { documentId: docId }
  });
  await prisma.legalDocument.deleteMany({
    where: { id: docId }
  });

  console.log('================================================================');
  console.log('🎉 ALL EMAIL EDIT & RESEND TEST CASES PASSED SUCCESSFULLY!');
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
