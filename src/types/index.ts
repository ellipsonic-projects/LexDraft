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
  status: 'online' | 'busy' | 'offline';
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
  status?: 'active' | 'pending_approval' | 'rejected';
  pendingCustomizations?: TemplateCustomizationRequest[];
}

export interface DocumentVersion {
  versionNumber: number;
  timestamp: string;
  authorId: string;
  authorName: string;
  changeDescription: string;
  content: string;
  variablesState: Record<string, any>;
}

export interface InlineComment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  timestamp: string;
  selectedText: string;
  commentText: string;
  resolved: boolean;
}

export interface LegalDocument {
  id: string;
  templateId: string;
  title: string;
  clientName: string;
  category: string;
  authorId: string;
  authorName: string;
  status: DocumentStatus;
  priority: TaskPriority;
  dueDate: string;
  content: string;
  variables: Record<string, any>;
  currentVersion: number;
  versions: DocumentVersion[];
  comments: InlineComment[];
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowTask {
  id: string;
  documentId?: string;
  templateId: string;
  templateName: string;
  title: string;
  clientName: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType: 'document' | 'template' | 'task' | 'organization' | 'customization';
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
  type: 'review' | 'approval' | 'rejection' | 'task' | 'customization';
  linkId?: string;
}
