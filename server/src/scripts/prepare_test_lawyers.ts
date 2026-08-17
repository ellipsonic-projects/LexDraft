import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Preparing test lawyer accounts in DB...');

  const org = await prisma.organization.findFirst();
  if (!org) {
    throw new Error('No organization found');
  }

  const emails = ['rahul@test.com', 'priya@test.com'];
  const names = ['Rahul Kumar', 'Priya Sharma'];

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    const name = names[i];

    // Clean up
    await prisma.activityLog.deleteMany({
      where: { user: { email } },
    });
    await prisma.user.deleteMany({
      where: { email },
    });
    await prisma.workspaceInvitation.deleteMany({
      where: { email },
    });

    // Create user
    const passwordHash = await bcrypt.hash('Password123!', 12);
    await prisma.user.create({
      data: {
        organizationId: org.id,
        email,
        name,
        role: UserRole.EMPLOYEE,
        title: 'Associate Lawyer',
        passwordHash,
        accountStatus: 'active',
      },
    });

    console.log(`✅ Created test lawyer user: ${name} (${email})`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
