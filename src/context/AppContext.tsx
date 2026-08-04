import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  UserRole,
  Organization,
  LegalTemplate,
  LegalDocument,
  WorkflowTask,
  ActivityLog,
  NotificationItem,
  DocumentStatus,
  TaskStatus,
  TaskPriority,
  TemplateCustomizationRequest
} from '../types';
import {
  initialUsers,
  initialOrganization,
  initialTemplates,
  initialDocuments,
  initialWorkflowTasks,
  initialActivityLogs,
  initialNotifications
} from '../data/initialData';

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

  // Template Actions & Customizations
  createTemplate: (template: Omit<LegalTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => LegalTemplate;
  updateTemplate: (id: string, updates: Partial<LegalTemplate>) => void;
  deleteTemplate: (id: string) => void;
  requestTemplateCustomization: (templateId: string, customVariables: any[], reason: string) => void;
  approveTemplateCustomization: (customizationId: string) => void;
  rejectTemplateCustomization: (customizationId: string) => void;

  // Document Actions
  generateDocument: (templateId: string, clientName: string, variables: Record<string, any>, priority?: TaskPriority, dueDate?: string) => LegalDocument;
  saveDocumentDraft: (id: string, content: string, variables: Record<string, any>, changeDescription?: string) => void;
  restoreDocumentVersion: (documentId: string, versionNumber: number) => void;
  submitDocumentForReview: (id: string) => void;
  approveDocument: (id: string, reviewNotes?: string) => void;
  rejectDocument: (id: string, reviewNotes?: string) => void;
  deleteDocument: (id: string) => void;
  addInlineComment: (documentId: string, selectedText: string, commentText: string) => void;

  // Workflow Actions
  assignTask: (task: Omit<WorkflowTask, 'id' | 'createdAt' | 'updatedAt' | 'assignedById' | 'assignedByName' | 'status' | 'templateName' | 'title' | 'assigneeName' | 'assigneeAvatar'>) => WorkflowTask;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;

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

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('lexdraft_isAuthenticated', JSON.stringify(isAuthenticated));
    localStorage.setItem('lexdraft_currentUser', JSON.stringify(currentUser));
    localStorage.setItem('lexdraft_templates', JSON.stringify(templates));
    localStorage.setItem('lexdraft_documents', JSON.stringify(documents));
    localStorage.setItem('lexdraft_tasks', JSON.stringify(tasks));
    localStorage.setItem('lexdraft_activityLogs', JSON.stringify(activityLogs));
    localStorage.setItem('lexdraft_notifications', JSON.stringify(notifications));
    localStorage.setItem('lexdraft_theme', JSON.stringify(theme));
  }, [isAuthenticated, currentUser, templates, documents, tasks, activityLogs, notifications, theme]);

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
    setActivityLogs(prev => [newLog, ...prev]);
  };

  const addNotification = (title: string, message: string, type: NotificationItem['type'], linkId?: string) => {
    const newNotif: NotificationItem = {
      id: `notif_${Date.now()}`,
      title,
      message,
      timestamp: 'Just now',
      read: false,
      type,
      linkId
    };
    setNotifications(prev => [newNotif, ...prev]);
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

  // Template Actions
  const createTemplate = (data: Omit<LegalTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => {
    const newTpl: LegalTemplate = {
      ...data,
      id: `tpl_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      status: 'active'
    };
    setTemplates(prev => [newTpl, ...prev]);
    logActivity('Created Master Template', 'template', newTpl.id, newTpl.name, `Added reusable legal template with ${newTpl.extractedVariables.length} fields.`);
    showToast(`Template "${newTpl.name}" saved to library.`, 'success');
    return newTpl;
  };

  const updateTemplate = (id: string, updates: Partial<LegalTemplate>) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));
    showToast('Template updated.', 'success');
  };

  const deleteTemplate = (id: string) => {
    const target = templates.find(t => t.id === id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (target) {
      logActivity('Deleted Template', 'template', id, target.name, 'Removed template from firm repository.');
      showToast(`Template "${target.name}" deleted.`, 'info');
    }
  };

  const requestTemplateCustomization = (templateId: string, customVariables: any[], reason: string) => {
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

    setTemplates(prev => prev.map(t => {
      if (t.id === templateId) {
        const existing = t.pendingCustomizations || [];
        return { ...t, pendingCustomizations: [requestObj, ...existing] };
      }
      return t;
    }));

    logActivity('Requested Template Customization', 'customization', requestObj.id, targetTpl.name, `Lawyer ${currentUser.name} requested variable additions: ${reason}`);
    addNotification('Template Customization Requested', `${currentUser.name} requested changes to "${targetTpl.name}".`, 'customization', templateId);
    showToast('Template customization requested! Pending Partner Approval.', 'success');
  };

  const approveTemplateCustomization = (customizationId: string) => {
    let tplName = '';
    setTemplates(prev => prev.map(t => {
      if (t.pendingCustomizations) {
        const req = t.pendingCustomizations.find(c => c.id === customizationId);
        if (req) {
          tplName = t.name;
          const mergedVariables = [...t.extractedVariables, ...req.customVariables];
          const updatedCustomizations = t.pendingCustomizations.map(c => c.id === customizationId ? { ...c, status: 'approved' as const } : c);
          return {
            ...t,
            extractedVariables: mergedVariables,
            pendingCustomizations: updatedCustomizations,
            updatedAt: new Date().toISOString()
          };
        }
      }
      return t;
    }));

    logActivity('Approved Template Customization', 'customization', customizationId, tplName || 'Template', 'Partner approved lawyer template customization.');
    addNotification('Customization Approved', `Partner approved template customization for "${tplName}".`, 'approval');
    showToast('Customization Approved! Variables added to master template.', 'success');
  };

  const rejectTemplateCustomization = (customizationId: string) => {
    setTemplates(prev => prev.map(t => {
      if (t.pendingCustomizations) {
        const updatedCustomizations = t.pendingCustomizations.map(c => c.id === customizationId ? { ...c, status: 'rejected' as const } : c);
        return { ...t, pendingCustomizations: updatedCustomizations };
      }
      return t;
    }));
    showToast('Customization Request Declined.', 'info');
  };

  // Document Actions
  const generateDocument = (templateId: string, clientName: string, variables: Record<string, any>, priority: TaskPriority = 'high', dueDate?: string) => {
    const tpl = templates.find(t => t.id === templateId) || templates[0];

    let compiledHtml = tpl.contentTemplate;
    Object.entries(variables).forEach(([k, v]) => {
      const reg = new RegExp(`{{\\s*${k}\\s*}}`, 'g');
      compiledHtml = compiledHtml.replace(reg, `<strong>${v || `[${k}]`}</strong>`);
    });

    const newDoc: LegalDocument = {
      id: `doc_${Date.now()}`,
      templateId: tpl.id,
      title: `${tpl.name.split(' ')[0]} - ${clientName}`,
      clientName,
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setDocuments(prev => [newDoc, ...prev]);
    updateTemplate(tpl.id, { usageCount: tpl.usageCount + 1 });
    logActivity('Generated Legal Document', 'document', newDoc.id, newDoc.title, `Compiled document from template "${tpl.name}" for client ${clientName}.`);
    showToast(`Legal Document "${newDoc.title}" compiled successfully!`, 'success');
    return newDoc;
  };

  const saveDocumentDraft = (id: string, content: string, variables: Record<string, any>, changeDescription = 'Saved draft version checkpoint.') => {
    setDocuments(prev => prev.map(doc => {
      if (doc.id === id) {
        const nextVersion = doc.currentVersion + 1;
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
          ...doc,
          content,
          variables,
          currentVersion: nextVersion,
          versions: [newVersionObj, ...doc.versions],
          updatedAt: new Date().toISOString()
        };
      }
      return doc;
    }));

    logActivity('Saved Version Snapshot', 'document', id, 'Legal Draft', changeDescription);
    showToast('Version snapshot saved to document history!', 'success');
  };

  const restoreDocumentVersion = (documentId: string, versionNumber: number) => {
    setDocuments(prev => prev.map(doc => {
      if (doc.id === documentId) {
        const targetV = doc.versions.find(v => v.versionNumber === versionNumber);
        if (!targetV) return doc;

        const restoredVersionNumber = doc.currentVersion + 1;
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
          ...doc,
          content: targetV.content,
          variables: targetV.variablesState,
          currentVersion: restoredVersionNumber,
          versions: [restoredVersionObj, ...doc.versions],
          updatedAt: new Date().toISOString()
        };
      }
      return doc;
    }));

    logActivity('Restored Historic Version', 'document', documentId, 'Legal Document', `Restored version checkpoint v${versionNumber}.`);
    showToast(`Restored version v${versionNumber} as new active draft v${documents.find(d => d.id === documentId)?.currentVersion! + 1}`, 'success');
  };

  const submitDocumentForReview = (id: string) => {
    const doc = documents.find(d => d.id === id);
    if (!doc) return;

    setDocuments(prev => prev.map(d => d.id === id ? { ...d, status: 'under_review' } : d));
    setTasks(prev => prev.map(t => t.documentId === id ? { ...t, status: 'under_review' } : t));

    logActivity('Submitted for Review', 'document', id, doc.title, 'Associate lawyer submitted draft for Senior Partner review.');
    addNotification('Review Request Submitted', `${currentUser.name} submitted "${doc.title}" for review.`, 'review', id);
    showToast('Document submitted for Senior Partner review.', 'success');
  };

  const approveDocument = (id: string, reviewNotes = 'Approved & sealed by Partner.') => {
    const doc = documents.find(d => d.id === id);
    if (!doc) return;

    setDocuments(prev => prev.map(d => d.id === id ? { ...d, status: 'approved', reviewNotes } : d));
    setTasks(prev => prev.map(t => t.documentId === id ? { ...t, status: 'approved' } : t));

    logActivity('Approved & Sealed Document', 'document', id, doc.title, `Senior Partner approved document: ${reviewNotes}`);
    addNotification('Document Approved', `Senior Partner approved "${doc.title}".`, 'approval', id);
    showToast('Document Approved & Sealed by Senior Partner!', 'success');
  };

  const rejectDocument = (id: string, reviewNotes = 'Revisions requested.') => {
    const doc = documents.find(d => d.id === id);
    if (!doc) return;

    setDocuments(prev => prev.map(d => d.id === id ? { ...d, status: 'rejected', reviewNotes } : d));
    setTasks(prev => prev.map(t => t.documentId === id ? { ...t, status: 'in_progress' } : t));

    logActivity('Requested Document Revisions', 'document', id, doc.title, `Senior Partner requested revisions: ${reviewNotes}`);
    addNotification('Revisions Requested', `Partner requested revisions on "${doc.title}".`, 'rejection', id);
    showToast('Revisions requested and sent back to lawyer.', 'warning');
  };

  const deleteDocument = (id: string) => {
    const target = documents.find(d => d.id === id);
    setDocuments(prev => prev.filter(d => d.id !== id));
    if (target) {
      logActivity('Deleted Document', 'document', id, target.title, 'Document removed from firm vault.');
      showToast(`Document "${target.title}" deleted.`, 'info');
    }
  };

  const addInlineComment = (documentId: string, selectedText: string, commentText: string) => {
    const commentObj = {
      id: `cmt_${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      timestamp: new Date().toISOString(),
      selectedText,
      commentText,
      resolved: false
    };

    setDocuments(prev => prev.map(d => {
      if (d.id === documentId) {
        return { ...d, comments: [...d.comments, commentObj] };
      }
      return d;
    }));

    showToast('Inline review comment posted.', 'success');
  };

  // Task Actions
  const assignTask = (data: Omit<WorkflowTask, 'id' | 'createdAt' | 'updatedAt' | 'assignedById' | 'assignedByName' | 'status' | 'templateName' | 'title' | 'assigneeName' | 'assigneeAvatar'>) => {
    const assignee = users.find(u => u.id === data.assigneeId) || users[1];
    const tpl = templates.find(t => t.id === data.templateId) || templates[0];

    const newTask: WorkflowTask = {
      ...data,
      id: `task_${Date.now()}`,
      templateName: tpl.name,
      title: `Draft ${tpl.name.split(' ')[0]} - ${data.clientName}`,
      assigneeName: assignee.name,
      assigneeAvatar: assignee.avatar,
      assignedById: currentUser.id,
      assignedByName: currentUser.name,
      status: 'assigned',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setTasks(prev => [newTask, ...prev]);
    logActivity('Assigned Workflow Task', 'task', newTask.id, newTask.title, `Partner assigned task to ${assignee.name} with ${data.priority.toUpperCase()} urgency.`);
    addNotification('New Task Assignment', `Partner assigned task: "${newTask.title}".`, 'task', newTask.id);
    showToast(`Task assigned to ${assignee.name}.`, 'success');
    return newTask;
  };

  const updateTaskStatus = (taskId: string, status: TaskStatus) => {
    let taskName = '';
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        taskName = t.title;
        return { ...t, status, updatedAt: new Date().toISOString() };
      }
      return t;
    }));
    logActivity('Updated Task Kanban Status', 'task', taskId, taskName || 'Task', `Moved task status to ${status.toUpperCase().replace('_', ' ')}.`);
    showToast(`Task updated to ${status.replace('_', ' ').toUpperCase()}`, 'info');
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAllNotifications = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
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
      assignTask,
      updateTaskStatus,
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
