import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getAIProvider } from '../services/ai/ai.provider';

async function testRealGeminiReview() {
  console.log('=== TESTING REAL GEMINI REVIEW & REWRITE ===');
  const provider = getAIProvider();
  console.log('Active Provider:', provider.provider, '| Model:', provider.model);

  const sampleDoc = `
RESIDENTIAL LEASE AGREEMENT
This agreement is made on Jan 15, 2025 between Landlord Ramesh and Tenant Priya.
1. Rent: Rs. 25,000 per month due on 5th of each month.
2. Security Deposit: Rs. 1,50,000 refundable within 30 days.
3. Termination: Either party may terminate with 30 days notice.
4. Governing Law: State of Karnataka, India.
  `.trim();

  console.log('\nCalling reviewDocument()...');
  const review = await provider.reviewDocument({
    documentId: 'doc_test_1',
    documentVersionId: 'v_test_1',
    contentText: sampleDoc,
  });

  console.log('\n--- REVIEW RESPONSE ---');
  console.log('Provider:', review.provider);
  console.log('Model:', review.model);
  console.log('Provider Label:', review.providerLabel);
  console.log('Risk Score:', review.riskScore);
  console.log('Summary:', review.summary);
  console.log('Findings Count:', review.findings.length);
  if (review.findings.length > 0) {
    console.log('First Finding:', review.findings[0]);
  }

  console.log('\nCalling rewriteText()...');
  const rewrite = await provider.rewriteText({
    documentId: 'doc_test_1',
    documentVersionId: 'v_test_1',
    selectedText: 'Either party may terminate with 30 days notice.',
    action: 'REWRITE_LEGALLY',
    context: sampleDoc,
  });

  console.log('\n--- REWRITE RESPONSE ---');
  console.log('Provider:', rewrite.provider);
  console.log('Model:', rewrite.model);
  console.log('Original Text:', rewrite.originalText);
  console.log('Rewritten Text:', rewrite.rewrittenText);
  console.log('Rationale:', rewrite.rationale);
  console.log('Needs Legal Review:', rewrite.needsLegalReview);

  if (review.provider === 'gemini' && rewrite.provider === 'gemini' && rewrite.rewrittenText.length > 10) {
    console.log('\nREAL GEMINI TEST: SUCCESS (PASS)');
  } else {
    console.log('\nREAL GEMINI TEST: FAILED (FAIL)');
  }
}

testRealGeminiReview().catch(console.error);
