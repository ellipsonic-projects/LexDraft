import * as dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../lib/prisma';
import crypto from 'crypto';
import { createSignatureRequest, submitSignature } from '../services/signature.service';

async function verifySequentialSigningFor4Signers() {
  console.log('================================================================');
  console.log('  LEXDRAFT SEQUENTIAL SIGNING VERIFICATION (4 SIGNERS)');
  console.log('================================================================\n');

  const org = await prisma.organization.findFirst();
  const boss = await prisma.user.findFirst({ where: { role: 'BOSS', organizationId: org?.id } });
  const doc = await prisma.legalDocument.findFirst({ where: { organizationId: org?.id } });
  const task = await prisma.workflowTask.findFirst({ where: { organizationId: org?.id } });

  if (!org || !boss || !doc || !task) {
    console.error('❌ Missing prerequisite database records');
    process.exit(1);
  }

  // Clean prior active requests
  const preReqs = await prisma.signatureRequest.findMany({ where: { documentId: doc.id } });
  for (const r of preReqs) {
    await prisma.documentSigner.deleteMany({ where: { signatureRequestId: r.id } });
    await prisma.signatureRequest.delete({ where: { id: r.id } });
  }

  console.log('🔹 Creating SignatureRequest with 4 sequential signers:');
  console.log('   1. Landlord  (partner@apexlegal.in)');
  console.log('   2. Tenant    (aarav@mehtapremises.com)');
  console.log('   3. Witness   (witness@apexlegal.in)');
  console.log('   4. Guarantor (guarantor@apexlegal.in)\n');

  const sigReq = await createSignatureRequest({
    taskId: task.id,
    documentId: doc.id,
    requestingUserId: boss.id,
    requestingUserRole: 'BOSS',
    organizationId: org.id,
    signers: [
      { signerName: 'Adv. Rajesh Varma', signerEmail: 'partner@apexlegal.in', signerRole: 'Landlord', signerType: 'INTERNAL_USER', userId: boss.id, signingOrder: 1 },
      { signerName: 'Aarav Mehta', signerEmail: 'aarav@mehtapremises.com', signerRole: 'Tenant', signerType: 'EXTERNAL', signingOrder: 2 },
      { signerName: 'Ramesh Gowda', signerEmail: 'witness@apexlegal.in', signerRole: 'Witness', signerType: 'EXTERNAL', signingOrder: 3 },
      { signerName: 'Suresh Kumar', signerEmail: 'guarantor@apexlegal.in', signerRole: 'Guarantor', signerType: 'EXTERNAL', signingOrder: 4 }
    ]
  });

  const checkStatuses = async (stepLabel: string) => {
    const updated = await prisma.signatureRequest.findUnique({
      where: { id: sigReq.id },
      include: { signers: { orderBy: { signingOrder: 'asc' } } }
    });
    console.log(`📌 Status after ${stepLabel}:`);
    for (const s of updated!.signers) {
      console.log(`   Order ${s.signingOrder} (${s.signerRole} - ${s.signerEmail}): [${s.status}]`);
    }
    console.log('');
    return updated!.signers;
  };

  // Initial status check
  let signers = await checkStatuses('Partner Assigns Signing Process');
  const dummySig = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  // 1. Signer 1 (Landlord) signs
  console.log('🔹 Signer 1 (Landlord) signs document...');
  const s1 = signers.find(s => s.signingOrder === 1)!;
  const raw1 = crypto.randomBytes(32).toString('hex');
  const hash1 = crypto.createHash('sha256').update(raw1).digest('hex');
  await prisma.documentSigner.update({ where: { id: s1.id }, data: { tokenHash: hash1 } });
  await submitSignature({ rawToken: raw1, signatureType: 'DRAWN', signatureData: dummySig, ipAddress: '127.0.0.1', userAgent: 'NodeTest' });
  signers = await checkStatuses('Signer 1 (Landlord) signs');

  // 2. Signer 2 (Tenant) signs
  console.log('🔹 Signer 2 (Tenant) signs document...');
  const s2 = signers.find(s => s.signingOrder === 2)!;
  const raw2 = crypto.randomBytes(32).toString('hex');
  const hash2 = crypto.createHash('sha256').update(raw2).digest('hex');
  await prisma.documentSigner.update({ where: { id: s2.id }, data: { tokenHash: hash2 } });
  await submitSignature({ rawToken: raw2, signatureType: 'DRAWN', signatureData: dummySig, ipAddress: '127.0.0.1', userAgent: 'NodeTest' });
  signers = await checkStatuses('Signer 2 (Tenant) signs');

  // 3. Signer 3 (Witness) signs
  console.log('🔹 Signer 3 (Witness) signs document...');
  const s3 = signers.find(s => s.signingOrder === 3)!;
  const raw3 = crypto.randomBytes(32).toString('hex');
  const hash3 = crypto.createHash('sha256').update(raw3).digest('hex');
  await prisma.documentSigner.update({ where: { id: s3.id }, data: { tokenHash: hash3 } });
  await submitSignature({ rawToken: raw3, signatureType: 'DRAWN', signatureData: dummySig, ipAddress: '127.0.0.1', userAgent: 'NodeTest' });
  signers = await checkStatuses('Signer 3 (Witness) signs');

  // 4. Signer 4 (Guarantor) signs
  console.log('🔹 Signer 4 (Guarantor) signs document...');
  const s4 = signers.find(s => s.signingOrder === 4)!;
  const raw4 = crypto.randomBytes(32).toString('hex');
  const hash4 = crypto.createHash('sha256').update(raw4).digest('hex');
  await prisma.documentSigner.update({ where: { id: s4.id }, data: { tokenHash: hash4 } });
  await submitSignature({ rawToken: raw4, signatureType: 'DRAWN', signatureData: dummySig, ipAddress: '127.0.0.1', userAgent: 'NodeTest' });
  signers = await checkStatuses('Signer 4 (Guarantor) signs');

  // Clean up test request
  await prisma.documentSigner.deleteMany({ where: { signatureRequestId: sigReq.id } });
  await prisma.signatureRequest.delete({ where: { id: sigReq.id } });

  console.log('✅ Sequential signing verification complete!');
}

verifySequentialSigningFor4Signers().catch(console.error);
