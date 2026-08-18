import * as dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';
import { injectSignaturesIntoHtml } from '../services/signature.service';
import { buildPdfBufferFromVersion } from '../services/email.service';

async function migrate() {
  console.log('================================================================');
  console.log('  LEGACY COMPLETED AGREEMENTS MIGRATION & RE-SEALING');
  console.log('================================================================\n');

  // Find all completed SignatureRequests where the associated document lacks a pdfExportUrl
  const reqs = await prisma.signatureRequest.findMany({
    where: {
      status: 'COMPLETED',
      document: {
        pdfExportUrl: null
      }
    },
    include: {
      document: {
        include: { versions: { orderBy: { versionNumber: 'desc' } } }
      },
      signers: true
    }
  });

  console.log(`🔹 Found ${reqs.length} legacy completed SignatureRequest(s) to migrate.`);

  for (const req of reqs) {
    const doc = req.document;
    if (!doc) {
      console.log(`⚠️ Request ${req.id} has no associated LegalDocument. Skipping.`);
      continue;
    }

    const latestVersion = doc.versions[0];
    if (!latestVersion) {
      console.log(`⚠️ Document "${doc.title}" (ID: ${doc.id}) has no versions. Skipping.`);
      continue;
    }

    console.log(`🔹 Migrating Document: "${doc.title}" (ID: ${doc.id})`);
    console.log(`   SignatureRequest ID: ${req.id}`);
    console.log(`   Signers count: ${req.signers.length}`);

    // Verify all signers have signature data
    const unsigned = req.signers.filter(s => s.status !== 'SIGNED' || !s.signatureData);
    if (unsigned.length > 0) {
      console.log(`   ⚠️ Skipping: Has unsigned/incomplete signers: ${unsigned.map(u => u.signerName).join(', ')}`);
      continue;
    }

    // 1. Reconstruct the finalized signed HTML content
    console.log('   🔨 Reconstructing finalized HTML content...');
    let finalHtml = latestVersion.content;
    finalHtml = injectSignaturesIntoHtml(
      finalHtml,
      req.signers.map((s) => ({
        signerName: s.signerName,
        signerRole: s.signerRole,
        signatureData: s.signatureData,
        signedAt: s.signedAt,
        signingOrder: s.signingOrder
      }))
    );

    // 2. Generate PDF buffer using the canonical PDF pipeline
    console.log('   📄 Generating signed PDF buffer...');
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await buildPdfBufferFromVersion(finalHtml, doc.title);
    } catch (e) {
      console.error(`   ❌ Failed to generate PDF buffer for document ${doc.id}:`, e);
      continue;
    }

    if (!pdfBuffer || pdfBuffer.length === 0) {
      console.error(`   ❌ Generated PDF buffer is empty or invalid for document ${doc.id}`);
      continue;
    }

    // 3. Write PDF to local exports directory
    const exportsDir = path.join(__dirname, '..', '..', 'exports');
    const pdfFileName = `doc_${doc.id}_sealed.pdf`;
    const pdfPath = path.join(exportsDir, pdfFileName);
    const pdfUrl = `/exports/${pdfFileName}`;

    console.log(`   💾 Storing sealed PDF to disk at: ${pdfPath}`);
    try {
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }
      fs.writeFileSync(pdfPath, pdfBuffer);
    } catch (e) {
      console.error(`   ❌ Failed to save PDF file to disk for document ${doc.id}:`, e);
      continue;
    }

    // 4. Update the database atomically
    console.log('   🗄️ Updating database records...');
    try {
      await prisma.$transaction(async (tx) => {
        // Update LegalDocument status, locked timestamp, and export URL
        await tx.legalDocument.update({
          where: { id: doc.id },
          data: {
            lockedAt: req.updatedAt || new Date(),
            pdfExportUrl: pdfUrl,
            content: finalHtml
          }
        });

        // Determine if we should create a new canonical DocumentVersion or update the latest one.
        // The prompt says: "create/update the final signed DocumentVersion, preserve historical versions"
        // Let's create a new version representing the executed signed state, preserving version 1 or others.
        const nextVersionNumber = doc.currentVersion + 1;
        await tx.documentVersion.create({
          data: {
            documentId: doc.id,
            versionNumber: nextVersionNumber,
            content: finalHtml,
            changeDescription: 'FINAL SIGNED AGREEMENT (Migrated Legacy Re-seal)',
            variablesState: latestVersion.variablesState || {},
            authorId: doc.authorId
          }
        });

        // Update LegalDocument currentVersion to nextVersionNumber
        await tx.legalDocument.update({
          where: { id: doc.id },
          data: {
            currentVersion: nextVersionNumber
          }
        });
      });

      console.log(`   ✅ Successfully migrated and re-sealed Document "${doc.title}".`);
    } catch (e) {
      console.error(`   ❌ Database transaction failed for document ${doc.id}:`, e);
    }
  }

  console.log('\n================================================================');
  console.log('🎉 LEGACY COMPLETED AGREEMENTS MIGRATION RUN COMPLETED.');
  console.log('================================================================\n');
}

migrate().catch((err) => {
  console.error('🚨 Migration script failed:', err);
  process.exit(1);
});
