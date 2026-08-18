import * as dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { injectSignaturesIntoHtml } from '../services/signature.service';
import { generatePdfFromHtml } from '../services/pdf.service';

const ARTIFACTS_DIR = 'C:\\Users\\Manish gowda\\.gemini\\antigravity-ide\\[conversation-id]'; // Will be resolved dynamically
const CONVERSATION_ID = '73dda3ce-9d87-4669-a376-274cbce65846';
const RESOLVED_ARTIFACTS_DIR = `C:\\Users\\Manish gowda\\.gemini\\antigravity-ide\\brain\\${CONVERSATION_ID}`;

// Base64 signatures (drawn signatures for testing)
const SIG_1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const SIG_2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const SIG_3 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const SIG_4 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAEvgGAsj894QAAAABJRU5ErkJggg==';
const SIG_5 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAEvgGAsj894QAAAABJRU5ErkJggg==';

const BASE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Times New Roman', serif; padding: 40px; }
    .page { max-width: 816px; margin: 0 auto; background: white; padding: 48px; }
  </style>
</head>
<body>
  <div class="page">
    <h1>AGREEMENT DEED</h1>
    <p>This agreement is entered into for verifying dynamic signature blocks.</p>
    <div class="execution">
      <p class="exec-heading"><strong>IN WITNESS WHEREOF</strong>, the Parties have executed this Agreement by affixing their signatures below.</p>
      <div class="sig-row">
        <div class="sig-col">
          <div class="sig-line"></div>
          <p class="sig-role">Witness 1 &mdash; Name: _______________________</p>
          <p class="sig-role">Address: ________________________________</p>
        </div>
        <div class="sig-col">
          <div class="sig-line"></div>
          <p class="sig-role">Witness 2 &mdash; Name: _______________________</p>
          <p class="sig-role">Address: ________________________________</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

async function testScenario(name: string, signers: any[], fileName: string) {
  console.log(`\n--- RUNNING SCENARIO: ${name} ---`);
  
  const finalHtml = injectSignaturesIntoHtml(BASE_HTML, signers);

  // Assertion checks on HTML
  const hasWitnessPlaceholder = finalHtml.includes('Witness 1 &mdash; Name:') || finalHtml.includes('Witness 2 &mdash; Name:');
  if (hasWitnessPlaceholder) {
    console.error(`❌ [FAIL] Hardcoded Witness 1 / Witness 2 placeholders were not stripped from HTML!`);
  } else {
    console.log(`✅ [PASS] Hardcoded Witness 1 / 2 placeholders successfully stripped.`);
  }

  // Check if every signer's name and role is rendered
  let allSignersFound = true;
  for (const s of signers) {
    if (!finalHtml.includes(s.signerName)) {
      console.error(`❌ [FAIL] Signer Name "${s.signerName}" missing in generated HTML.`);
      allSignersFound = false;
    }
    if (!finalHtml.includes(s.signerRole)) {
      console.error(`❌ [FAIL] Signer Role "${s.signerRole}" missing in generated HTML.`);
      allSignersFound = false;
    }
  }
  if (allSignersFound) {
    console.log(`✅ [PASS] All ${signers.length} signers' names and roles correctly rendered.`);
  }

  // Generate real PDF
  console.log(`🔹 Compiling HTML to PDF...`);
  const pdfBuffer = await generatePdfFromHtml(finalHtml);
  
  // Save PDF to artifacts directory
  if (!fs.existsSync(RESOLVED_ARTIFACTS_DIR)) {
    fs.mkdirSync(RESOLVED_ARTIFACTS_DIR, { recursive: true });
  }
  const destPath = path.join(RESOLVED_ARTIFACTS_DIR, fileName);
  fs.writeFileSync(destPath, pdfBuffer);
  console.log(`✅ [PASS] Real PDF generated successfully: ${destPath}`);
}

async function main() {
  console.log('================================================================');
  console.log('   DYNAMIC SIGNATURE BLOCK AND PDF GENERATION TESTING');
  console.log('================================================================');

  // Test case 1: 2 signers (Landlord + Tenant)
  await testScenario('2 Signers (Landlord + Tenant)', [
    { signerName: 'Adv. Rajesh Varma', signerRole: 'Landlord', signatureData: SIG_1, signedAt: new Date('2026-08-18T10:00:00Z'), signingOrder: 1 },
    { signerName: 'Aarav Mehta', signerRole: 'Tenant', signatureData: SIG_2, signedAt: new Date('2026-08-18T11:00:00Z'), signingOrder: 2 }
  ], 'test_signatures_2_signers.pdf');

  // Test case 2: 3 signers (Landlord + Tenant + Guarantor)
  await testScenario('3 Signers (Landlord + Tenant + Guarantor)', [
    { signerName: 'Adv. Rajesh Varma', signerRole: 'Landlord', signatureData: SIG_1, signedAt: new Date('2026-08-18T10:00:00Z'), signingOrder: 1 },
    { signerName: 'Aarav Mehta', signerRole: 'Tenant', signatureData: SIG_2, signedAt: new Date('2026-08-18T11:00:00Z'), signingOrder: 2 },
    { signerName: 'Suresh Kumar', signerRole: 'Guarantor', signatureData: SIG_3, signedAt: new Date('2026-08-18T12:00:00Z'), signingOrder: 3 }
  ], 'test_signatures_3_signers.pdf');

  // Test case 3: 4 signers (Landlord + Tenant + Guarantor + Witness)
  await testScenario('4 Signers (Landlord + Tenant + Guarantor + Witness)', [
    { signerName: 'Adv. Rajesh Varma', signerRole: 'Landlord', signatureData: SIG_1, signedAt: new Date('2026-08-18T10:00:00Z'), signingOrder: 1 },
    { signerName: 'Aarav Mehta', signerRole: 'Tenant', signatureData: SIG_2, signedAt: new Date('2026-08-18T11:00:00Z'), signingOrder: 2 },
    { signerName: 'Suresh Kumar', signerRole: 'Guarantor', signatureData: SIG_3, signedAt: new Date('2026-08-18T12:00:00Z'), signingOrder: 3 },
    { signerName: 'Ramesh Gowda', signerRole: 'Witness', signatureData: SIG_4, signedAt: new Date('2026-08-18T13:00:00Z'), signingOrder: 4 }
  ], 'test_signatures_4_signers.pdf');

  // Test case 4: 5 signers (Landlord + Tenant + Guarantor + Witness + Co-Tenant)
  await testScenario('5 Signers (Landlord + Tenant + Guarantor + Witness + Co-Tenant)', [
    { signerName: 'Adv. Rajesh Varma', signerRole: 'Landlord', signatureData: SIG_1, signedAt: new Date('2026-08-18T10:00:00Z'), signingOrder: 1 },
    { signerName: 'Aarav Mehta', signerRole: 'Tenant', signatureData: SIG_2, signedAt: new Date('2026-08-18T11:00:00Z'), signingOrder: 2 },
    { signerName: 'Suresh Kumar', signerRole: 'Guarantor', signatureData: SIG_3, signedAt: new Date('2026-08-18T12:00:00Z'), signingOrder: 3 },
    { signerName: 'Ramesh Gowda', signerRole: 'Witness', signatureData: SIG_4, signedAt: new Date('2026-08-18T13:00:00Z'), signingOrder: 4 },
    { signerName: 'Priya Sharma', signerRole: 'Co-Tenant', signatureData: SIG_5, signedAt: new Date('2026-08-18T14:00:00Z'), signingOrder: 5 }
  ], 'test_signatures_5_signers.pdf');

  // Test case 5: Custom arbitrary role (Authorized Representative)
  await testScenario('Arbitrary Role (Authorized Representative)', [
    { signerName: 'Adv. Rajesh Varma', signerRole: 'Authorized Representative', signatureData: SIG_1, signedAt: new Date('2026-08-18T10:00:00Z'), signingOrder: 1 }
  ], 'test_signatures_custom_role.pdf');

  console.log('\n================================================================');
  console.log('✅ ALL TEST SCENARIOS COMPLETED');
  console.log('================================================================\n');
}

main().catch(console.error);
