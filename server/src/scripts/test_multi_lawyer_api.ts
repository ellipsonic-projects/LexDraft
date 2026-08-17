import { PrismaClient, UserRole } from '@prisma/client';
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

async function httpGet(url: string, token: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 5000,
      path: parsedUrl.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
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
    req.end();
  });
}

async function main() {
  console.log('\n════════════════════════════════════════════════════════');
  console.log('   Multi-Lawyer Authentication & Scoping Test');
  console.log('════════════════════════════════════════════════════════\n');

  const emails = ['rahul@test.com', 'priya@test.com'];
  const expectedNames = ['Rahul Kumar', 'Priya Sharma'];

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    const expectedName = expectedNames[i];

    console.log(`\nTesting login for: ${expectedName} (${email})`);

    // 1. Post to login
    const loginRes = await httpPost('http://localhost:5000/api/auth/login', {
      email,
      password: 'Password123!',
    });

    if (loginRes.status !== 200) {
      throw new Error(`❌ Login failed with status: ${loginRes.status}. Output: ${JSON.stringify(loginRes.body)}`);
    }

    const token = loginRes.body.data.accessToken;
    console.log('✅ Login successful! Token retrieved.');

    // 2. Fetch /auth/me
    const meRes = await httpGet('http://localhost:5000/api/auth/me', token);
    if (meRes.status !== 200) {
      throw new Error(`❌ /auth/me failed with status: ${meRes.status}`);
    }

    const user = meRes.body.data.user;
    console.log(`✅ /auth/me verified!`);
    console.log(`   User Name: ${user.name}`);
    console.log(`   User Role: ${user.role}`);
    console.log(`   User Title: ${user.title}`);

    if (user.name !== expectedName) {
      throw new Error(`❌ Error: Expected name "${expectedName}", got "${user.name}"`);
    }
    if (user.role !== UserRole.EMPLOYEE) {
      throw new Error(`❌ Error: Expected role "EMPLOYEE", got "${user.role}"`);
    }
    console.log(`✨ Success: Authentication, name mapping, and title resolved correctly for ${expectedName}.`);
  }

  console.log('\n════════════════════════════════════════════════════════');
  console.log('   All Multi-Lawyer API Tests PASSED!');
  console.log('════════════════════════════════════════════════════════\n');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
