import { User, Organization, LegalTemplate, LegalDocument, WorkflowTask, ActivityLog, NotificationItem } from '../types';

export const initialUsers: User[] = [
  {
    id: 'usr_partner',
    name: 'Adv. Rajesh Varma',
    email: 'partner@apexlegal.in',
    role: 'boss', // Senior Partner
    title: 'Senior Managing Partner',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200',
    status: 'online'
  },
  {
    id: 'usr_lawyer',
    name: 'Adv. Ananya Roy',
    email: 'lawyer@apexlegal.in',
    role: 'employee', // Associate Lawyer
    title: 'Senior Associate Lawyer',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    status: 'online'
  }
];

export const initialOrganization: Organization = {
  id: 'org_apex',
  name: 'Apex Legal Advocates & Solicitors',
  plan: 'Enterprise',
  totalMembers: 2
};

export const initialTemplates: LegalTemplate[] = [
  {
    id: 'tpl_rental',
    name: 'Residential & Commercial Lease Agreement',
    category: 'Real Estate',
    description: 'Standardized landlord-tenant lease agreement with clauses for rent, security deposit, notice period, and maintenance duties.',
    originalFileName: 'Master_Lease_Agreement_2026.docx',
    extractedVariables: [
      { id: 'v1', key: 'Landlord_Name', label: 'Landlord / Lessor Name', type: 'text', required: true, defaultValue: 'Adv. Suresh Oberoi' },
      { id: 'v2', key: 'Tenant_Name', label: 'Tenant / Lessee Name', type: 'text', required: true, defaultValue: 'Aarav Mehta' },
      { id: 'v3', key: 'Property_Address', label: 'Premises Address', type: 'address', required: true, defaultValue: 'Flat 402, Lotus Towers, MG Road, Bengaluru' },
      { id: 'v4', key: 'Monthly_Rent', label: 'Monthly Rent (₹)', type: 'currency', required: true, defaultValue: '45000' },
      { id: 'v5', key: 'Security_Deposit', label: 'Security Deposit (₹)', type: 'currency', required: true, defaultValue: '270000' },
      { id: 'v6', key: 'Lease_Start_Date', label: 'Lease Commencement Date', type: 'date', required: true, defaultValue: '2026-09-01' },
      { id: 'v7', key: 'Notice_Period_Months', label: 'Notice Period (Months)', type: 'number', required: true, defaultValue: '2' },
      { id: 'v8', key: 'Jurisdiction_City', label: 'Court Jurisdiction City', type: 'text', required: true, defaultValue: 'Bengaluru' }
    ],
    contentTemplate: `<h1>RESIDENTIAL & COMMERCIAL LEASE AGREEMENT</h1>
<p>This Lease Agreement is made and executed on <strong>{{Lease_Start_Date}}</strong> at <strong>{{Jurisdiction_City}}</strong> by and between:</p>

<p><strong>LESSOR (LANDLORD):</strong> <strong>{{Landlord_Name}}</strong>, hereinafter called the LESSOR (which expression shall unless excluded by or repugnant to the context be deemed to include his heirs, executors, administrators, and assigns) of the FIRST PART;</p>

<p>AND</p>

<p><strong>LESSEE (TENANT):</strong> <strong>{{Tenant_Name}}</strong>, hereinafter called the LESSEE (which expression shall unless excluded by or repugnant to the context be deemed to include its successors and permitted assigns) of the SECOND PART.</p>

<h2>1. DEMISED PREMISES</h2>
<p>The Lessor hereby agrees to lease out and the Lessee hereby agrees to take on lease the premises situated at <strong>{{Property_Address}}</strong> (hereinafter referred to as the "Demised Premises").</p>

<h2>2. RENT AND DEPOSIT</h2>
<p>The Lessee shall pay to the Lessor a monthly rent of <strong>₹{{Monthly_Rent}}</strong> payable on or before the 5th of each calendar month. The Lessee has deposited a interest-free refundable security deposit of <strong>₹{{Security_Deposit}}</strong> with the Lessor.</p>

<h2>3. TERMINATION AND NOTICE PERIOD</h2>
<p>Either party may terminate this agreement by giving <strong>{{Notice_Period_Months}} months</strong> written notice to the other party.</p>

<h2>4. JURISDICTION</h2>
<p>This agreement shall be governed by the laws of India and courts in <strong>{{Jurisdiction_City}}</strong> shall have exclusive jurisdiction.</p>`,
    createdBy: 'Adv. Rajesh Varma (Senior Partner)',
    createdAt: '2026-07-15T10:00:00Z',
    updatedAt: '2026-08-01T14:30:00Z',
    version: '1.2',
    usageCount: 42,
    status: 'active',
    pendingCustomizations: [
      {
        id: 'cust_101',
        templateId: 'tpl_rental',
        templateName: 'Residential & Commercial Lease Agreement',
        requestedByLawyerId: 'usr_lawyer',
        requestedByLawyerName: 'Adv. Ananya Roy',
        customVariables: [
          { id: 'cv_new1', key: 'Late_Fee_Percentage', label: 'Late Payment Interest Rate (%)', type: 'number', required: false, defaultValue: '1.5' }
        ],
        reason: 'Client requested explicit late rent payment interest clause for commercial properties.',
        status: 'pending',
        timestamp: '2026-08-03T16:20:00Z'
      }
    ]
  },
  {
    id: 'tpl_nda',
    name: 'Non-Disclosure & Confidentiality Agreement (NDA)',
    category: 'IP & Tech',
    description: 'Mutual non-disclosure agreement for M&A diligence, tech partnerships, and corporate consultations.',
    originalFileName: 'Standard_Mutual_NDA_v2.docx',
    extractedVariables: [
      { id: 'v10', key: 'Party_A_Name', label: 'Disclosing Party Name', type: 'text', required: true, defaultValue: 'Apex Legal Advocates' },
      { id: 'v11', key: 'Party_B_Name', label: 'Receiving Party Name', type: 'text', required: true, defaultValue: 'TechCorp Solutions Inc' },
      { id: 'v12', key: 'Purpose', label: 'Evaluation Purpose', type: 'multiline', required: true, defaultValue: 'Evaluating potential merger and technical API integration.' },
      { id: 'v13', key: 'Confidentiality_Years', label: 'Term Duration (Years)', type: 'number', required: true, defaultValue: '3' },
      { id: 'v14', key: 'Effective_Date', label: 'Effective Date', type: 'date', required: true, defaultValue: '2026-08-04' }
    ],
    contentTemplate: `<h1>MUTUAL NON-DISCLOSURE AGREEMENT</h1>
<p>This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of <strong>{{Effective_Date}}</strong> by and between <strong>{{Party_A_Name}}</strong> and <strong>{{Party_B_Name}}</strong>.</p>

<h2>1. PURPOSE</h2>
<p>The parties wish to explore a potential business relationship concerning: <strong>{{Purpose}}</strong> ("Purpose").</p>

<h2>2. CONFIDENTIALITY OBLIGATIONS</h2>
<p>Each party agrees to maintain in strict confidence all proprietary technical, financial, and legal information for a period of <strong>{{Confidentiality_Years}} years</strong> from the Effective Date.</p>`,
    createdBy: 'Adv. Rajesh Varma (Senior Partner)',
    createdAt: '2026-06-10T11:00:00Z',
    updatedAt: '2026-07-28T09:15:00Z',
    version: '2.0',
    usageCount: 88,
    status: 'active'
  }
];

export const initialDocuments: LegalDocument[] = [
  {
    id: 'doc_101',
    templateId: 'tpl_rental',
    title: 'Lease Agreement - Aarav Mehta Premises',
    clientName: 'Aarav Mehta',
    category: 'Real Estate',
    authorId: 'usr_lawyer',
    authorName: 'Adv. Ananya Roy',
    status: 'under_review',
    priority: 'high',
    dueDate: '2026-08-06',
    variables: {
      Landlord_Name: 'Adv. Suresh Oberoi',
      Tenant_Name: 'Aarav Mehta',
      Property_Address: 'Flat 402, Lotus Towers, MG Road, Bengaluru',
      Monthly_Rent: '45000',
      Security_Deposit: '270000',
      Lease_Start_Date: '2026-09-01',
      Notice_Period_Months: '2',
      Jurisdiction_City: 'Bengaluru'
    },
    currentVersion: 2,
    versions: [
      {
        versionNumber: 1,
        timestamp: '2026-08-03T11:00:00Z',
        authorId: 'usr_lawyer',
        authorName: 'Adv. Ananya Roy',
        changeDescription: 'Initial draft generated from Lease Agreement template.',
        content: `<h1>RESIDENTIAL LEASE AGREEMENT</h1><p>Monthly rent ₹40,000 with 2 months notice period.</p>`,
        variablesState: { Monthly_Rent: '40000', Notice_Period_Months: '2' }
      },
      {
        versionNumber: 2,
        timestamp: '2026-08-04T09:30:00Z',
        authorId: 'usr_lawyer',
        authorName: 'Adv. Ananya Roy',
        changeDescription: 'Updated monthly rent variable to ₹45,000 per landlord request.',
        content: `<h1>RESIDENTIAL & COMMERCIAL LEASE AGREEMENT</h1><p>This Lease Agreement is executed by Suresh Oberoi and Aarav Mehta. Monthly rent: ₹45,000.</p>`,
        variablesState: { Monthly_Rent: '45000', Notice_Period_Months: '2' }
      }
    ],
    comments: [
      {
        id: 'cmt_1',
        authorId: 'usr_partner',
        authorName: 'Adv. Rajesh Varma',
        authorRole: 'boss',
        timestamp: '2026-08-04T10:15:00Z',
        selectedText: 'Monthly rent of ₹45,000',
        commentText: 'Please verify if GST tax is applicable on this commercial tenant.',
        resolved: false
      }
    ],
    content: `<h1>RESIDENTIAL & COMMERCIAL LEASE AGREEMENT</h1>
<p>This Lease Agreement is made and executed on <strong>2026-09-01</strong> at <strong>Bengaluru</strong> by and between:</p>

<p><strong>LESSOR (LANDLORD):</strong> <strong>Adv. Suresh Oberoi</strong>, hereinafter called the LESSOR of the FIRST PART;</p>

<p>AND</p>

<p><strong>LESSEE (TENANT):</strong> <strong>Aarav Mehta</strong>, hereinafter called the LESSEE of the SECOND PART.</p>

<h2>1. DEMISED PREMISES</h2>
<p>The Lessor hereby agrees to lease out the premises situated at <strong>Flat 402, Lotus Towers, MG Road, Bengaluru</strong>.</p>

<h2>2. RENT AND DEPOSIT</h2>
<p>The Lessee shall pay to the Lessor a monthly rent of <strong>₹45,000</strong> payable on or before the 5th of each calendar month. The Lessee has deposited a security deposit of <strong>₹2,70,000</strong>.</p>

<h2>3. TERMINATION AND NOTICE PERIOD</h2>
<p>Either party may terminate this agreement by giving <strong>2 months</strong> written notice to the other party.</p>`,
    createdAt: '2026-08-03T11:00:00Z',
    updatedAt: '2026-08-04T09:30:00Z'
  }
];

export const initialWorkflowTasks: WorkflowTask[] = [
  {
    id: 'task_201',
    documentId: 'doc_101',
    templateId: 'tpl_rental',
    templateName: 'Lease Agreement',
    title: 'Draft Commercial Lease Agreement',
    clientName: 'Aarav Mehta',
    assigneeId: 'usr_lawyer',
    assigneeName: 'Adv. Ananya Roy',
    assigneeAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    assignedById: 'usr_partner',
    assignedByName: 'Adv. Rajesh Varma (Senior Partner)',
    status: 'under_review',
    priority: 'urgent', // Case Urgency
    dueDate: '2026-08-06',
    notes: 'Incorporate special early termination penalty clause if tenant exits before 12 months.',
    requirements: 'Draft agreement using firm master template, verify rent escalation clause at 5% annually, and submit for partner sign-off.',
    createdAt: '2026-08-03T09:00:00Z',
    updatedAt: '2026-08-04T09:30:00Z'
  }
];

export const initialActivityLogs: ActivityLog[] = [
  {
    id: 'log_1',
    userId: 'usr_lawyer',
    userName: 'Adv. Ananya Roy',
    userRole: 'employee',
    action: 'Saved Version Snapshot v2',
    entityType: 'document',
    entityId: 'doc_101',
    entityName: 'Lease Agreement - Aarav Mehta Premises',
    details: 'Updated rent variable to ₹45,000 and submitted draft for Partner review.',
    timestamp: '2026-08-04T09:30:00Z'
  },
  {
    id: 'log_2',
    userId: 'usr_partner',
    userName: 'Adv. Rajesh Varma',
    userRole: 'boss',
    action: 'Assigned Urgent Task',
    entityType: 'task',
    entityId: 'task_201',
    entityName: 'Draft Commercial Lease Agreement',
    details: 'Assigned task to Adv. Ananya Roy with Urgent Case Priority.',
    timestamp: '2026-08-03T09:00:00Z'
  }
];

export const initialNotifications: NotificationItem[] = [
  {
    id: 'notif_1',
    title: 'Document Submitted For Partner Review',
    message: 'Adv. Ananya Roy submitted "Lease Agreement - Aarav Mehta" for your review and approval.',
    timestamp: '10 mins ago',
    read: false,
    type: 'review',
    linkId: 'doc_101'
  },
  {
    id: 'notif_2',
    title: 'Pending Template Customization Request',
    message: 'Adv. Ananya Roy requested custom variable addition to "Residential Lease Agreement".',
    timestamp: '1 hour ago',
    read: false,
    type: 'customization',
    linkId: 'tpl_rental'
  }
];
