import * as dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../lib/prisma';
import crypto from 'crypto';
import { submitSignature } from '../services/signature.service';
import { SignerStatus } from '@prisma/client';

const dummySig = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function signActiveRequest() {
  console.log('================================================================');
  console.log('  LEXDRAFT SIGNING SIMULATOR');
  console.log('================================================================\n');

  // Find the latest active signature request
  const activeReq = await prisma.signatureRequest.findFirst({
    where: {
      status: { in: ['PENDING', 'IN_PROGRESS'] }
    },
    include: {
      document: true,
      signers: { orderBy: { signingOrder: 'asc' } }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  if (!activeReq) {
    console.log('❌ No active SignatureRequest found in the database.');
    process.exit(0);
  }

  console.log(`🔹 Found active SignatureRequest for document: "${activeReq.document.title}" (ID: ${activeReq.document.id})`);
  console.log(`🔹 Total signers: ${activeReq.signers.length}`);

  for (let i = 0; i < activeReq.signers.length; i++) {
    const signer = activeReq.signers[i];
    
    // Reload signer from DB to get latest status
    const currentSigner = await prisma.documentSigner.findUnique({
      where: { id: signer.id }
    });

    if (!currentSigner) {
      console.error(`❌ Signer ${signer.id} not found.`);
      continue;
    }

    if (currentSigner.status === SignerStatus.SIGNED) {
      console.log(`✅ Signer ${i + 1}: ${currentSigner.signerName} (${currentSigner.signerRole}) is already SIGNED.`);
      continue;
    }

    console.log(`✍️ Signing for Signer ${i + 1}: ${currentSigner.signerName} (${currentSigner.signerRole})...`);

    // Generate a new secure token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Update signer with active status and hash token
    await prisma.documentSigner.update({
      where: { id: currentSigner.id },
      data: {
        status: SignerStatus.ACTIVE,
        tokenHash
      }
    });

    // Submit signature
    await submitSignature({
      rawToken,
      signatureType: 'DRAWN',
      signatureData: dummySig,
      ipAddress: '127.0.0.1',
      userAgent: 'LexDraft-Signing-Simulator'
    });

    console.log(`✅ Signer ${i + 1} signed successfully.`);
  }

  console.log('\n================================================================');
  console.log('🎉 ALL SIGNERS HAVE SIGNED. AGREEMENT IS COMPLETED AND SEALED.');
  console.log('================================================================\n');
  process.exit(0);
}

signActiveRequest().catch((err) => {
  console.error('🚨 Error running signing simulator:', err);
  process.exit(1);
});
