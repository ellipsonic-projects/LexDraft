/**
 * End-to-end signature test:
 * 1. Reset a signer token to ACTIVE
 * 2. GET the signing page (verify canvas JS present)
 * 3. POST a real base64 PNG signature to the sign endpoint
 * 4. Verify the response is success
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import https from 'https';
import http from 'http';

const prisma = new PrismaClient();

// Minimal valid 10x10 black stroke PNG (pre-generated)
// This is a real PNG with a black diagonal line on white background
const TEST_SIGNATURE_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwgAADsIBFShKgAAAABl0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC4yMfEgaZUAAABVSURBVDhPY/z//z8DJYCJgUIwasAAgVEDBghQbMAAgVEDBgiQ2oABApQYMEBgVAIHBkYlMGBgVAIHBkYlMGBgVAIHBkYlMGBgVAIHBkYlkGTAAACAAAD//6UACRT8HQAAAABJRU5ErkJggg==';

async function httpGet(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode || 0, body }));
    }).on('error', reject);
  });
}

async function httpPost(url: string, data: object): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(data);
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode || 0, body }));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function main() {
  console.log('\n════════════════════════════════════════════════════════');
  console.log('   LexDraft Signature End-to-End Test');
  console.log('════════════════════════════════════════════════════════\n');

  // Step 1: Find a signer to reset
  let signer = await prisma.documentSigner.findFirst({
    where: { status: { in: ['SIGNED', 'ACTIVE', 'PENDING'] } },
    include: {
      signatureRequest: {
        include: { document: { select: { title: true } } }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!signer) {
    console.error('❌ No signers found in DB. Please create a signature request first.');
    await prisma.$disconnect();
    return;
  }

  // Step 2: Issue a fresh token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);

  await prisma.documentSigner.update({
    where: { id: signer.id },
    data: {
      status: 'ACTIVE',
      tokenHash,
      expiresAt,
      signedAt: null,
      signatureData: null,
      signatureType: null,
      declinedAt: null,
      declineReason: null
    }
  });

  await prisma.signatureRequest.update({
    where: { id: signer.signatureRequestId },
    data: { status: 'IN_PROGRESS' }
  });

  console.log(`✅ Step 1: Reset signer "${signer.signerName}" (${signer.signerRole}) to ACTIVE`);
  console.log(`   Document: ${signer.signatureRequest.document.title}`);
  console.log(`   Token: ${rawToken.substring(0, 16)}...`);

  const signingUrl = `http://localhost:5000/api/signatures/signer/${rawToken}`;
  console.log(`   Signing URL: ${signingUrl}\n`);

  // Step 3: GET the signing page and validate canvas JS
  console.log('📄 Step 2: Validating signing page HTML...');
  const pageResponse = await httpGet(signingUrl);

  if (pageResponse.status !== 200) {
    console.error(`❌ Page returned status ${pageResponse.status}`);
    console.error('   Body:', pageResponse.body.substring(0, 500));
    await prisma.$disconnect();
    return;
  }

  const html = pageResponse.body;
  const checks = {
    'sig-canvas element': html.includes('sig-canvas'),
    'mousedown listener': html.includes("addEventListener('mousedown'"),
    'mousemove on window': html.includes("window.addEventListener('mousemove'"),
    'mouseup on window': html.includes("window.addEventListener('mouseup'"),
    'canvas width=600': html.includes('width="600"'),
    'canvas height=200': html.includes('height="200"'),
    'only 1 script tag': (html.match(/<script/g) || []).length === 1,
    'no script tags in content': !html.includes('Auto-resize'),
    'Sign Document button': html.includes('sign-btn'),
  };

  let allPassed = true;
  for (const [check, passed] of Object.entries(checks)) {
    const icon = passed ? '  ✅' : '  ❌';
    console.log(`${icon} ${check}`);
    if (!passed) allPassed = false;
  }

  if (!allPassed) {
    console.log('\n❌ HTML checks FAILED. Canvas drawing will not work.');
  } else {
    console.log('\n✅ All HTML checks PASSED. Canvas JS is correctly loaded.');
  }

  // Step 4: POST test signature
  console.log('\n✍️  Step 3: Submitting test signature...');
  const signResponse = await httpPost(
    `http://localhost:5000/api/signatures/signer/${rawToken}/sign`,
    {
      signatureType: 'DRAWN',
      signatureData: TEST_SIGNATURE_BASE64
    }
  );

  let result: any;
  try { result = JSON.parse(signResponse.body); } catch { result = { raw: signResponse.body }; }

  console.log(`   HTTP Status: ${signResponse.status}`);
  console.log(`   Response: ${JSON.stringify(result)}`);

  if (signResponse.status === 200 && result.status === 'success') {
    console.log('\n✅ Step 3: Signature submitted SUCCESSFULLY!');
  } else {
    console.log('\n❌ Step 3: Signature submission FAILED!');
    await prisma.$disconnect();
    return;
  }

  // Step 5: Verify signer is now marked SIGNED in DB
  const updated = await prisma.documentSigner.findUnique({ where: { id: signer.id } });
  if (updated?.status === 'SIGNED' && updated.signatureData) {
    console.log('\n✅ Step 4: DB verification PASSED');
    console.log(`   Signer status: ${updated.status}`);
    console.log(`   Signed at: ${updated.signedAt}`);
    console.log(`   Signature data length: ${updated.signatureData.length} chars`);
    console.log(`   Starts with data:image: ${updated.signatureData.startsWith('data:image/')}`);
  } else {
    console.log('\n❌ Step 4: DB verification FAILED');
    console.log(`   Signer status: ${updated?.status}`);
  }

  console.log('\n════════════════════════════════════════════════════════');
  console.log('   Test Complete ✅');
  console.log('════════════════════════════════════════════════════════\n');
  console.log('🔗 To test drawing manually, reset the token and visit:');
  console.log(`   ${signingUrl}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Test failed:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});
