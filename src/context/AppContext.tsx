import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  UserRole,
  Organization,
  Client,
  Matter,
  LegalTemplate,
  LegalDocument,
  WorkflowTask,
  ActivityLog,
  NotificationItem,
  DocumentStatus,
  TaskStatus,
  TaskPriority,
  TemplateCustomizationRequest,
  ReviewCycle
} from '../types';
import {
  initialUsers,
  initialOrganization,
  initialClients,
  initialMatters,
  initialTemplates,
  initialDocuments,
  initialWorkflowTasks,
  initialActivityLogs,
  initialNotifications
} from '../data/initialData';
import { checkPermission, canUpdateTask } from '../utils/permissions';
import { dataRepository } from '../services/dataRepository';

export type NavTab =
  | 'boss_dashboard'
  | 'employee_dashboard'
  | 'template_studio'
  | 'document_generator'
  | 'documents'
  | 'document_editor'
  | 'workflow'
  | 'activity'
  | 'analytics'
  | 'settings';

interface AppContextType {
  // Auth
  isAuthenticated: boolean;
  currentUser: User;
  users: User[];
  organization: Organization;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  toast: { message: string; type: 'success' | 'info' | 'warning' | 'error' } | null;
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  login: (email: string, role: UserRole) => void;
  quickLogin: (role: UserRole) => void;
  logout: () => void;

  // Domain State
  clients: Client[];
  matters: Matter[];
  templates: LegalTemplate[];
  documents: LegalDocument[];
  tasks: WorkflowTask[];
  activityLogs: ActivityLog[];
  notifications: NotificationItem[];
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  selectedTemplateId: string | null;
  setSelectedTemplateId: (id: string | null) => void;
  selectedDocumentId: string | null;
  setSelectedDocumentId: (id: string | null) => void;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;

  // Client & Matter Actions
  createClient: (name: string, email: string, phone: string) => Promise<Client | null>;
  createMatter: (clientId: string, title: string, matterCode: string) => Promise<Matter | null>;

  // Template Actions & Customizations
  createTemplate: (template: Omit<LegalTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'versionHistory' | 'status'>) => LegalTemplate | null;
  updateTemplate: (id: string, updates: Partial<LegalTemplate>) => void;
  deleteTemplate: (id: string) => void;
  requestTemplateCustomization: (templateId: string, customVariables: any[], reason: string) => void;
  approveTemplateCustomization: (customizationId: string) => void;
  rejectTemplateCustomization: (customizationId: string) => void;

  // Document Actions
  generateDocument: (templateId: string, clientId: string, matterId: string, variables: Record<string, string>, priority?: TaskPriority, dueDate?: string, taskId?: string) => LegalDocument | null;
  saveDocumentDraft: (id: string, content: string, variables: Record<string, string>, changeDescription?: string) => void;
  restoreDocumentVersion: (documentId: string, versionNumber: number) => void;
  submitDocumentForReview: (id: string) => void;
  approveDocument: (id: string, reviewNotes?: string) => void;
  rejectDocument: (id: string, reviewNotes?: string) => void;
  deleteDocument: (id: string) => void;
  addInlineComment: (documentId: string, selectedText: string, commentText: string, parentCommentId?: string | null) => void;
  renewDocument: (id: string) => void;

  // Workflow Actions
  assignTask: (task: Omit<WorkflowTask, 'id' | 'createdAt' | 'updatedAt' | 'assignedById' | 'assignedByName' | 'status' | 'templateName' | 'title' | 'assigneeName' | 'assigneeAvatar'>) => WorkflowTask | null;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  markDocumentDelivered: (documentId: string) => void;

  // Notifications
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;

  // AI Assistance Simulations
  simulateAIVariableExtraction: (rawText: string) => Promise<{ title: string; category: LegalTemplate['category']; variables: any[]; templateHtml: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // LocalStorage helper
  const getInitial = <T,>(key: string, fallback: T): T => {
    try {
      const saved = localStorage.getItem(`lexdraft_${key}`);
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  };

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => getInitial('isAuthenticated', false));
  const [users, setUsers] = useState<User[]>(() => getInitial('users', initialUsers));
  const [currentUser, setCurrentUser] = useState<User>(() => getInitial('currentUser', initialUsers[0]));
  const [organization] = useState<Organization>(initialOrganization);

  const [clients, setClients] = useState<Client[]>(() => getInitial('clients', initialClients));
  const [matters, setMatters] = useState<Matter[]>(() => getInitial('matters', initialMatters));
  const [templates, setTemplates] = useState<LegalTemplate[]>(() => getInitial('templates', initialTemplates));
  const [documents, setDocuments] = useState<LegalDocument[]>(() => getInitial('documents', initialDocuments));
  const [tasks, setTasks] = useState<WorkflowTask[]>(() => getInitial('tasks', initialWorkflowTasks));
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => getInitial('activityLogs', initialActivityLogs));
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => getInitial('notifications', initialNotifications));

  const [theme, setTheme] = useState<'light' | 'dark'>(() => getInitial('theme', 'light'));
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' | 'error' } | null>(null);

  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    return currentUser.role === 'boss' ? 'boss_dashboard' : 'employee_dashboard';
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Sync state to local storage and trigger repository writes
  useEffect(() => {
    localStorage.setItem('lexdraft_isAuthenticated', JSON.stringify(isAuthenticated));
    localStorage.setItem('lexdraft_currentUser', JSON.stringify(currentUser));
    localStorage.setItem('lexdraft_users', JSON.stringify(users));
    localStorage.setItem('lexdraft_clients', JSON.stringify(clients));
    localStorage.setItem('lexdraft_matters', JSON.stringify(matters));
    localStorage.setItem('lexdraft_templates', JSON.stringify(templates));
    localStorage.setItem('lexdraft_documents', JSON.stringify(documents));
    localStorage.setItem('lexdraft_tasks', JSON.stringify(tasks));
    localStorage.setItem('lexdraft_activityLogs', JSON.stringify(activityLogs));
    localStorage.setItem('lexdraft_notifications', JSON.stringify(notifications));
    localStorage.setItem('lexdraft_theme', JSON.stringify(theme));
  }, [isAuthenticated, currentUser, users, clients, matters, templates, documents, tasks, activityLogs, notifications, theme]);

  // Background check for document expiries on load
  useEffect(() => {
    const checkExpiries = () => {
      const activeDocs = documents.filter(d => d.status === 'approved' && d.expiryDate);
      const now = new Date();
      activeDocs.forEach(d => {
        if (!d.expiryDate) return;
        const expiryTime = new Date(d.expiryDate).getTime();
        const diffDays = Math.ceil((expiryTime - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30 && diffDays > 0) {
          const alreadyNotified = notifications.some(n => n.linkId === d.id && n.type === 'expiry');
          if (!alreadyNotified) {
            addNotification(
              'Document Expiry Approaching',
              `Agreement "${d.title}" expires on ${d.expiryDate} (${diffDays} days left) — renew?`,
              'expiry',
              d.id
            );
          }
        }
      });
    };
    if (isAuthenticated) {
      checkExpiries();
    }
  }, [isAuthenticated, documents, notifications]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    showToast(`Switched to ${next === 'light' ? 'Light' : 'Dark'} Theme`, 'info');
  };

  const showToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const logActivity = (action: string, entityType: ActivityLog['entityType'], entityId: string, entityName: string, details: string) => {
    const newLog: ActivityLog = {
      id: `log_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      entityType,
      entityId,
      entityName,
      details,
      timestamp: new Date().toISOString()
    };
    setActivityLogs(prev => {
      const next = [newLog, ...prev];
      dataRepository.saveActivityLogs(next);
      return next;
    });
  };

  const addNotification = (title: string, message: string, type: NotificationItem['type'], linkId: string) => {
    const newNotif: NotificationItem = {
      id: `notif_${Date.now()}`,
      title,
      message,
      timestamp: 'Just now',
      read: false,
      type,
      linkId
    };
    setNotifications(prev => {
      const next = [newNotif, ...prev];
      dataRepository.saveNotifications(next);
      return next;
    });
  };

  // Auth Methods
  const login = (email: string, role: UserRole) => {
    const matched = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.role === role) ||
      users.find(u => u.role === role) || users[0];

    setCurrentUser(matched);
    setIsAuthenticated(true);
    setActiveTab(matched.role === 'boss' ? 'boss_dashboard' : 'employee_dashboard');
    showToast(`Welcome back, ${matched.name}!`, 'success');
  };

  const quickLogin = (role: UserRole) => {
    const matched = users.find(u => u.role === role) || users[0];
    setCurrentUser(matched);
    setIsAuthenticated(true);
    setActiveTab(matched.role === 'boss' ? 'boss_dashboard' : 'employee_dashboard');
    showToast(`Logged in as ${matched.role === 'boss' ? 'Senior Partner' : 'Associate Lawyer'}`, 'success');
  };

  const logout = () => {
    setIsAuthenticated(false);
    showToast('Signed out successfully.', 'info');
  };

  // Client & Matter Actions
  const createClient = async (name: string, email: string, phone: string): Promise<Client | null> => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      showToast('All client details are required.', 'error');
      return null;
    }

    const newClient: Client = {
      id: `client_${Date.now()}`,
      name: name.trim(),
      contactEmail: email.trim(),
      contactPhone: phone.trim(),
      createdAt: new Date().toISOString()
    };

    setClients(prev => {
      const next = [...prev, newClient];
      dataRepository.saveClients(next);
      return next;
    });

    logActivity('Created Client', 'document', newClient.id, newClient.name, `Added client: ${newClient.name}`);
    showToast(`Client "${newClient.name}" created successfully.`, 'success');
    return newClient;
  };

  const createMatter = async (clientId: string, title: string, matterCode: string): Promise<Matter | null> => {
    if (!clientId || !title.trim() || !matterCode.trim()) {
      showToast('All matter details are required.', 'error');
      return null;
    }

    const clientExists = clients.some(c => c.id === clientId);
    if (!clientExists) {
      showToast('Selected client does not exist.', 'error');
      return null;
    }

    const newMatter: Matter = {
      id: `matter_${Date.now()}`,
      clientId,
      title: title.trim(),
      matterCode: matterCode.trim(),
      status: 'active',
      documentIds: [],
      createdAt: new Date().toISOString()
    };

    setMatters(prev => {
      const next = [...prev, newMatter];
      dataRepository.saveMatters(next);
      return next;
    });

    logActivity('Created Matter', 'document', newMatter.id, newMatter.title, `Added matter: ${newMatter.title}`);
    showToast(`Matter "${newMatter.title}" created successfully.`, 'success');
    return newMatter;
  };

  // Template Actions
  const createTemplate = (data: Omit<LegalTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'versionHistory' | 'status'>): LegalTemplate | null => {
    if (!checkPermission(currentUser, 'create_edit_delete_template')) {
      showToast('Only Partners can create master templates.', 'error');
      return null;
    }

    if (!data.name.trim() || !data.contentTemplate.trim()) {
      showToast('Template name and template structure are required.', 'error');
      return null;
    }

    const newTpl: LegalTemplate = {
      ...data,
      id: `tpl_${Date.now()}`,
      status: 'active',
      versionHistory: [
        {
          version: '1.0',
          editedBy: currentUser.name,
          editedAt: new Date().toISOString(),
          changeSummary: 'Initial master template upload.'
        }
      ],
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setTemplates(prev => {
      const next = [newTpl, ...prev];
      dataRepository.saveTemplates(next);
      return next;
    });

    logActivity('Created Master Template', 'template', newTpl.id, newTpl.name, `Added reusable template: ${newTpl.name}`);
    showToast(`Template "${newTpl.name}" saved to library.`, 'success');
    return newTpl;
  };

  const updateTemplate = (id: string, updates: Partial<LegalTemplate>) => {
    if (!checkPermission(currentUser, 'create_edit_delete_template')) {
      showToast('Only Partners can modify master templates.', 'error');
      return;
    }

    setTemplates(prev => {
      const target = prev.find(t => t.id === id);
      if (!target) return prev;

      let nextVersion = target.version;
      const history = [...target.versionHistory];

      // If variables or content templates are changing, increment version
      if (updates.extractedVariables || updates.contentTemplate || updates.name) {
        const currentV = parseFloat(target.version);
        nextVersion = (currentV + 0.1).toFixed(1);
        history.push({
          version: nextVersion,
          editedBy: currentUser.name,
          editedAt: new Date().toISOString(),
          changeSummary: 'Manual template modification or custom variables merge.'
        });
      }

      const next = prev.map(t => t.id === id ? {
        ...t,
        ...updates,
        version: nextVersion,
        versionHistory: history,
        updatedAt: new Date().toISOString()
      } : t);

      dataRepository.saveTemplates(next);
      return next;
    });

    showToast('Master template updated and version incremented.', 'success');
  };

  const deleteTemplate = (id: string) => {
    if (!checkPermission(currentUser, 'create_edit_delete_template')) {
      showToast('Only Partners can delete templates.', 'error');
      return;
    }

    const target = templates.find(t => t.id === id);
    if (!target) return;

    setTemplates(prev => {
      const next = prev.filter(t => t.id !== id);
      dataRepository.saveTemplates(next);
      return next;
    });

    logActivity('Deleted Template', 'template', id, target.name, 'Removed template from firm library.');
    showToast(`Template "${target.name}" deleted.`, 'info');
  };

  const requestTemplateCustomization = (templateId: string, customVariables: any[], reason: string) => {
    if (!checkPermission(currentUser, 'request_customization')) {
      showToast('Only Associate Lawyers can request customizations.', 'error');
      return;
    }

    const targetTpl = templates.find(t => t.id === templateId);
    if (!targetTpl) return;

    const requestObj: TemplateCustomizationRequest = {
      id: `cust_${Date.now()}`,
      templateId,
      templateName: targetTpl.name,
      requestedByLawyerId: currentUser.id,
      requestedByLawyerName: currentUser.name,
      customVariables,
      reason,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    setTemplates(prev => {
      const next = prev.map(t => {
        if (t.id === templateId) {
          const existing = t.pendingCustomizations || [];
          return { ...t, pendingCustomizations: [requestObj, ...existing] };
        }
        return t;
      });
      dataRepository.saveTemplates(next);
      return next;
    });

    logActivity('Requested Template Customization', 'customization', requestObj.id, targetTpl.name, `Requested variable additions: ${reason}`);
    addNotification('Template Customization Requested', `${currentUser.name} requested changes to "${targetTpl.name}".`, 'customization', templateId);
    showToast('Template customization requested! Pending Partner Approval.', 'success');
  };

  const approveTemplateCustomization = (customizationId: string) => {
    if (!checkPermission(currentUser, 'approve_decline_customization')) {
      showToast('Only Partners can approve customizations.', 'error');
      return;
    }

    let tplName = '';
    let targetTplId = '';
    let variablesToMerge: any[] = [];

    templates.forEach(t => {
      const req = t.pendingCustomizations?.find(c => c.id === customizationId && c.status === 'pending');
      if (req) {
        tplName = t.name;
        targetTplId = t.id;
        variablesToMerge = req.customVariables;
      }
    });

    if (!targetTplId) {
      showToast('Request not found or already processed.', 'error');
      return;
    }

    setTemplates(prev => {
      const next = prev.map(t => {
        if (t.id === targetTplId) {
          const currentV = parseFloat(t.version);
          const nextVersion = (currentV + 0.1).toFixed(1);
          const history = [...t.versionHistory, {
            version: nextVersion,
            editedBy: currentUser.name,
            editedAt: new Date().toISOString(),
            changeSummary: `Merged customization request: ${customizationId}`
          }];

          const mergedVariables = [...t.extractedVariables, ...variablesToMerge];
          const updatedCustomizations = (t.pendingCustomizations || []).map(c =>
            c.id === customizationId ? { ...c, status: 'approved' as const } : c
          );

          return {
            ...t,
            version: nextVersion,
            versionHistory: history,
            extractedVariables: mergedVariables,
            pendingCustomizations: updatedCustomizations,
            updatedAt: new Date().toISOString()
          };
        }
        return t;
      });
      dataRepository.saveTemplates(next);
      return next;
    });

    logActivity('Approved Template Customization', 'customization', customizationId, tplName, 'Partner approved lawyer template customization.');
    addNotification('Customization Approved', `Partner approved template customization for "${tplName}".`, 'approval', targetTplId);
    showToast('Customization Approved! Variables added to master template.', 'success');
  };

  const rejectTemplateCustomization = (customizationId: string) => {
    if (!checkPermission(currentUser, 'approve_decline_customization')) {
      showToast('Only Partners can decline customizations.', 'error');
      return;
    }

    let targetTplId = '';
    templates.forEach(t => {
      if (t.pendingCustomizations?.some(c => c.id === customizationId)) {
        targetTplId = t.id;
      }
    });

    if (!targetTplId) return;

    setTemplates(prev => {
      const next = prev.map(t => {
        if (t.id === targetTplId) {
          const updatedCustomizations = (t.pendingCustomizations || []).map(c =>
            c.id === customizationId ? { ...c, status: 'rejected' as const } : c
          );
          return { ...t, pendingCustomizations: updatedCustomizations };
        }
        return t;
      });
      dataRepository.saveTemplates(next);
      return next;
    });

    showToast('Customization Request Declined.', 'info');
  };

  // Document Actions
  const generateDocument = (
    templateId: string,
    clientId: string,
    matterId: string,
    variables: Record<string, string>,
    priority: TaskPriority = 'high',
    dueDate?: string,
    taskId?: string
  ): LegalDocument | null => {
    if (!checkPermission(currentUser, 'generate_document')) {
      showToast('Permission denied for document generation.', 'error');
      return null;
    }

    const tpl = templates.find(t => t.id === templateId);
    const client = clients.find(c => c.id === clientId);
    const matter = matters.find(m => m.id === matterId);

    if (!tpl || !client || !matter) {
      showToast('Invalid template, client, or matter selection.', 'error');
      return null;
    }

    let compiledHtml = tpl.contentTemplate;
    Object.entries(variables).forEach(([k, v]) => {
      const reg = new RegExp(`{{\\s*${k}\\s*}}`, 'g');
      compiledHtml = compiledHtml.replace(reg, `<strong>${v || `[${k}]`}</strong>`);
    });

    const newDoc: LegalDocument = {
      id: `doc_${Date.now()}`,
      templateId: tpl.id,
      templateVersionAtGeneration: tpl.version,
      title: `${tpl.name.split(' ')[0]} - ${client.name}`,
      clientId,
      matterId,
      category: tpl.category,
      authorId: currentUser.id,
      authorName: currentUser.name,
      status: 'draft',
      priority,
      dueDate: dueDate || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      content: compiledHtml,
      variables,
      currentVersion: 1,
      versions: [
        {
          versionNumber: 1,
          timestamp: new Date().toISOString(),
          authorId: currentUser.id,
          authorName: currentUser.name,
          changeDescription: 'Initial draft compiled from template.',
          content: compiledHtml,
          variablesState: variables
        }
      ],
      comments: [],
      reviewHistory: [],
      expiryDate: null,
      lockedAt: null,
      pdfExportUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Update documents list
    setDocuments(prev => {
      const next = [newDoc, ...prev];
      dataRepository.saveDocuments(next);
      return next;
    });

    // Update template count
    updateTemplate(tpl.id, { usageCount: tpl.usageCount + 1 });

    // Link Matter documentIds list
    setMatters(prev => {
      const next = prev.map(m => m.id === matterId ? { ...m, documentIds: [...m.documentIds, newDoc.id] } : m);
      dataRepository.saveMatters(next);
      return next;
    });

    // Phase 2: Link Task if taskId is present
    if (taskId) {
      setTasks(prev => {
        const next = prev.map(t => t.id === taskId ? {
          ...t,
          documentId: newDoc.id,
          status: 'draft_ready' as const,
          updatedAt: new Date().toISOString()
        } : t);
        dataRepository.saveTasks(next);
        return next;
      });
    }

    logActivity('Generated Legal Document', 'document', newDoc.id, newDoc.title, `Compiled document from template "${tpl.name}" for client ${client.name}.`);
    showToast(`Legal Document "${newDoc.title}" compiled successfully!`, 'success');
    return newDoc;
  };

  const saveDocumentDraft = (id: string, content: string, variables: Record<string, string>, changeDescription = 'Saved draft version checkpoint.') => {
    if (!checkPermission(currentUser, 'edit_assigned_draft')) {
      showToast('Permission denied for editing.', 'error');
      return;
    }

    const doc = documents.find(d => d.id === id);
    if (!doc) return;

    if (doc.status === 'approved') {
      showToast('Cannot edit approved and sealed documents.', 'error');
      return;
    }

    setDocuments(prev => {
      const next = prev.map(d => {
        if (d.id === id) {
          const nextVersion = d.currentVersion + 1;
          const newVersionObj = {
            versionNumber: nextVersion,
            timestamp: new Date().toISOString(),
            authorId: currentUser.id,
            authorName: currentUser.name,
            changeDescription,
            content,
            variablesState: variables
          };

          return {
            ...d,
            content,
            variables,
            currentVersion: nextVersion,
            versions: [newVersionObj, ...d.versions],
            updatedAt: new Date().toISOString()
          };
        }
        return d;
      });
      dataRepository.saveDocuments(next);
      return next;
    });

    logActivity('Saved Version Snapshot', 'document', id, doc.title, changeDescription);
    showToast('Version snapshot saved to document history!', 'success');
  };

  const restoreDocumentVersion = (documentId: string, versionNumber: number) => {
    if (!checkPermission(currentUser, 'restore_snapshot')) {
      showToast('Permission denied for restoring versions.', 'error');
      return;
    }

    const doc = documents.find(d => d.id === documentId);
    if (!doc) return;

    if (doc.status === 'approved') {
      showToast('Cannot restore version on approved and sealed documents.', 'error');
      return;
    }

    const targetV = doc.versions.find(v => v.versionNumber === versionNumber);
    if (!targetV) {
      showToast('Specified version was not found.', 'error');
      return;
    }

    setDocuments(prev => {
      const next = prev.map(d => {
        if (d.id === documentId) {
          const restoredVersionNumber = d.currentVersion + 1;
          const restoredVersionObj = {
            versionNumber: restoredVersionNumber,
            timestamp: new Date().toISOString(),
            authorId: currentUser.id,
            authorName: currentUser.name,
            changeDescription: `Restored historic version checkpoint v${versionNumber}.`,
            content: targetV.content,
            variablesState: targetV.variablesState
          };

          return {
            ...d,
            content: targetV.content,
            variables: targetV.variablesState,
            currentVersion: restoredVersionNumber,
            versions: [restoredVersionObj, ...d.versions],
            updatedAt: new Date().toISOString()
          };
        }
        return d;
      });
      dataRepository.saveDocuments(next);
      return next;
    });

    logActivity('Restored Historic Version', 'document', documentId, doc.title, `Restored version checkpoint v${versionNumber}.`);
    showToast(`Restored version v${versionNumber} as new active draft v${doc.currentVersion + 1}`, 'success');
  };

  const submitDocumentForReview = (id: string) => {
    if (!checkPermission(currentUser, 'submit_draft')) {
      showToast('Only Associate Lawyers submit drafts for review.', 'error');
      return;
    }

    const doc = documents.find(d => d.id === id);
    if (!doc) return;

    if (doc.status !== 'draft' && doc.status !== 'rejected') {
      showToast('Document is not in a submittable state.', 'error');
      return;
    }

    setDocuments(prev => {
      const next = prev.map(d => d.id === id ? { ...d, status: 'under_review' as const } : d);
      dataRepository.saveDocuments(next);
      return next;
    });

    setTasks(prev => {
      const next = prev.map(t => t.documentId === id ? { ...t, status: 'under_review' as const } : t);
      dataRepository.saveTasks(next);
      return next;
    });

    logActivity('Submitted for Review', 'document', id, doc.title, 'Associate lawyer submitted draft for Senior Partner review.');
    addNotification('Review Request Submitted', `${currentUser.name} submitted "${doc.title}" for review.`, 'review', id);
    showToast('Document submitted for Senior Partner review.', 'success');
  };

  const approveDocument = (id: string, reviewNotes = 'Approved & sealed by Partner.') => {
    if (!checkPermission(currentUser, 'approve_seal')) {
      showToast('Only Partners can approve and seal documents.', 'error');
      return;
    }

    const doc = documents.find(d => d.id === id);
    if (!doc) return;

    if (doc.status !== 'under_review') {
      showToast('Only documents under review can be approved.', 'error');
      return;
    }

    const cycle: ReviewCycle = {
      cycleNumber: doc.reviewHistory.length + 1,
      documentVersionAtReview: doc.currentVersion,
      reviewerId: currentUser.id,
      reviewerName: currentUser.name,
      decision: 'approved',
      notes: reviewNotes,
      timestamp: new Date().toISOString()
    };

    const computeExpiryDate = (templateId: string, vars: Record<string, string>): string | null => {
      try {
        if (templateId === 'tpl_nda') {
          const effDateStr = vars.Effective_Date || new Date().toISOString().split('T')[0];
          const years = parseInt(vars.Confidentiality_Years || '3', 10);
          const date = new Date(effDateStr);
          date.setFullYear(date.getFullYear() + years);
          return date.toISOString().split('T')[0];
        }
        if (templateId === 'tpl_rental') {
          const startDateStr = vars.Lease_Start_Date || new Date().toISOString().split('T')[0];
          const months = parseInt(vars.Lease_Term_Months || '11', 10);
          const date = new Date(startDateStr);
          date.setMonth(date.getMonth() + months);
          return date.toISOString().split('T')[0];
        }
      } catch (e) {
        console.error('Error computing expiry date', e);
      }
      return null;
    };

    const lockDate = new Date().toISOString();
    const pdfUrl = `/exports/doc_${id}_sealed.pdf`;
    const expiry = computeExpiryDate(doc.templateId, doc.variables);

    setDocuments(prev => {
      const next = prev.map(d => d.id === id ? {
        ...d,
        status: 'approved' as const,
        reviewHistory: [...d.reviewHistory, cycle],
        lockedAt: lockDate,
        pdfExportUrl: pdfUrl,
        expiryDate: expiry
      } : d);
      dataRepository.saveDocuments(next);
      return next;
    });

    setTasks(prev => {
      const next = prev.map(t => t.documentId === id ? { ...t, status: 'approved' as const } : t);
      dataRepository.saveTasks(next);
      return next;
    });

    logActivity('Approved & Sealed Document', 'document', id, doc.title, `Senior Partner approved document. Notes: ${reviewNotes}`);
    addNotification('Document Approved & Sealed', `Senior Partner approved and sealed "${doc.title}".`, 'approval', id);
    showToast('Document Approved & Sealed by Senior Partner!', 'success');
  };

  const rejectDocument = (id: string, reviewNotes = 'Revisions requested.') => {
    if (!checkPermission(currentUser, 'reject_document')) {
      showToast('Only Partners can request revisions.', 'error');
      return;
    }

    const doc = documents.find(d => d.id === id);
    if (!doc) return;

    if (doc.status !== 'under_review') {
      showToast('Only documents under review can be sent back for revisions.', 'error');
      return;
    }

    const cycle: ReviewCycle = {
      cycleNumber: doc.reviewHistory.length + 1,
      documentVersionAtReview: doc.currentVersion,
      reviewerId: currentUser.id,
      reviewerName: currentUser.name,
      decision: 'rejected',
      notes: reviewNotes,
      timestamp: new Date().toISOString()
    };

    setDocuments(prev => {
      const next = prev.map(d => d.id === id ? {
        ...d,
        status: 'rejected' as const,
        reviewHistory: [...d.reviewHistory, cycle]
      } : d);
      dataRepository.saveDocuments(next);
      return next;
    });

    setTasks(prev => {
      const next = prev.map(t => t.documentId === id ? { ...t, status: 'in_progress' as const } : t);
      dataRepository.saveTasks(next);
      return next;
    });

    logActivity('Requested Document Revisions', 'document', id, doc.title, `Senior Partner requested revisions. Notes: ${reviewNotes}`);
    addNotification('Revisions Requested', `Partner requested revisions on "${doc.title}".`, 'rejection', id);
    showToast('Revisions requested and sent back to lawyer.', 'warning');
  };

  const deleteDocument = (id: string) => {
    if (!checkPermission(currentUser, 'create_edit_delete_template')) { // Boss only delete vault items
      showToast('Only Partners can delete documents from vault.', 'error');
      return;
    }

    const target = documents.find(d => d.id === id);
    if (!target) return;

    setDocuments(prev => {
      const next = prev.filter(d => d.id !== id);
      dataRepository.saveDocuments(next);
      return next;
    });

    logActivity('Deleted Document', 'document', id, target.title, 'Document removed from firm vault.');
    showToast(`Document "${target.title}" deleted.`, 'info');
  };

  const addInlineComment = (documentId: string, selectedText: string, commentText: string, parentCommentId: string | null = null) => {
    const doc = documents.find(d => d.id === documentId);
    if (!doc) return;

    if (doc.status === 'approved') {
      showToast('Cannot comment on approved and sealed documents.', 'error');
      return;
    }

    const commentObj = {
      id: `cmt_${Date.now()}`,
      parentCommentId,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      timestamp: new Date().toISOString(),
      selectedText,
      commentText,
      resolved: false
    };

    setDocuments(prev => {
      const next = prev.map(d => {
        if (d.id === documentId) {
          return { ...d, comments: [...d.comments, commentObj] };
        }
        return d;
      });
      dataRepository.saveDocuments(next);
      return next;
    });

    showToast('Inline review comment posted.', 'success');
  };

  // Phase 3 renewals stub
  const renewDocument = (id: string) => {
    if (!checkPermission(currentUser, 'renew_document')) {
      showToast('Only Partners can renew documents.', 'error');
      return;
    }

    const doc = documents.find(d => d.id === id);
    if (!doc) {
      showToast('Document not found.', 'error');
      return;
    }

    if (doc.status !== 'approved') {
      showToast('Only approved and sealed documents can be renewed.', 'error');
      return;
    }

    const renewedDoc: LegalDocument = {
      ...doc,
      id: `doc_${Date.now()}`,
      title: `${doc.title} (Renewed)`,
      status: 'draft',
      currentVersion: 1,
      versions: [
        {
          versionNumber: 1,
          timestamp: new Date().toISOString(),
          authorId: currentUser.id,
          authorName: currentUser.name,
          changeDescription: `Renewed document cloned from sealed template version ${doc.templateVersionAtGeneration}.`,
          content: doc.content,
          variablesState: doc.variables
        }
      ],
      comments: [],
      reviewHistory: [],
      expiryDate: null,
      lockedAt: null,
      pdfExportUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setDocuments(prev => {
      const next = [renewedDoc, ...prev];
      dataRepository.saveDocuments(next);
      return next;
    });

    logActivity('Renewed Document', 'document', renewedDoc.id, renewedDoc.title, `Sealed document ${doc.title} cloned for renewal.`);
    showToast(`Document renewed! Saved as new draft: "${renewedDoc.title}"`, 'success');
    setSelectedDocumentId(renewedDoc.id);
    setActiveTab('document_editor');
  };

  // Workflow Actions
  const assignTask = (data: Omit<WorkflowTask, 'id' | 'createdAt' | 'updatedAt' | 'assignedById' | 'assignedByName' | 'status' | 'templateName' | 'title' | 'assigneeName' | 'assigneeAvatar'>): WorkflowTask | null => {
    if (!checkPermission(currentUser, 'assign_task')) {
      showToast('Only Partners can assign new tasks.', 'error');
      return null;
    }

    const assignee = users.find(u => u.id === data.assigneeId);
    const tpl = templates.find(t => t.id === data.templateId);
    const client = clients.find(c => c.id === data.clientId);
    const matter = matters.find(m => m.id === data.matterId);

    if (!assignee || !tpl || !client || !matter) {
      showToast('Invalid assignment targets.', 'error');
      return null;
    }

    const newTask: WorkflowTask = {
      ...data,
      id: `task_${Date.now()}`,
      documentId: null,
      templateName: tpl.name,
      title: `Draft ${tpl.name.split(' ')[0]} - ${client.name}`,
      assigneeName: assignee.name,
      assigneeAvatar: assignee.avatar,
      assignedById: currentUser.id,
      assignedByName: currentUser.name,
      status: 'assigned',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setTasks(prev => {
      const next = [newTask, ...prev];
      dataRepository.saveTasks(next);
      return next;
    });

    logActivity('Assigned Workflow Task', 'task', newTask.id, newTask.title, `Partner assigned task to ${assignee.name}.`);
    addNotification('New Task Assignment', `Partner assigned task: "${newTask.title}".`, 'task', newTask.id);
    showToast(`Task assigned to ${assignee.name}.`, 'success');
    return newTask;
  };

  const updateTaskStatus = (taskId: string, status: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!canUpdateTask(currentUser, task)) {
      showToast('Permission denied. You can only move your own assigned cards.', 'error');
      return;
    }

    // Lawyers cannot move cards into approved/completed manually
    if (currentUser.role === 'employee' && (status === 'approved' || status === 'completed')) {
      showToast('Only partner sealing or delivery actions can set tasks to Approved/Completed.', 'error');
      return;
    }

    setTasks(prev => {
      const next = prev.map(t => {
        if (t.id === taskId) {
          return { ...t, status, updatedAt: new Date().toISOString() };
        }
        return t;
      });
      dataRepository.saveTasks(next);
      return next;
    });

    logActivity('Updated Task Kanban Status', 'task', taskId, task.title, `Moved task status to ${status.toUpperCase().replace('_', ' ')}.`);
    showToast(`Task updated to ${status.replace('_', ' ').toUpperCase()}`, 'info');
  };

  const markDocumentDelivered = (documentId: string) => {
    if (!checkPermission(currentUser, 'approve_seal')) { // Boss only delivery
      showToast('Only Partners can mark documents as delivered.', 'error');
      return;
    }

    const doc = documents.find(d => d.id === documentId);
    if (!doc) return;

    if (doc.status !== 'approved') {
      showToast('Only approved and sealed documents can be marked as delivered.', 'error');
      return;
    }

    setTasks(prev => {
      const next = prev.map(t => t.documentId === documentId ? {
        ...t,
        status: 'completed' as const,
        updatedAt: new Date().toISOString()
      } : t);
      dataRepository.saveTasks(next);
      return next;
    });

    logActivity('Marked Document Delivered', 'document', documentId, doc.title, 'Partner marked document as delivered to client.');
    showToast('Document marked as delivered and task completed!', 'success');
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => {
      const next = prev.map(n => n.id === id ? { ...n, read: true } : n);
      dataRepository.saveNotifications(next);
      return next;
    });
  };

  const clearAllNotifications = () => {
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, read: true }));
      dataRepository.saveNotifications(next);
      return next;
    });
  };

  // AI Extraction Simulation
  const simulateAIVariableExtraction = async (rawText: string) => {
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
      title: 'Extracted Legal Agreement Template',
      category: 'Corporate' as const,
      variables: [
        { id: 'ev1', key: 'Party_A_Name', label: 'First Party Legal Name', type: 'text' as const, required: true, defaultValue: 'First Party Ltd' },
        { id: 'ev2', key: 'Party_B_Name', label: 'Second Party Legal Name', type: 'text' as const, required: true, defaultValue: 'Second Party Corp' },
        { id: 'ev3', key: 'Agreement_Value', label: 'Contract Amount (₹)', type: 'currency' as const, required: true, defaultValue: '500000' },
        { id: 'ev4', key: 'Effective_Date', label: 'Effective Date', type: 'date' as const, required: true, defaultValue: new Date().toISOString().split('T')[0] }
      ],
      templateHtml: `<h1>LEGAL AGREEMENT</h1><p>This Agreement is executed on <strong>{{Effective_Date}}</strong> by and between <strong>{{Party_A_Name}}</strong> and <strong>{{Party_B_Name}}</strong> for consideration of <strong>₹{{Agreement_Value}}</strong>.</p>`
    };
  };

  return (
    <AppContext.Provider value={{
      isAuthenticated,
      currentUser,
      users,
      organization,
      theme,
      toggleTheme,
      isCommandPaletteOpen,
      setIsCommandPaletteOpen,
      toast,
      showToast,
      login,
      quickLogin,
      logout,
      clients,
      matters,
      templates,
      documents,
      tasks,
      activityLogs,
      notifications,
      activeTab,
      setActiveTab,
      selectedTemplateId,
      setSelectedTemplateId,
      selectedDocumentId,
      setSelectedDocumentId,
      selectedTaskId,
      setSelectedTaskId,
      createClient,
      createMatter,
      createTemplate,
      updateTemplate,
      deleteTemplate,
      requestTemplateCustomization,
      approveTemplateCustomization,
      rejectTemplateCustomization,
      generateDocument,
      saveDocumentDraft,
      restoreDocumentVersion,
      submitDocumentForReview,
      approveDocument,
      rejectDocument,
      deleteDocument,
      addInlineComment,
      renewDocument,
      assignTask,
      updateTaskStatus,
      markDocumentDelivered,
      markNotificationRead,
      clearAllNotifications,
      simulateAIVariableExtraction
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
