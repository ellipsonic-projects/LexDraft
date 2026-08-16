import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { rewriteSelectedText } from '../services/ai/ai.rewrite.service';
import { prisma } from '../lib/prisma';

async function main() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('  LEXDRAFT — INDIAN LEGAL DRAFTING REWRITE ENGINE TEST');
  console.log('════════════════════════════════════════════════════════════\n');

  // Authenticate / Find test user & document
  const user = await prisma.user.findFirst({ where: { role: 'BOSS' } });
  const doc = await prisma.legalDocument.findFirst({ select: { id: true, title: true, organizationId: true } });

  if (!user || !doc) {
    console.error('Test user or document not found in DB.');
    process.exit(1);
  }

  console.log(`Test Document ID: ${doc.id} ("${doc.title}")`);
  console.log(`Test User       : ${user.email}\n`);

  const testCases = [
    {
      name: '1. Residential Rental Agreement (Karnataka)',
      selectedText: 'The Landlord agrees to rent to the Tenant the house at Flat 402, MG Road, Bengaluru for residential premises.',
      action: 'REWRITE_LEGALLY' as const,
      documentType: 'Residential Rental Agreement',
      jurisdiction: 'Karnataka, India',
      sectionName: 'Leased Property',
    },
    {
      name: '2. Employment Agreement (India)',
      selectedText: 'The employee agrees not to join any competitor company anywhere in India for 2 years after leaving employment.',
      action: 'MAKE_DEFENSIBLE' as const,
      documentType: 'Employment Agreement',
      jurisdiction: 'India (Pan-India Jurisdiction)',
      sectionName: 'Non-Compete & Restraint of Trade',
    },
    {
      name: '3. Non-Disclosure Agreement (NDA)',
      selectedText: 'The receiving party shall keep all confidential information completely secret and not disclose it to any third party.',
      action: 'REWRITE_LEGALLY' as const,
      documentType: 'Non-Disclosure Agreement (NDA)',
      jurisdiction: 'India (Pan-India Jurisdiction)',
      sectionName: 'Confidentiality Obligations',
    },
    {
      name: '4. Generic Contract Clause (Simplify)',
      selectedText: 'Neither party shall be held liable for failure to perform obligations if such failure is caused by war, floods, or act of God.',
      action: 'SIMPLIFY' as const,
      documentType: 'Commercial Contract',
      jurisdiction: 'Karnataka, India',
      sectionName: 'Force Majeure',
    },
  ];

  for (const tc of testCases) {
    console.log(`----------------------------------------------------`);
    console.log(`TEST CASE: ${tc.name}`);
    console.log(`Action   : ${tc.action}`);
    console.log(`Selection: "${tc.selectedText}"`);

    const result = await rewriteSelectedText({
      documentId: doc.id,
      documentVersionId: 'latest',
      selectedText: tc.selectedText,
      action: tc.action,
      documentType: tc.documentType,
      jurisdiction: tc.jurisdiction,
      sectionName: tc.sectionName,
      userId: user.id,
      organizationId: doc.organizationId,
    });

    console.log('\n--- OUTPUT RESULTS ---');
    console.log(`Provider        : ${result.provider}`);
    console.log(`Model           : ${result.model}`);
    console.log(`Status          : ${result.status}`);
    console.log(`Fallback Used   : ${result.fallbackUsed}`);
    console.log(`Provider Label  : ${result.providerLabel}`);
    console.log(`Needs Legal Rev : ${result.needsLegalReview}`);
    console.log(`\nSUGGESTED TEXT :\n"${result.rewrittenText}"`);
    console.log(`\nRATIONALE       : ${result.rationale}`);
    console.log(`\nLEGAL BASIS     :`, JSON.stringify(result.legalBasis || [], null, 2));
    console.log(`\nWARNINGS        :`, JSON.stringify(result.warnings || [], null, 2));

    // Validations
    if (!result.rewrittenText || result.rewrittenText.length < 10) {
      console.error(`❌ FAIL: Invalid suggested text`);
    } else {
      console.log(`✅ PASS: Rewritten output generated successfully`);
    }
  }

  // ActivityLog Verification
  console.log('\n----------------------------------------------------');
  console.log('VERIFYING ACTIVITY LOGpersisted entries...');
  const logs = await prisma.activityLog.findMany({
    where: { entityId: doc.id, action: 'AI_REWRITE_REQUESTED' },
    take: 5,
    orderBy: { timestamp: 'desc' },
  });

  console.log(`✅ ActivityLogs recorded count: ${logs.length}`);

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  INDIAN LEGAL DRAFTING REWRITE ENGINE TEST COMPLETE');
  console.log('════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
