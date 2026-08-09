import { PrismaClient, UserRole, VariableType, MatterStatus, CustomizationRequestStatus, DocumentStatus, TaskStatus, TaskPriority, NotificationType, EntityType } from '@prisma/client';

const prisma = new PrismaClient();

// Pre-computed bcrypt hash for 'password123'
const PASSWORD_HASH = '$2b$10$fXDZrRD9SlPcMc7v7.gx1.xNKNxBJoWCI6ADaHVYL2LkFdEjziehq';

async function main() {
  console.log('Clearing database...');
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.reviewCycle.deleteMany();
  await prisma.inlineComment.deleteMany();
  await prisma.documentVersion.deleteMany();
  await prisma.workflowTask.deleteMany();
  await prisma.legalDocument.deleteMany();
  await prisma.customizationRequest.deleteMany();
  await prisma.templateVersion.deleteMany();
  await prisma.templateVariable.deleteMany();
  await prisma.legalTemplate.deleteMany();
  await prisma.matter.deleteMany();
  await prisma.client.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  console.log('Seeding database...');

  // 1. Create Organization
  const org = await prisma.organization.create({
    data: {
      id: 'org_apex',
      name: 'Apex Legal Advocates & Solicitors',
      plan: 'Enterprise',
      totalMembers: 2
    }
  });

  // 2. Create Users
  const partner = await prisma.user.create({
    data: {
      id: 'usr_partner',
      email: 'partner@apexlegal.in',
      passwordHash: PASSWORD_HASH,
      name: 'Adv. Rajesh Varma',
      role: UserRole.BOSS,
      title: 'Senior Managing Partner',
      avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200',
      status: 'online',
      organizationId: org.id
    }
  });

  const lawyer = await prisma.user.create({
    data: {
      id: 'usr_lawyer',
      email: 'lawyer@apexlegal.in',
      passwordHash: PASSWORD_HASH,
      name: 'Adv. Ananya Roy',
      role: UserRole.EMPLOYEE,
      title: 'Senior Associate Lawyer',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
      status: 'online',
      organizationId: org.id
    }
  });

  // 3. Create Clients
  const clientAarav = await prisma.client.create({
    data: {
      id: 'client_aarav',
      name: 'Aarav Mehta',
      contactEmail: 'aarav@mehtapremises.com',
      contactPhone: '+91 98765 43210',
      organizationId: org.id
    }
  });

  const clientTechcorp = await prisma.client.create({
    data: {
      id: 'client_techcorp',
      name: 'TechCorp Solutions Inc',
      contactEmail: 'legal@techcorp.com',
      contactPhone: '+1 555 019 2834',
      organizationId: org.id
    }
  });

  // 4. Create Matters
  const matterAaravLease = await prisma.matter.create({
    data: {
      id: 'matter_aarav_lease',
      clientId: clientAarav.id,
      title: 'Aarav Mehta — Commercial Lease',
      matterCode: 'MAT-2026-001',
      status: MatterStatus.active
    }
  });

  const matterTechcorpNda = await prisma.matter.create({
    data: {
      id: 'matter_techcorp_nda',
      clientId: clientTechcorp.id,
      title: 'TechCorp — Standard Mutual NDA',
      matterCode: 'MAT-2026-002',
      status: MatterStatus.active
    }
  });

  // 5. Create Templates
  const templateRental = await prisma.legalTemplate.create({
    data: {
      id: 'tpl_rental',
      name: 'Residential & Commercial Lease Agreement',
      category: 'Real Estate',
      description: 'Standardized landlord-tenant lease agreement with clauses for rent, security deposit, notice period, and maintenance duties.',
      originalFileName: 'Master_Lease_Agreement_2026.docx',
      contentTemplate: `<h1>RESIDENTIAL & COMMERCIAL LEASE AGREEMENT</h1>
<p>This Lease Agreement is made and executed on <strong>{{Lease_Start_Date}}</strong> at <strong>{{Jurisdiction_City}}</strong> by and between:</p>

<p><strong>LESSOR (LANDLORD):</strong> <strong>{{Landlord_Name}}</strong>, hereinafter called the LESSOR (which expression shall unless excluded by or repugnant to the context be deemed to include his heirs, executors, administrators, and assigns) of the FIRST PART;</p>

<p>AND</p>

<p><strong>LESSEE (TENANT):</strong> <strong>{{Tenant_Name}}</strong>, hereinafter called the LESSEE (which expression shall unless excluded by or repugnant to the context be deemed to include its successors and permitted assigns) of the SECOND PART.</p>

<h2>1. DEMISED PREMISES</h2>
<p>The Lessor hereby agrees to lease out and the Lessee hereby agrees to take on lease the premises situated at <strong>{{Property_Address}}</strong> (hereinafter referred to as the "Demised Premises").</p>

<h2>2. TERM AND RENT</h2>
<p>The lease term shall be for a duration of <strong>{{Lease_Term_Months}} months</strong> starting from <strong>{{Lease_Start_Date}}</strong>. The Lessee shall pay to the Lessor a monthly rent of <strong>₹{{Monthly_Rent}}</strong> payable on or before the 5th of each calendar month. The Lessee has deposited a interest-free refundable security deposit of <strong>₹{{Security_Deposit}}</strong> with the Lessor.</p>

<h2>3. TERMINATION AND NOTICE PERIOD</h2>
<p>Either party may terminate this agreement by giving <strong>{{Notice_Period_Months}} months</strong> written notice to the other party.</p>

<h2>4. JURISDICTION</h2>
<p>This agreement shall be governed by the laws of India and courts in <strong>{{Jurisdiction_City}}</strong> shall have exclusive jurisdiction.</p>`,
      version: '1.2',
      usageCount: 42,
      status: 'active',
      organizationId: org.id
    }
  });

  const templateNda = await prisma.legalTemplate.create({
    data: {
      id: 'tpl_nda',
      name: 'Non-Disclosure & Confidentiality Agreement (NDA)',
      category: 'IP & Tech',
      description: 'Mutual non-disclosure agreement for M&A diligence, tech partnerships, and corporate consultations.',
      originalFileName: 'Standard_Mutual_NDA_v2.docx',
      contentTemplate: `<h1>MUTUAL NON-DISCLOSURE AGREEMENT</h1>
<p>This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of <strong>{{Effective_Date}}</strong> by and between <strong>{{Party_A_Name}}</strong> and <strong>{{Party_B_Name}}</strong>.</p>

<h2>1. PURPOSE</h2>
<p>The parties wish to explore a potential business relationship concerning: <strong>{{Purpose}}</strong> ("Purpose").</p>

<h2>2. CONFIDENTIALITY OBLIGATIONS</h2>
<p>Each party agrees to maintain in strict confidence all proprietary technical, financial, and legal information for a period of <strong>{{Confidentiality_Years}} years</strong> from the Effective Date.</p>`,
      version: '2.0',
      usageCount: 88,
      status: 'active',
      organizationId: org.id
    }
  });

  // 6. Create Template Variables
  await prisma.templateVariable.createMany({
    data: [
      { templateId: templateRental.id, key: 'Landlord_Name', label: 'Landlord / Lessor Name', type: VariableType.text, required: true, defaultValue: 'Adv. Suresh Oberoi' },
      { templateId: templateRental.id, key: 'Tenant_Name', label: 'Tenant / Lessee Name', type: VariableType.text, required: true, defaultValue: 'Aarav Mehta' },
      { templateId: templateRental.id, key: 'Property_Address', label: 'Premises Address', type: VariableType.address, required: true, defaultValue: 'Flat 402, Lotus Towers, MG Road, Bengaluru' },
      { templateId: templateRental.id, key: 'Monthly_Rent', label: 'Monthly Rent (₹)', type: VariableType.currency, required: true, defaultValue: '45000' },
      { templateId: templateRental.id, key: 'Security_Deposit', label: 'Security Deposit (₹)', type: VariableType.currency, required: true, defaultValue: '270000' },
      { templateId: templateRental.id, key: 'Lease_Start_Date', label: 'Lease Commencement Date', type: VariableType.date, required: true, defaultValue: '2026-09-01' },
      { templateId: templateRental.id, key: 'Lease_Term_Months', label: 'Lease Duration (Months)', type: VariableType.number, required: true, defaultValue: '11' },
      { templateId: templateRental.id, key: 'Notice_Period_Months', label: 'Notice Period (Months)', type: VariableType.number, required: true, defaultValue: '2' },
      { templateId: templateRental.id, key: 'Jurisdiction_City', label: 'Court Jurisdiction City', type: VariableType.text, required: true, defaultValue: 'Bengaluru' },
      // NDA
      { templateId: templateNda.id, key: 'Party_A_Name', label: 'Disclosing Party Name', type: VariableType.text, required: true, defaultValue: 'Apex Legal Advocates' },
      { templateId: templateNda.id, key: 'Party_B_Name', label: 'Receiving Party Name', type: VariableType.text, required: true, defaultValue: 'TechCorp Solutions Inc' },
      { templateId: templateNda.id, key: 'Purpose', label: 'Evaluation Purpose', type: VariableType.multiline, required: true, defaultValue: 'Evaluating potential merger and technical API integration.' },
      { templateId: templateNda.id, key: 'Confidentiality_Years', label: 'Term Duration (Years)', type: VariableType.number, required: true, defaultValue: '3' },
      { templateId: templateNda.id, key: 'Effective_Date', label: 'Effective Date', type: VariableType.date, required: true, defaultValue: '2026-08-04' }
    ]
  });

  // 7. Create Template Versions
  await prisma.templateVersion.createMany({
    data: [
      { templateId: templateRental.id, versionText: 'v1.0 version text placeholder', changeSummary: 'Initial standard template creation.', editedById: partner.id },
      { templateId: templateRental.id, versionText: 'v1.1 version text placeholder', changeSummary: 'Updated demised premises description.', editedById: partner.id },
      { templateId: templateRental.id, versionText: 'v1.2 version text placeholder', changeSummary: 'Merged security deposit variables and added lease term field.', editedById: partner.id },
      // NDA
      { templateId: templateNda.id, versionText: 'v1.0 NDA version text', changeSummary: 'Initial standard NDA draft.', editedById: partner.id },
      { templateId: templateNda.id, versionText: 'v2.0 NDA version text', changeSummary: 'Upgraded mutual diligence clauses to modern corporate compliance norms.', editedById: partner.id }
    ]
  });

  // 8. Create Template Customization Request
  await prisma.customizationRequest.create({
    data: {
      id: 'cust_101',
      templateId: templateRental.id,
      requestedById: lawyer.id,
      customVariables: [
        { id: 'cv_new1', key: 'Late_Fee_Percentage', label: 'Late Payment Interest Rate (%)', type: 'number', required: false, defaultValue: '1.5' }
      ],
      reason: 'Client requested explicit late rent payment interest clause for commercial properties.',
      status: CustomizationRequestStatus.pending
    }
  });

  // 9. Create Legal Document
  const doc = await prisma.legalDocument.create({
    data: {
      id: 'doc_101',
      templateId: templateRental.id,
      templateVersionAtGeneration: '1.2',
      title: 'Lease Agreement - Aarav Mehta Premises',
      clientId: clientAarav.id,
      matterId: matterAaravLease.id,
      authorId: lawyer.id,
      status: DocumentStatus.under_review,
      priority: TaskPriority.high,
      dueDate: new Date('2026-08-06'),
      content: `<h1>RESIDENTIAL & COMMERCIAL LEASE AGREEMENT</h1>
<p>This Lease Agreement is made and executed on <strong>2026-09-01</strong> at <strong>Bengaluru</strong> by and between:</p>

<p><strong>LESSOR (LANDLORD):</strong> <strong>Adv. Suresh Oberoi</strong>, hereinafter called the LESSOR of the FIRST PART;</p>

<p>AND</p>

<p><strong>LESSEE (TENANT):</strong> <strong>Aarav Mehta</strong>, hereinafter called the LESSEE of the SECOND PART.</p>

<h2>1. DEMISED PREMISES</h2>
<p>The Lessor hereby agrees to lease out the premises situated at <strong>Flat 402, Lotus Towers, MG Road, Bengaluru</strong>.</p>

<h2>2. TERM AND RENT</h2>
<p>The lease term shall be for a duration of <strong>11 months</strong> starting from <strong>2026-09-01</strong>. The Lessee shall pay to the Lessor a monthly rent of <strong>₹45,000</strong> payable on or before the 5th of each calendar month. The Lessee has deposited a security deposit of <strong>₹2,70,000</strong>.</p>

<h2>3. TERMINATION AND NOTICE PERIOD</h2>
<p>Either party may terminate this agreement by giving <strong>2 months</strong> written notice to the other party.</p>`,
      variables: {
        Landlord_Name: 'Adv. Suresh Oberoi',
        Tenant_Name: 'Aarav Mehta',
        Property_Address: 'Flat 402, Lotus Towers, MG Road, Bengaluru',
        Monthly_Rent: '45000',
        Security_Deposit: '270000',
        Lease_Start_Date: '2026-09-01',
        Lease_Term_Months: '11',
        Notice_Period_Months: '2',
        Jurisdiction_City: 'Bengaluru'
      },
      currentVersion: 2,
      organizationId: org.id
    }
  });

  // 10. Create Document Versions
  await prisma.documentVersion.createMany({
    data: [
      {
        documentId: doc.id,
        versionNumber: 1,
        content: `<h1>RESIDENTIAL LEASE AGREEMENT</h1><p>Monthly rent ₹40,000 with 2 months notice period.</p>`,
        variablesState: { Monthly_Rent: '40000', Notice_Period_Months: '2' },
        changeDescription: 'Initial draft generated from Lease Agreement template.',
        authorId: lawyer.id,
        createdAt: new Date('2026-08-03T11:00:00Z')
      },
      {
        documentId: doc.id,
        versionNumber: 2,
        content: `<h1>RESIDENTIAL & COMMERCIAL LEASE AGREEMENT</h1><p>This Lease Agreement is executed by Suresh Oberoi and Aarav Mehta. Monthly rent: ₹45,000.</p>`,
        variablesState: { Monthly_Rent: '45000', Notice_Period_Months: '2' },
        changeDescription: 'Updated monthly rent variable to ₹45,000 per landlord request.',
        authorId: lawyer.id,
        createdAt: new Date('2026-08-04T09:30:00Z')
      }
    ]
  });

  // 11. Create Inline Comments
  await prisma.inlineComment.create({
    data: {
      id: 'cmt_1',
      documentId: doc.id,
      authorId: partner.id,
      selectedText: 'Monthly rent of ₹45,000',
      commentText: 'Please verify if GST tax is applicable on this commercial tenant.',
      resolved: false,
      createdAt: new Date('2026-08-04T10:15:00Z')
    }
  });

  // 12. Create Workflow Task
  await prisma.workflowTask.create({
    data: {
      id: 'task_201',
      documentId: doc.id,
      templateId: templateRental.id,
      title: 'Draft Commercial Lease - Aarav Mehta',
      clientId: clientAarav.id,
      matterId: matterAaravLease.id,
      assigneeId: lawyer.id,
      assignedById: partner.id,
      status: TaskStatus.under_review,
      priority: TaskPriority.urgent,
      dueDate: new Date('2026-08-06'),
      notes: 'Incorporate special early termination penalty clause if tenant exits before 12 months.',
      requirements: 'Draft agreement using firm master template, verify rent escalation clause at 5% annually, and submit for partner sign-off.',
      organizationId: org.id,
      createdAt: new Date('2026-08-03T09:00:00Z')
    }
  });

  // 13. Create Activity Logs
  await prisma.activityLog.createMany({
    data: [
      {
        id: 'log_1',
        userId: lawyer.id,
        action: 'Saved Version Snapshot v2',
        entityType: EntityType.document,
        entityId: doc.id,
        entityName: 'Lease Agreement - Aarav Mehta Premises',
        details: 'Updated rent variable to ₹45,000 and submitted draft for Partner review.',
        organizationId: org.id,
        timestamp: new Date('2026-08-04T09:30:00Z')
      },
      {
        id: 'log_2',
        userId: partner.id,
        action: 'Assigned Urgent Task',
        entityType: EntityType.task,
        entityId: 'task_201',
        entityName: 'Draft Commercial Lease - Aarav Mehta',
        details: 'Assigned task to Adv. Ananya Roy with Urgent Case Priority.',
        organizationId: org.id,
        timestamp: new Date('2026-08-03T09:00:00Z')
      }
    ]
  });

  // 14. Create Notifications
  await prisma.notification.createMany({
    data: [
      {
        id: 'notif_1',
        userId: partner.id,
        title: 'Document Submitted For Partner Review',
        message: 'Adv. Ananya Roy submitted "Lease Agreement - Aarav Mehta" for your review and approval.',
        type: NotificationType.review,
        linkId: doc.id,
        read: false,
        createdAt: new Date(Date.now() - 10 * 60 * 1000) // 10 mins ago
      },
      {
        id: 'notif_2',
        userId: partner.id,
        title: 'Pending Template Customization Request',
        message: 'Adv. Ananya Roy requested custom variable addition to "Residential & Commercial Lease Agreement".',
        type: NotificationType.customization,
        linkId: templateRental.id,
        read: false,
        createdAt: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      }
    ]
  });

  console.log('Database successfully seeded!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
