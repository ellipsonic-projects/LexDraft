import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}/api`;

async function main() {
  console.log('\n════════════════════════════════════════════════════════');
  console.log('   LexDraft Template Deletion Integration Test Suite');
  console.log('════════════════════════════════════════════════════════\n');

  const timestamp = Date.now();
  let partnerToken = '';
  let lawyerToken = '';
  let partnerOrgId = '';
  let partnerUserId = '';

  // ─── 1. Authenticate Users ──────────────────────────────────────────────────
  try {
    const partnerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'partner@apexlegal.in', password: 'password123' })
    });
    if (!partnerLoginRes.ok) {
      throw new Error(`Partner login failed with status ${partnerLoginRes.status}`);
    }
    const partnerData = await partnerLoginRes.json() as any;
    partnerToken = partnerData.data.accessToken;
    partnerOrgId = partnerData.data.user.organizationId;
    partnerUserId = partnerData.data.user.id;

    console.log(`✅ Logged in as Partner (Org: ${partnerOrgId})`);

    const lawyerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'lawyer@apexlegal.in', password: 'password123' })
    });
    if (!lawyerLoginRes.ok) {
      throw new Error(`Lawyer login failed with status ${lawyerLoginRes.status}`);
    }
    const lawyerData = await lawyerLoginRes.json() as any;
    lawyerToken = lawyerData.data.accessToken;
    console.log(`✅ Logged in as Associate Lawyer`);
  } catch (err: any) {
    console.error('❌ Authentication failed:', err.message);
    process.exit(1);
  }

  // Find a second organization for cross-org testing
  const otherOrg = await prisma.organization.findFirst({
    where: { id: { not: partnerOrgId } }
  });
  if (!otherOrg) {
    console.warn('⚠️  Warning: Only one organization found in DB. Cross-organization isolation test will be skipped or mock-tested.');
  }

  // Store lists of generated ID keys to ensure precise cleanup
  const createdTemplateIds: string[] = [];
  const createdDocumentIds: string[] = [];

  try {
    // ─── TEST 1: Creation of a Temporary Unused Template ─────────────────────
    console.log('\n[Test 1] Creating a brand-new temporary unused template...');
    const unusedTplName = `LexDraft DELETE TEST - Unused - ${timestamp}`;
    const createRes1 = await fetch(`${BASE_URL}/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${partnerToken}`
      },
      body: JSON.stringify({
        name: unusedTplName,
        category: 'General',
        description: 'Temporary template created specifically for deletion audit verification.',
        originalFileName: 'audit_test_unused.docx',
        contentTemplate: '<p>This is a temporary legal template containing paragraph nodes.</p>',
        variables: []
      })
    });

    if (createRes1.status !== 201) {
      throw new Error(`Failed to create template: Status ${createRes1.status}`);
    }
    const tplData1 = await createRes1.json() as any;
    const unusedTplId = tplData1.data.template.id;
    createdTemplateIds.push(unusedTplId);
    console.log(`✅ Template created successfully. ID: ${unusedTplId}`);

    // Verify it exists in DB
    const dbUnusedTpl = await prisma.legalTemplate.findUnique({ where: { id: unusedTplId } });
    if (!dbUnusedTpl) throw new Error('Unused template row not found in database.');
    console.log(`✅ DB verification: Row exists with name "${dbUnusedTpl.name}"`);


    // ─── TEST 2: Hard Deletion of Unused Template ────────────────────────────
    console.log('\n[Test 2] Testing hard deletion of unused template...');
    const deleteRes1 = await fetch(`${BASE_URL}/templates/${unusedTplId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${partnerToken}` }
    });

    if (deleteRes1.status !== 200) {
      throw new Error(`Unused delete failed: Status ${deleteRes1.status}`);
    }
    const delData1 = await deleteRes1.json() as any;
    if (delData1.data.mode !== 'hard') {
      throw new Error(`Expected hard delete, got: ${delData1.data.mode}`);
    }
    console.log(`✅ API response indicates "hard" deletion mode`);

    // Verify it is gone from the database
    const dbUnusedTplPost = await prisma.legalTemplate.findUnique({ where: { id: unusedTplId } });
    if (dbUnusedTplPost) {
      throw new Error('Unused template row still exists in database after hard delete.');
    }
    console.log('✅ DB verification: Row is completely gone from the database');


    // ─── TEST 3: Unauthorized Deletion Rejected ─────────────────────────────
    console.log('\n[Test 3] Testing role-based access control (RBAC)...');
    const authTplName = `LexDraft DELETE TEST - Unauthorized - ${timestamp}`;
    const createRes2 = await fetch(`${BASE_URL}/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${partnerToken}`
      },
      body: JSON.stringify({
        name: authTplName,
        category: 'General',
        description: 'Temporary template created specifically for unauthorized deletion audit.',
        originalFileName: 'audit_test_unauth.docx',
        contentTemplate: '<p>This is a temporary legal template containing paragraph nodes.</p>',
        variables: []
      })
    });
    const tplData2 = await createRes2.json() as any;
    const unauthorizedTplId = tplData2.data.template.id;
    createdTemplateIds.push(unauthorizedTplId);

    // Attempt to delete using lawyer token (Associate Lawyer, role EMPLOYEE)
    const deleteResAuth = await fetch(`${BASE_URL}/templates/${unauthorizedTplId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${lawyerToken}` }
    });
    if (deleteResAuth.status !== 403) {
      throw new Error(`Expected status 403 Forbidden, got: ${deleteResAuth.status}`);
    }
    console.log('✅ Correctly blocked: Associate Lawyer was rejected with 403 Forbidden');

    // Verify it still exists in the DB
    const dbAuthTpl = await prisma.legalTemplate.findUnique({ where: { id: unauthorizedTplId } });
    if (!dbAuthTpl) throw new Error('Template was incorrectly deleted despite authorization failure.');
    console.log('✅ DB verification: Template remains intact in database');


    // ─── TEST 4: Cross-Organization Deletion Rejected ─────────────────────────
    if (otherOrg) {
      console.log('\n[Test 4] Testing tenant isolation (Cross-Organization deletion)...');
      
      // Update our unauthorized template to belong to the other organization
      await prisma.legalTemplate.update({
        where: { id: unauthorizedTplId },
        data: { organizationId: otherOrg.id }
      });
      console.log(`[Setup] Moved template ${unauthorizedTplId} to other organization ${otherOrg.id}`);

      // Attempt to delete template using partnerToken (belongs to partnerOrgId)
      const deleteResCross = await fetch(`${BASE_URL}/templates/${unauthorizedTplId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${partnerToken}` }
      });

      // It should fail with 404 (or 403) because the endpoint filters query scoped to Partner's org
      if (deleteResCross.status !== 404) {
        throw new Error(`Expected status 404 Not Found, got: ${deleteResCross.status}`);
      }
      console.log('✅ Correctly blocked: Cross-organization deletion rejected with 404 Not Found');

      // Restore organizationId for DB cleanup
      await prisma.legalTemplate.update({
        where: { id: unauthorizedTplId },
        data: { organizationId: partnerOrgId }
      });
    }


    // ─── TEST 5: Non-existent Template Delete Returns 404 ─────────────────────
    console.log('\n[Test 5] Testing non-existent template deletion...');
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const deleteResFake = await fetch(`${BASE_URL}/templates/${fakeId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${partnerToken}` }
    });
    if (deleteResFake.status !== 404) {
      throw new Error(`Expected status 404 Not Found, got: ${deleteResFake.status}`);
    }
    console.log('✅ Correctly rejected nonexistent template with 404 Not Found');


    // ─── TEST 6: Soft Deletion of historically used template ─────────────────
    console.log('\n[Test 6] Testing soft-deletion for historically used templates...');
    const usedTplName = `LexDraft DELETE TEST - Used - ${timestamp}`;
    const createRes3 = await fetch(`${BASE_URL}/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${partnerToken}`
      },
      body: JSON.stringify({
        name: usedTplName,
        category: 'General',
        description: 'Temporary template created specifically for soft-deletion usage check.',
        originalFileName: 'audit_test_used.docx',
        contentTemplate: '<p>This is a temporary legal template containing paragraph nodes.</p>',
        variables: []
      })
    });
    const tplData3 = await createRes3.json() as any;
    const usedTplId = tplData3.data.template.id;
    createdTemplateIds.push(usedTplId);

    // Fetch a sample client and matter to hook up the document relation
    const client = await prisma.client.findFirst({ where: { organizationId: partnerOrgId } });
    if (!client) {
      throw new Error('Need at least one client in DB to perform used template check.');
    }
    const matter = await prisma.matter.findFirst({ where: { clientId: client.id } });
    if (!matter) {
      throw new Error('Need at least one matter in DB to perform used template check.');
    }

    // Create a mock document referencing this template
    const testDoc = await prisma.legalDocument.create({
      data: {
        title: `Audit Deletion Test Document - ${timestamp}`,
        content: '<p>Historical lease agreement content</p>',
        templateId: usedTplId,
        templateVersionAtGeneration: '1.0',
        clientId: client.id,
        matterId: matter.id,
        authorId: partnerUserId,
        organizationId: partnerOrgId,
        variables: {},
        dueDate: new Date()
      }
    });
    createdDocumentIds.push(testDoc.id);
    console.log(`[Setup] Reference document created successfully. ID: ${testDoc.id}`);

    // Call deletion API on the template
    const deleteResUsed = await fetch(`${BASE_URL}/templates/${usedTplId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${partnerToken}` }
    });

    if (deleteResUsed.status !== 200) {
      throw new Error(`Used template delete failed: Status ${deleteResUsed.status}`);
    }
    const delDataUsed = await deleteResUsed.json() as any;
    if (delDataUsed.data.mode !== 'soft') {
      throw new Error(`Expected soft-delete mode, got: ${delDataUsed.data.mode}`);
    }
    console.log(`✅ API response indicates "soft" deletion mode`);

    // Verify it still exists in the DB but is marked 'inactive'
    const dbUsedTpl = await prisma.legalTemplate.findUnique({ where: { id: usedTplId } });
    if (!dbUsedTpl) {
      throw new Error('Used template was hard-deleted despite document references.');
    }
    if (dbUsedTpl.status !== 'inactive') {
      throw new Error(`Expected status 'inactive', got: ${dbUsedTpl.status}`);
    }
    console.log(`✅ DB verification: Template row still exists, status set to "${dbUsedTpl.status}"`);

    // Verify historical document remains intact
    const dbDoc = await prisma.legalDocument.findUnique({ where: { id: testDoc.id } });
    if (!dbDoc) {
      throw new Error('Historical document was deleted/orphaned.');
    }
    console.log('✅ DB verification: Historical document remains fully intact');


    // ─── TEST 7: ActivityLog verification ─────────────────────────────────────
    console.log('\n[Test 7] Verifying ActivityLog database logging...');
    const recentLogs = await prisma.activityLog.findMany({
      where: {
        userId: partnerUserId,
        action: { in: ['TEMPLATE_DELETED', 'TEMPLATE_SOFT_DELETED'] }
      },
      orderBy: { timestamp: 'desc' },
      take: 2
    });

    if (recentLogs.length < 2) {
      throw new Error(`Expected at least 2 activity logs, found ${recentLogs.length}`);
    }
    console.log(`✅ Found TEMPLATE_DELETED log: "${recentLogs.find(l => l.action === 'TEMPLATE_DELETED')?.details}"`);
    console.log(`✅ Found TEMPLATE_SOFT_DELETED log: "${recentLogs.find(l => l.action === 'TEMPLATE_SOFT_DELETED')?.details}"`);

  } finally {
    // ─── 8. Clean up ALL test records safely ──────────────────────────────────
    console.log('\n════════════════════════════════════════════════════════');
    console.log('   Cleaning up temporary test records...');
    console.log('════════════════════════════════════════════════════════');

    for (const docId of createdDocumentIds) {
      await prisma.legalDocument.deleteMany({ where: { id: docId } });
    }
    for (const tplId of createdTemplateIds) {
      // First clean up any template versions created during test edits
      await prisma.templateVersion.deleteMany({ where: { templateId: tplId } });
      await prisma.legalTemplate.deleteMany({ where: { id: tplId } });
    }
    console.log('✅ Cleaned up all generated test documents and templates');
  }

  console.log('\n════════════════════════════════════════════════════════');
  console.log('   All Phase 1 Template Deletion Integration Tests PASSED!');
  console.log('════════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n❌ Integration Test failed:', err);
  process.exit(1);
});
