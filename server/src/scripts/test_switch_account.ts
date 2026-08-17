import { PrismaClient } from '@prisma/client';
import http from 'http';

const prisma = new PrismaClient();

async function httpPost(url: string, data: object): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(data);
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 5000,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode || 0, body: parsed });
        } catch {
          resolve({ status: res.statusCode || 0, body });
        }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function main() {
  console.log('\n════════════════════════════════════════════════════════');
  console.log('   LexDraft Switch Account Security & Audit Trail Test');
  console.log('════════════════════════════════════════════════════════\n');

  const testEmail = 'lawyer@apexlegal.in';

  // Clean old logs matching this user
  const user = await prisma.user.findFirst({ where: { email: testEmail } });
  if (!user) {
    throw new Error('Test lawyer user not found in database');
  }

  await prisma.activityLog.deleteMany({
    where: { userId: user.id, action: 'ACCOUNT_SWITCH_LOGIN' },
  });

  console.log('1. Testing switch account with INCORRECT password...');
  const failedRes = await httpPost('http://localhost:5000/api/auth/login', {
    email: testEmail,
    password: 'WrongPasswordXYZ!',
    isSwitch: true,
  });

  if (failedRes.status !== 401) {
    throw new Error(`❌ Error: Expected status 401, got ${failedRes.status}`);
  }
  console.log('✅ Correctly blocked: invalid password returned status 401.');

  // Verify no logs were created
  const failedLogs = await prisma.activityLog.findMany({
    where: { userId: user.id, action: 'ACCOUNT_SWITCH_LOGIN' },
  });
  if (failedLogs.length > 0) {
    throw new Error('❌ Error: ACCOUNT_SWITCH_LOGIN log was recorded for a failed switch attempt!');
  }
  console.log('✅ Correctly secured: no audit log recorded for failed attempt.');

  console.log('\n2. Testing switch account with CORRECT password...');
  const successRes = await httpPost('http://localhost:5000/api/auth/login', {
    email: testEmail,
    password: 'password123',
    isSwitch: true,
  });

  if (successRes.status !== 200) {
    throw new Error(`❌ Error: Expected status 200, got ${successRes.status}`);
  }
  console.log('✅ Success: correct password returned status 200.');

  // Verify audit log was created
  const successLogs = await prisma.activityLog.findMany({
    where: { userId: user.id, action: 'ACCOUNT_SWITCH_LOGIN' },
  });
  if (successLogs.length === 0) {
    throw new Error('❌ Error: ACCOUNT_SWITCH_LOGIN log was not found in the DB.');
  }

  const log = successLogs[0];
  console.log(`✅ Audit Trail Verified!`);
  console.log(`   Action: ${log.action}`);
  console.log(`   User: ${log.entityName}`);
  console.log(`   Details: ${log.details}`);

  // Cleanup
  await prisma.activityLog.deleteMany({
    where: { userId: user.id, action: 'ACCOUNT_SWITCH_LOGIN' },
  });

  console.log('\n════════════════════════════════════════════════════════');
  console.log('   Switch Account Security Tests PASSED!');
  console.log('════════════════════════════════════════════════════════\n');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
