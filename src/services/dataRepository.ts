import {
  User,
  Client,
  Matter,
  LegalTemplate,
  LegalDocument,
  WorkflowTask,
  ActivityLog,
  NotificationItem,
  Organization
} from '../types';
import { api } from './api';

const mapUserRole = (role: string): 'boss' | 'employee' => {
  return role.toLowerCase() === 'boss' ? 'boss' : 'employee';
};

const mapUser = (u: any): User => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: mapUserRole(u.role),
  title: u.title || 'Legal Professional',
  avatar: u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=0F172A&color=fff`,
  status: (u.status || 'online') as 'online' | 'offline'
});

const mapTemplate = (t: any): LegalTemplate => ({
  id: t.id,
  name: t.name,
  category: t.category,
  description: t.description || '',
  originalFileName: t.originalFileName || '',
  extractedVariables: (t.variables || []).map((v: any) => ({
    id: v.id || v.key,
    key: v.key,
    label: v.label || v.key,
    type: v.type.toLowerCase(),
    required: v.required ?? true,
    defaultValue: v.defaultValue || undefined,
    options: v.options || undefined
  })),
  contentTemplate: t.contentTemplate || '',
  createdBy: t.createdById || '',
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
  version: t.version || '1.0',
  usageCount: t.usageCount ?? 0,
  status: (t.status || 'ACTIVE').toLowerCase() as 'active' | 'inactive',
  versionHistory: (t.versions || []).map((v: any, idx: number) => ({
    version: v.versionNumber ? `v${v.versionNumber}` : `v${t.version || '1.0'}`,
    editedBy: v.editedBy?.name || 'Senior Partner',
    editedAt: v.editedAt || v.createdAt || new Date().toISOString(),
    changeSummary: v.changeSummary || 'Master template snapshot'
  })),
  pendingCustomizations: (t.customizationRequests || [])
    .map((cr: any) => ({
      id: cr.id,
      templateId: cr.templateId,
      templateName: t.name,
      requestedByLawyerId: cr.requestedById,
      requestedByLawyerName: cr.requestedBy?.name || 'Associate Lawyer',
      customVariables: cr.customVariables || [],
      reason: cr.reason || '',
      status: (cr.status || 'pending').toLowerCase() as 'pending' | 'approved' | 'rejected',
      timestamp: cr.timestamp || cr.createdAt
    }))
});

const mapDocument = (d: any): LegalDocument => ({
  id: d.id,
  templateId: d.templateId,
  templateVersionAtGeneration: d.templateVersionAtGeneration || '1.0',
  title: d.title,
  clientId: d.clientId,
  matterId: d.matterId,
  category: d.category || 'General',
  authorId: d.authorId || d.author?.id || '',
  authorName: d.author?.name || 'Associate',
  status: (d.status || 'draft').toLowerCase() as any,
  priority: (d.priority || 'medium').toLowerCase() as any,
  dueDate: d.dueDate || '',
  content: d.content || '',
  variables: d.variables || {},
  currentVersion: d.currentVersion || 1,
  versions: (d.versions || []).map((v: any) => ({
    versionNumber: v.versionNumber,
    timestamp: v.createdAt,
    authorId: v.authorId || '',
    authorName: v.author?.name || 'Associate',
    changeDescription: v.changeDescription || '',
    content: v.content,
    variablesState: v.variablesState || {}
  })),
  comments: (d.comments || []).map((c: any) => ({
    id: c.id,
    parentCommentId: c.parentCommentId,
    authorId: c.authorId,
    authorName: c.author?.name || 'Lawyer',
    authorRole: mapUserRole(c.author?.role || 'EMPLOYEE'),
    timestamp: c.createdAt,
    selectedText: c.selectedText || '',
    commentText: c.commentText || '',
    resolved: c.resolved ?? false
  })),
  reviewHistory: (d.reviewHistory || []).map((r: any) => ({
    cycleNumber: r.cycleNumber,
    documentVersionAtReview: r.documentVersionAtReview,
    reviewerId: r.reviewerId,
    reviewerName: r.reviewer?.name || 'Partner',
    decision: r.decision.toLowerCase() as 'approved' | 'rejected',
    notes: r.notes || '',
    timestamp: r.createdAt
  })),
  expiryDate: d.expiryDate,
  lockedAt: d.lockedAt,
  pdfExportUrl: d.pdfExportUrl,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt
});

const mapTask = (t: any): WorkflowTask => {
  const latestApproval = t.clientApprovals && t.clientApprovals.length > 0 ? t.clientApprovals[0] : undefined;
  return {
    id: t.id,
    documentId: t.documentId || null,
    templateId: t.templateId,
    templateName: t.template?.name || 'Template',
    title: t.title || 'Legal Task',
    clientId: t.clientId,
    matterId: t.matterId,
    assigneeId: t.assigneeId,
    assigneeName: t.assignee?.name || 'Assignee',
    assigneeAvatar: t.assignee?.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    assignedById: t.assignedById || '',
    assignedByName: t.assignedBy?.name || 'Partner',
    status: (t.status || 'assigned').toLowerCase() as any,
    priority: (t.priority || 'medium').toLowerCase() as any,
    dueDate: t.dueDate || '',
    notes: t.notes || undefined,
    requirements: t.requirements || undefined,
    latestClientApproval: latestApproval ? {
      id: latestApproval.id,
      status: latestApproval.status,
      documentVersion: latestApproval.documentVersion,
      approvedAt: latestApproval.approvedAt,
      rejectedAt: latestApproval.rejectedAt,
      recipientEmail: latestApproval.recipientEmail,
      createdAt: latestApproval.createdAt
    } : undefined,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt
  };
};

const mapActivityLog = (a: any): ActivityLog => ({
  id: a.id,
  userId: a.userId,
  userName: a.user?.name || 'System User',
  userRole: mapUserRole(a.user?.role || 'EMPLOYEE'),
  action: a.action,
  entityType: (a.entityType || 'document').toLowerCase() as any,
  entityId: a.entityId,
  entityName: a.entityName || '',
  details: a.details || '',
  timestamp: a.timestamp || a.createdAt
});

const mapNotification = (n: any): NotificationItem => ({
  id: n.id,
  title: n.title,
  message: n.message,
  timestamp: n.createdAt,
  read: n.read ?? false,
  type: (n.type || 'task').toLowerCase() as any,
  linkId: n.linkId || ''
});

export const dataRepository = {
  // Authentication / Users
  getUsers: async (): Promise<User[]> => {
    const res = await api.get('/auth/users');
    return (res.data.users || []).map(mapUser);
  },
  saveUsers: async (_users: User[]): Promise<void> => {
    // Read-only on live API
  },

  getOrganization: async (): Promise<Organization> => {
    const res = await api.get('/auth/me');
    const u = res.data.user;
    if (u && u.organization) {
      return {
        id: u.organization.id,
        name: u.organization.name,
        plan: u.organization.plan,
        totalMembers: u.organization.totalMembers
      };
    }
    throw new Error('Organization profile details are unavailable.');
  },

  // Clients
  getClients: async (): Promise<Client[]> => {
    const res = await api.get('/clients');
    return res.data.clients || [];
  },
  saveClients: async (_clients: Client[]): Promise<void> => {
    // Managed via API create
  },
  addClient: async (client: Omit<Client, 'id' | 'createdAt'>): Promise<Client> => {
    const res = await api.post('/clients', client);
    return res.data.client;
  },

  // Matters
  getMatters: async (): Promise<Matter[]> => {
    const res = await api.get('/matters');
    return res.data.matters || [];
  },
  saveMatters: async (_matters: Matter[]): Promise<void> => {
    // Managed via API create
  },
  addMatter: async (matter: Omit<Matter, 'id' | 'status' | 'createdAt' | 'documentIds'>): Promise<Matter> => {
    const res = await api.post('/matters', matter);
    return res.data.matter;
  },
  updateMatter: async (id: string, updates: Partial<Matter>): Promise<Matter> => {
    // Simple mock update fallback or not needed for workflow
    return { id, ...updates } as Matter;
  },

  // Templates
  getTemplates: async (): Promise<LegalTemplate[]> => {
    const res = await api.get('/templates');
    return (res.data.templates || []).map(mapTemplate);
  },
  saveTemplates: async (_templates: LegalTemplate[]): Promise<void> => {
    // Handled via backend migrations/create
  },
  addTemplate: async (template: LegalTemplate): Promise<LegalTemplate> => {
    const res = await api.post('/templates', template);
    return mapTemplate(res.data.template);
  },
  updateTemplate: async (id: string, updates: Partial<LegalTemplate>): Promise<LegalTemplate> => {
    const res = await api.patch(`/templates/${id}`, updates);
    return mapTemplate(res.data.template);
  },
  deleteTemplate: async (id: string): Promise<void> => {
    await api.delete(`/templates/${id}`);
  },

  // Documents
  getDocuments: async (): Promise<LegalDocument[]> => {
    const res = await api.get('/documents');
    return (res.data.documents || []).map(mapDocument);
  },
  saveDocuments: async (_documents: LegalDocument[]): Promise<void> => {
    // Read-only mock save documents
  },
  getDocumentById: async (id: string): Promise<LegalDocument | null> => {
    try {
      const res = await api.get(`/documents/${id}`);
      return mapDocument(res.data.document);
    } catch {
      return null;
    }
  },
  deleteDocument: async (id: string): Promise<void> => {
    await api.delete(`/documents/${id}`);
  },

  // Tasks
  getTasks: async (): Promise<WorkflowTask[]> => {
    const res = await api.get('/tasks');
    return (res.data.tasks || []).map(mapTask);
  },
  saveTasks: async (_tasks: WorkflowTask[]): Promise<void> => {
    // Handled via status patch
  },
  addTask: async (task: any): Promise<WorkflowTask> => {
    const res = await api.post('/tasks', task);
    return mapTask(res.data.task);
  },
  updateTask: async (id: string, updates: Partial<WorkflowTask>): Promise<WorkflowTask> => {
    const res = await api.patch(`/tasks/${id}/status`, { status: updates.status });
    return mapTask(res.data.task);
  },
  sendAgreementToClient: async (taskId: string, documentId?: string): Promise<any> => {
    const res = await api.post(`/tasks/${taskId}/send-to-client`, { documentId });
    return res.data;
  },
  deleteTask: async (id: string): Promise<void> => {
    await api.delete(`/tasks/${id}`);
  },

  // Activity Logs
  getActivityLogs: async (): Promise<ActivityLog[]> => {
    const res = await api.get('/activity-logs');
    return (res.data.logs || []).map(mapActivityLog);
  },
  saveActivityLogs: async (_logs: ActivityLog[]): Promise<void> => {},
  addActivityLog: async (log: ActivityLog): Promise<ActivityLog> => {
    return log;
  },

  // Notifications
  getNotifications: async (): Promise<NotificationItem[]> => {
    const res = await api.get('/notifications');
    return (res.data.notifications || []).map(mapNotification);
  },
  saveNotifications: async (_notifications: NotificationItem[]): Promise<void> => {},
  addNotification: async (notification: NotificationItem): Promise<NotificationItem> => {
    return notification;
  },

  // Signatures
  createSignatureRequest: async (params: {
    taskId: string;
    documentId: string;
    signers: any[];
  }): Promise<any> => {
    const res = await api.post('/signatures/request', params);
    return res.data;
  },
  getSignatureRequestForDocument: async (documentId: string): Promise<any> => {
    try {
      const res = await api.get(`/signatures/document/${documentId}`);
      return res.data.data.signatureRequest;
    } catch {
      return null;
    }
  },
  getSignatureRequestsForTask: async (taskId: string): Promise<any[]> => {
    try {
      const res = await api.get(`/signatures/task/${taskId}`);
      return res.data.data.signatureRequests || [];
    } catch {
      return [];
    }
  }
};
