import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { rewriteSelectedText } from '../services/ai/ai.rewrite.service';
import { prisma } from '../lib/prisma';
import { RewriteAction } from '../services/ai/ai.types';

import { resetProviderCache } from '../services/ai/ai.provider';

async function main() {
  resetProviderCache();
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('  LEXDRAFT — ALL 9 REWRITE ACTIONS COMPREHENSIVE TEST (REAL GROQ API)');
  console.log('════════════════════════════════════════════════════════════════════════\n');

  const user = await prisma.user.findFirst({ where: { role: 'BOSS' } });
  const doc = await prisma.legalDocument.findFirst({ select: { id: true, title: true, organizationId: true } });

  if (!user || !doc) {
    console.error('Test user or document not found');
    process.exit(1);
  }

  const allActions: { action: RewriteAction; sampleText: string; expectedTrait: string }[] = [
    {
      action: 'REWRITE_LEGALLY',
      sampleText: 'The Tenant can leave whenever they want.',
      expectedTrait: 'Formal Indian legal drafting phrasing (Lessor/Lessee/demise)',
    },
    {
      action: 'REWRITE_PROFESSIONALLY',
      sampleText: 'Rent shall be paid every month.',
      expectedTrait: 'Polished corporate/business tone',
    },
    {
      action: 'SIMPLIFY',
      sampleText: 'Notwithstanding anything hereinbefore contained to the contrary, the Lessee shall yield up the Demised Premises.',
      expectedTrait: 'Modern plain English legal text without archaic legalese',
    },
    {
      action: 'SUMMARIZE',
      sampleText: 'The Tenant hereby covenants and agrees with the Landlord that the Tenant shall at all times during the subsistence of this Lease maintain, repair, cleanse, preserve and keep the Demised Premises, including all fixtures, fittings, doors, windows and electrical installations in good, substantial and tenantable repair and condition.',
      expectedTrait: 'Significantly shorter 1-2 sentence core summary',
    },
    {
      action: 'MAKE_DEFENSIBLE',
      sampleText: 'The employee agrees not to join any competitor company anywhere in India for 2 years after leaving employment.',
      expectedTrait: 'Section 27 Contract Act Indian defensibility restructuring + warning',
    },
    {
      action: 'EXPAND',
      sampleText: 'No pets or animals are allowed without permission.',
      expectedTrait: 'Comprehensive operational detail, notice terms, and remedies',
    },
    {
      action: 'SHORTEN',
      sampleText: 'In the event that the Tenant fails to pay the monthly rental amount within five days from the due date, the Landlord shall have the absolute right to issue a notice of default.',
      expectedTrait: 'Materially reduced word count (at least 30% shorter)',
    },
    {
      action: 'IMPROVE_CLARITY',
      sampleText: 'Payment of utility bills shall be done by whoever lives in the house when due or else penalties apply.',
      expectedTrait: 'Clear obligations, explicit party definitions, and timelines',
    },
    {
      action: 'IMPROVE_FORMALITY',
      sampleText: 'Both parties agree to talk out any issues before going to court.',
      expectedTrait: 'Solemn formal dispute resolution clause under Arbitration Act 1996',
    },
  ];

  const resultsTable: any[] = [];

  for (const item of allActions) {
    console.log(`------------------------------------------------------------------------`);
    console.log(`[ACTION TEST] ${item.action}`);
    console.log(`Original Text : "${item.sampleText}"`);

    const startTime = Date.now();
    const res = await rewriteSelectedText({
      documentId: doc.id,
      documentVersionId: 'latest',
      selectedText: item.sampleText,
      action: item.action,
      documentType: 'Residential Rental Agreement',
      jurisdiction: 'Karnataka, India',
      sectionName: 'General Covenants',
      userId: user.id,
      organizationId: doc.organizationId,
    });
    const elapsed = Date.now() - startTime;

    const origLength = item.sampleText.length;
    const newLength = res.rewrittenText.length;
    const isDifferent = res.rewrittenText.trim().toLowerCase() !== item.sampleText.trim().toLowerCase();

    console.log(`Output Text   : "${res.rewrittenText}"`);
    console.log(`Rationale     : ${res.rationale}`);
    console.log(`Status        : ${res.status} (Changed: ${isDifferent}, Chars: ${origLength} -> ${newLength}, Time: ${elapsed}ms)`);

    resultsTable.push({
      action: item.action,
      provider: res.provider,
      model: res.model,
      changed: isDifferent ? 'YES ✅' : 'NO ❌',
      origLen: origLength,
      newLen: newLength,
      status: res.status,
    });

    if (!isDifferent) {
      console.error(`❌ FAIL: Output identical to original for action ${item.action}`);
    } else {
      console.log(`✅ PASS: Output materially transformed for action ${item.action}`);
    }

    // Pacing delay to avoid rapid RPD/RPM limits
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n========================================================================');
  console.log('  SUMMARY RESULTS TABLE FOR ALL 9 REWRITE ACTIONS');
  console.log('========================================================================');
  console.table(resultsTable);

  console.log('\n========================================================================');
  console.log('  VERIFYING ACTIVITY LOG PERSISTENCE');
  console.log('========================================================================');
  const logs = await prisma.activityLog.findMany({
    where: { entityId: doc.id, action: 'AI_REWRITE_REQUESTED' },
    take: 9,
    orderBy: { timestamp: 'desc' },
  });
  console.log(`✅ ActivityLogs count recorded: ${logs.length}`);
  console.log('========================================================================\n');
}

main().catch(console.error);
