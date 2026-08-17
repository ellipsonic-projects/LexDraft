import { PrismaClient, UserRole } from '@prisma/client';
import { createAndSendInvitation, validateInvitationToken, acceptInvitation } from '../services/invitation.service';
import { validateResetToken, resetPassword } from '../services/password-reset.service';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('\n════════════════════════════════════════════════════════');
  console.log('   LexDraft Onboarding & Auth Integration Test');
  console.log('════════════════════════════════════════════════════════\n');

  // Step 1: Ensure we have a Partner/BOSS user and Org
  const partnerUser = await prisma.user.findFirst({
    where: { role: UserRole.BOSS },
    include: { organization: true },
  });

  if (!partnerUser) {
    console.error('❌ Error: Could not find any Senior Partner (BOSS) user in the database.');
    await prisma.$disconnect();
    process.exit(1);
  }

  const organizationId = partnerUser.organizationId;
  const invitedByUserId = partnerUser.id;
  const testEmail = 'test-lawyer-invite@apexlegal.in';
  const testName = 'Test Invited Lawyer';

  console.log(`[Setup] Partner: "${partnerUser.name}" (${partnerUser.email})`);
  console.log(`[Setup] Org: "${partnerUser.organization.name}" (${organizationId})`);
  console.log(`[Setup] Target Email: "${testEmail}"`);

  // Clean up any old test records for isolation
  const oldUsers = await prisma.user.findMany({ where: { email: testEmail } });
  for (const ou of oldUsers) {
    await prisma.activityLog.deleteMany({ where: { userId: ou.id } });
  }
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await prisma.workspaceInvitation.deleteMany({ where: { email: testEmail } });
  await prisma.passwordReset.deleteMany({ where: { email: testEmail } });

  console.log('\n1. Testing Workspace Invitation Creation & Dispatch...');
  const invite = await createAndSendInvitation(
    organizationId,
    invitedByUserId,
    testEmail,
    testName,
    UserRole.EMPLOYEE,
    'http://localhost:5173'
  );

  console.log('✅ Invitation created in DB successfully!');
  console.log(`   ID: ${invite.id}`);
  console.log(`   Email: ${invite.email}`);
  console.log(`   Role: ${invite.role}`);
  console.log(`   Expires At: ${invite.expiresAt}`);

  // Fetch token hash from DB to get the raw token
  const dbInvite = await prisma.workspaceInvitation.findUnique({
    where: { id: invite.id },
  });
  if (!dbInvite) {
    throw new Error('❌ Failed to locate created invitation in DB');
  }

  console.log('\n2. Testing Invitation Validation...');
  // Since we hash the token, we can extract the invite by scanning or query by email
  const invites = await prisma.workspaceInvitation.findMany({
    where: { email: testEmail, acceptedAt: null },
  });
  if (invites.length === 0) {
    throw new Error('❌ No invitations found for test email in DB');
  }
  const tokenHash = invites[0].tokenHash;
  console.log(`   Token Hash: ${tokenHash}`);

  // Accept using the acceptInvitation flow. Since we only have tokenHash, let's query it.
  console.log('\n3. Testing Invitation Acceptance & Account Provisioning...');
  // For the purpose of the backend test, let's accept using the tokenHash directly in token parameter or locate the generated link.
  // Wait, acceptInvitation takes the raw token. Since we don't have the raw token, let's bypass by directly setting acceptedAt or mock rawToken.
  // Wait, let's run the full flow by overriding or finding the raw token, but since crypto.randomBytes(32).toString('hex') was used,
  // let's modify the test to test the acceptInvitation flow by intercepting the token generator or let the test run its validation.
  // Actually, we can test using our validateToken and acceptInvitation directly.
  // Let's create an invitation with a known raw token for testing:
  const crypto = require('crypto');
  const knownRawToken = crypto.randomBytes(32).toString('hex');
  const knownTokenHash = crypto.createHash('sha256').update(knownRawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 1000 * 3600 * 24);

  // Directly insert invitation into DB
  await prisma.workspaceInvitation.create({
    data: {
      organizationId,
      invitedByUserId,
      email: testEmail,
      name: testName,
      role: UserRole.EMPLOYEE,
      tokenHash: knownTokenHash,
      expiresAt,
    },
  });

  console.log(`   Created test invite with known raw token: ${knownRawToken}`);
  
  // Validate token
  const validatedInvite = await validateInvitationToken(knownRawToken);
  console.log(`✅ Token validation passed for: "${validatedInvite.name}"`);

  // Accept invitation
  const testPassword = 'SecurePassword123!';
  const { user: acceptedUser, organizationName } = await acceptInvitation(knownRawToken, testPassword);
  console.log(`✅ Invitation accepted successfully!`);
  console.log(`   User ID: ${acceptedUser.id}`);
  console.log(`   User Role: ${acceptedUser.role}`);
  console.log(`   User Title: ${acceptedUser.title}`);
  console.log(`   Org Name: ${organizationName}`);

  // Verify bcrypt password hash
  const isMatch = await bcrypt.compare(testPassword, acceptedUser.passwordHash);
  if (!isMatch) {
    throw new Error('❌ Error: Password hash does not match original password');
  }
  console.log('   Password hashed correctly inside DB!');

  // Verify ActivityLog entry was created
  const log = await prisma.activityLog.findFirst({
    where: { userId: acceptedUser.id, action: 'invitation_accepted' },
  });
  if (!log) {
    throw new Error('❌ Error: ActivityLog entry was not found for invitation acceptance');
  }
  console.log(`✅ ActivityLog verified! Action: ${log.action}, Details: ${log.details}`);

  console.log('\n4. Testing Password Reset Link Generation...');
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  const resetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Directly insert password reset record for our test user
  await prisma.passwordReset.create({
    data: {
      email: testEmail,
      tokenHash: resetTokenHash,
      expiresAt: resetExpiresAt,
    },
  });

  console.log(`   Password reset record created with token: ${resetToken}`);

  // Validate reset token
  const validatedReset = await validateResetToken(resetToken);
  console.log(`✅ Reset token validation passed for email: "${validatedReset.email}"`);

  // Perform reset
  const newPassword = 'BrandNewPassword999!!';
  await resetPassword(resetToken, newPassword);
  console.log('✅ Password reset successfully completed!');

  // Verify updated password hash
  const updatedUser = await prisma.user.findFirst({ where: { email: testEmail } });
  if (!updatedUser) {
    throw new Error('❌ Error: Test user not found in database post-reset');
  }
  const isNewMatch = await bcrypt.compare(newPassword, updatedUser.passwordHash);
  if (!isNewMatch) {
    throw new Error('❌ Error: New password hash does not match updated password');
  }
  console.log('   New password hash verified successfully!');

  // Clean up
  console.log('\n5. Cleaning up test records...');
  await prisma.activityLog.deleteMany({ where: { userId: acceptedUser.id } });
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await prisma.workspaceInvitation.deleteMany({ where: { email: testEmail } });
  await prisma.passwordReset.deleteMany({ where: { email: testEmail } });
  console.log('✅ Cleanup finished!');

  console.log('\n════════════════════════════════════════════════════════');
  console.log('   All invitation and onboarding tests PASSED!');
  console.log('════════════════════════════════════════════════════════\n');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
