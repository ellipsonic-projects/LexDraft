import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getAIProvider } from '../services/ai/ai.provider';

async function main() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('  PROVIDER & QUOTA EXHAUSTION HANDLING VERIFICATION');
  console.log('════════════════════════════════════════════════════════════\n');

  const provider = getAIProvider();

  console.log('1. Testing EXACTLY ONE real Gemini Review request...');
  const reviewResult = await provider.reviewDocument({
    documentId: 'doc_101',
    documentVersionId: 'v_101',
    contentText: 'This is a lease agreement for property in Bengaluru.',
    title: 'Test Lease Agreement'
  });

  console.log('\n--- REVIEW RESPONSE STRUCTURED DIAGNOSTIC FIELDS ---');
  console.log('Provider     :', reviewResult.provider);
  console.log('Model        :', reviewResult.model);
  console.log('Status       :', reviewResult.status);
  console.log('FallbackUsed :', reviewResult.fallbackUsed);
  console.log('ProviderLabel:', reviewResult.providerLabel);
  console.log('Findings Count:', reviewResult.findings.length);

  console.log('\n2. Testing EXACTLY ONE real Gemini Rewrite request...');
  const rewriteResult = await provider.rewriteText({
    documentId: 'doc_101',
    documentVersionId: 'v_101',
    selectedText: 'The tenant shall pay rent monthly.',
    action: 'REWRITE_LEGALLY'
  });

  console.log('\n--- REWRITE RESPONSE STRUCTURED DIAGNOSTIC FIELDS ---');
  console.log('Provider     :', rewriteResult.provider);
  console.log('Model        :', rewriteResult.model);
  console.log('Status       :', rewriteResult.status);
  console.log('FallbackUsed :', rewriteResult.fallbackUsed);
  console.log('ProviderLabel:', rewriteResult.providerLabel);
  console.log('Action       :', rewriteResult.action);

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  VERIFICATION COMPLETE');
  console.log('════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
