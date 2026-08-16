export type UserRole = 'boss' | 'employee'; // boss = Partner, employee = Lawyer

export type DocumentStatus = 'draft' | 'under_review' | 'approved' | 'rejected';
export type TaskStatus = 'assigned' | 'in_progress' | 'draft_ready' | 'under_review' | 'approved' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type VariableType = 'text' | 'currency' | 'date' | 'number' | 'multiline' | 'address' | 'select';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  avatar: string;
  status: 'online' | 'offline';
}

export interface Client {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: string; // ISO timestamp
}

export interface Matter {
  id: string;
  clientId: string;
  title: string; // e.g., "Aarav Mehta — Commercial Lease"
  matterCode: string; // firm-internal reference number
  status: 'active' | 'closed';
  documentIds: string[];
  createdAt: string; // ISO timestamp
}

export interface Organization {
  id: string;
  name: string;
  plan: 'Enterprise' | 'Pro' | 'Starter';
  totalMembers: number;
}

export interface TemplateVariable {
  id: string;
  key: string;
  label: string;
  type: VariableType;
  required: boolean;
  defaultValue?: string;
  options?: string[];
}

export interface TemplateCustomizationRequest {
  id: string;
  templateId: string;
  templateName: string;
  requestedByLawyerId: string;
  requestedByLawyerName: string;
  customVariables: TemplateVariable[];
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
}

export interface TemplateVersionEntry {
  version: string;
  editedBy: string;
  editedAt: string; // ISO timestamp
  changeSummary: string;
}

export interface LegalTemplate {
  id: string;
  name: string;
  category: 'Real Estate' | 'Corporate' | 'IP & Tech' | 'Employment' | 'Litigation' | 'General';
  description: string;
  originalFileName: string;
  extractedVariables: TemplateVariable[];
  contentTemplate: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: string;
  usageCount: number;
  status: 'active' | 'inactive';
  versionHistory: TemplateVersionEntry[];
  pendingCustomizations?: TemplateCustomizationRequest[];
}

export interface DocumentVersion {
  id?: string; // UUID from DB — available when fetched from API
  versionNumber: number;
  timestamp: string;
  authorId: string;
  authorName: string;
  changeDescription: string;
  content: string;
  variablesState: Record<string, string>;
}

export interface InlineComment {
  id: string;
  parentCommentId: string | null; // enables threaded replies
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  timestamp: string;
  selectedText: string;
  commentText: string;
  resolved: boolean;
}

export interface ReviewCycle {
  cycleNumber: number;
  documentVersionAtReview: number;
  reviewerId: string;
  reviewerName: string;
  decision: 'approved' | 'rejected';
  notes: string;
  timestamp: string; // ISO timestamp
}

export interface LegalDocument {
  id: string;
  templateId: string;
  templateVersionAtGeneration: string;
  title: string;
  clientId: string;
  matterId: string;
  category: string;
  authorId: string;
  authorName: string;
  status: DocumentStatus;
  priority: TaskPriority;
  dueDate: string;
  content: string;
  variables: Record<string, string>;
  currentVersion: number;
  versions: DocumentVersion[];
  comments: InlineComment[];
  reviewHistory: ReviewCycle[];
  expiryDate: string | null;
  lockedAt: string | null;
  pdfExportUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ClientApprovalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface WorkflowTask {
  id: string;
  documentId: string | null;
  templateId: string;
  templateName: string;
  title: string;
  clientId: string;
  matterId: string;
  assigneeId: string;
  assigneeName: string;
  assigneeAvatar: string;
  assignedById: string;
  assignedByName: string;
  status: TaskStatus;
  priority: TaskPriority; // Case urgency
  dueDate: string;
  notes?: string;
  requirements?: string;
  latestClientApproval?: {
    id: string;
    status: ClientApprovalStatus;
    documentVersion: number;
    approvedAt?: string | null;
    rejectedAt?: string | null;
    recipientEmail: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType: 'document' | 'template' | 'task' | 'customization';
  entityId: string;
  entityName: string;
  details: string;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'review' | 'approval' | 'rejection' | 'customization' | 'task' | 'expiry';
  linkId: string;
}

// ─── Digital Signature Types ───────────────────────────────────────────────────

export type SignatureRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
export type SignerStatus = 'PENDING' | 'ACTIVE' | 'SIGNED' | 'DECLINED' | 'EXPIRED';
export type SignerType = 'INTERNAL_USER' | 'EXISTING_CLIENT' | 'EXTERNAL';
export type SignatureType = 'DRAWN' | 'UPLOADED' | 'DIGITAL_CERTIFICATE';

export interface DocumentSigner {
  id: string;
  signatureRequestId: string;
  userId: string | null;
  clientId: string | null;
  signerName: string;
  signerEmail: string;
  signerRole: string;
  signerType: SignerType;
  signingOrder: number;
  status: SignerStatus;
  signatureType: SignatureType | null;
  signedAt: string | null;
  declinedAt: string | null;
  declineReason: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SignatureRequest {
  id: string;
  taskId: string;
  documentId: string;
  documentVersionId: string;
  status: SignatureRequestStatus;
  createdById: string;
  expiresAt: string;
  signers: DocumentSigner[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSignerInput {
  signerName: string;
  signerEmail: string;
  signerRole: string;
  signerType: SignerType;
  signingOrder: number;
  userId?: string;
  clientId?: string;
}

