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
import { initialUsers, initialOrganization } from '../data/initialData';
import { checkPermission, canUpdateTask } from '../utils/permissions';
import { dataRepository } from '../services/dataRepository';
import { api, setAccessToken } from '../services/api';

export type NavTab =
  | 'boss_dashboard'
  | 'employee_dashboard'
  | 'template_studio'
  | 'document_generator'
  | 'house_rental_wizard'
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
  login: (email: string, role: UserRole) => Promise<void>;
  quickLogin: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;

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
  createTemplate: (template: Omit<LegalTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'versionHistory' | 'status'>) => Promise<LegalTemplate | null>;
  updateTemplate: (id: string, updates: Partial<LegalTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  requestTemplateCustomization: (templateId: string, customVariables: any[], reason: string) => Promise<void>;
  approveTemplateCustomization: (customizationId: string) => Promise<void>;
  rejectTemplateCustomization: (customizationId: string) => Promise<void>;

  // Document Actions
  generateDocument: (templateId: string, clientId: string, matterId: string, variables: Record<string, string>, priority?: TaskPriority, dueDate?: string, taskId?: string) => Promise<LegalDocument | null>;
  saveDocumentDraft: (id: string, content: string, variables: Record<string, string>, changeDescription?: string) => Promise<void>;
  restoreDocumentVersion: (documentId: string, versionNumber: number) => Promise<void>;
  submitDocumentForReview: (id: string) => Promise<void>;
  approveDocument: (id: string, reviewNotes?: string) => Promise<void>;
  rejectDocument: (id: string, reviewNotes?: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  addInlineComment: (documentId: string, selectedText: string, commentText: string, parentCommentId?: string | null) => Promise<void>;
  renewDocument: (id: string) => Promise<void>;

  assignTask: (task: Omit<WorkflowTask, 'id' | 'createdAt' | 'updatedAt' | 'assignedById' | 'assignedByName' | 'status' | 'templateName' | 'assigneeName' | 'assigneeAvatar'>) => Promise<WorkflowTask | null>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  sendAgreementToClient: (taskId: string, documentId?: string) => Promise<void>;
  markDocumentDelivered: (documentId: string) => Promise<void>;

  // Notifications
  markNotificationRead: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;

  // AI Assistance Simulations
  simulateAIVariableExtraction: (rawText: string) => Promise<{ title: string; category: LegalTemplate['category']; variables: any[]; templateHtml: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User>(initialUsers[0]);
  const [organization, setOrganization] = useState<Organization>(initialOrganization);

  const [clients, setClients] = useState<Client[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [templates, setTemplates] = useState<LegalTemplate[]>([]);
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('lexdraft_theme');
    return saved ? JSON.parse(saved) : 'light';
  });
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' | 'error' } | null>(null);

  const [activeTab, setActiveTab] = useState<NavTab>('employee_dashboard');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Sync theme
  useEffect(() => {
    localStorage.setItem('lexdraft_theme', JSON.stringify(theme));
  }, [theme]);

  // Silent refresh on mount
  useEffect(() => {
    const trySilentLogin = async () => {
      try {
        const refreshResult = await api.post('/auth/refresh');
        const token = refreshResult.data.accessToken;
        setAccessToken(token);

        const profileResult = await api.get('/auth/me');
        const user = profileResult.data.user;

        setCurrentUser({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.toLowerCase() === 'boss' ? 'boss' : 'employee',
          title: user.title || 'Legal Professional',
          avatar: user.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
          status: 'online'
        });
        setIsAuthenticated(true);
      } catch (err) {
        setIsAuthenticated(false);
      }
    };
    trySilentLogin();
  }, []);

  // Fetch all domain data from live API upon successful authentication
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadAllData = async () => {
      try {
        const [
          fetchedUsers,
          fetchedOrg,
          fetchedClients,
          fetchedMatters,
          fetchedTemplates,
          fetchedDocuments,
          fetchedTasks,
          fetchedLogs,
          fetchedNotifications
        ] = await Promise.all([
          dataRepository.getUsers(),
          dataRepository.getOrganization(),
          dataRepository.getClients(),
          dataRepository.getMatters(),
          dataRepository.getTemplates(),
          dataRepository.getDocuments(),
          dataRepository.getTasks(),
          dataRepository.getActivityLogs(),
          dataRepository.getNotifications()
        ]);

        setUsers(fetchedUsers);
        setOrganization(fetchedOrg);
        setClients(fetchedClients);
        setMatters(fetchedMatters);
        setTemplates(fetchedTemplates);
        setDocuments(fetchedDocuments);
        setTasks(fetchedTasks);
        setActivityLogs(fetchedLogs);
        setNotifications(fetchedNotifications);

        // Adjust tab for dashboard mapping
        setActiveTab(currentUser.role === 'boss' ? 'boss_dashboard' : 'employee_dashboard');
      } catch (err) {
        console.error('Failed to load operational data from backend API:', err);
      }
    };

    loadAllData();

    // Periodic silent sync (every 8 seconds) to update Kanban in real time when client approves/rejects
    const syncInterval = setInterval(async () => {
      try {
        const [fetchedTasks, fetchedLogs, fetchedNotifs] = await Promise.all([
          dataRepository.getTasks(),
          dataRepository.getActivityLogs(),
          dataRepository.getNotifications()
        ]);
        setTasks(fetchedTasks);
        setActivityLogs(fetchedLogs);
        setNotifications(fetchedNotifs);
      } catch {
        // Silent background catch
      }
    }, 8000);

    return () => clearInterval(syncInterval);
  }, [isAuthenticated, currentUser.role]);

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

  // Auth Methods
  const login = async (email: string, _role: UserRole) => {
    try {
      const res = await api.post('/auth/login', { email, password: 'password123' });
      const token = res.data.accessToken;
      setAccessToken(token);

      const user = res.data.user;
      const mappedUser: User = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.toLowerCase() === 'boss' ? 'boss' : 'employee',
        title: user.title || 'Legal Professional',
        avatar: user.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
        status: 'online'
      };

      setCurrentUser(mappedUser);
      setIsAuthenticated(true);
      showToast(`Welcome back, ${mappedUser.name}!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Authentication failed. Please verify credentials.', 'error');
    }
  };

  const quickLogin = async (role: UserRole) => {
    const targetEmail = role === 'boss' ? 'partner@apexlegal.in' : 'lawyer@apexlegal.in';
    await login(targetEmail, role);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.warn('Logout request completed with warnings', e);
    } finally {
      setAccessToken(null);
      setIsAuthenticated(false);
      showToast('Signed out successfully.', 'info');
    }
  };

  // Client & Matter Actions
  const createClient = async (name: string, email: string, phone: string): Promise<Client | null> => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      showToast('All client details are required.', 'error');
      return null;
    }

    try {
      const newClient = await dataRepository.addClient({
        name: name.trim(),
        contactEmail: email.trim(),
        contactPhone: phone.trim()
      });

      setClients(prev => [...prev, newClient]);
      showToast(`Client "${newClient.name}" created successfully.`, 'success');
      
      // Refresh Activity Log
      const fetchedLogs = await dataRepository.getActivityLogs();
      setActivityLogs(fetchedLogs);
      
      return newClient;
    } catch (err: any) {
      showToast(err.message || 'Failed to create client.', 'error');
      return null;
    }
  };

  const createMatter = async (clientId: string, title: string, matterCode: string): Promise<Matter | null> => {
    if (!clientId || !title.trim() || !matterCode.trim()) {
      showToast('All matter details are required.', 'error');
      return null;
    }

    try {
      const newMatter = await dataRepository.addMatter({
        clientId,
        title: title.trim(),
        matterCode: matterCode.trim()
      });

      setMatters(prev => [...prev, newMatter]);
      showToast(`Matter "${newMatter.title}" created successfully.`, 'success');

      const fetchedLogs = await dataRepository.getActivityLogs();
      setActivityLogs(fetchedLogs);

      return newMatter;
    } catch (err: any) {
      showToast(err.message || 'Failed to create matter.', 'error');
      return null;
    }
  };

  // Template Actions
  const createTemplate = async (data: Omit<LegalTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'versionHistory' | 'status'>): Promise<LegalTemplate | null> => {
    if (!checkPermission(currentUser, 'create_edit_delete_template')) {
      showToast('Only Partners can create master templates.', 'error');
      return null;
    }

    try {
      const t = await dataRepository.addTemplate(data as any);
      setTemplates(prev => [t, ...prev]);
      showToast(`Template "${t.name}" saved to library.`, 'success');
      return t;
    } catch (err: any) {
      showToast(err.message || 'Failed to save template.', 'error');
      return null;
    }
  };

  const updateTemplate = async (id: string, updates: Partial<LegalTemplate>) => {
    if (!checkPermission(currentUser, 'create_edit_delete_template')) {
      showToast('Only Partners can modify master templates.', 'error');
      return;
    }

    try {
      const updated = await dataRepository.updateTemplate(id, updates);
      setTemplates(prev => prev.map(t => t.id === id ? updated : t));
      showToast('Master template updated and version incremented.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update template.', 'error');
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!checkPermission(currentUser, 'create_edit_delete_template')) {
      showToast('Only Partners can delete templates.', 'error');
      return;
    }

    try {
      await dataRepository.deleteTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      showToast('Template deleted successfully.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete template.', 'error');
    }
  };

  const requestTemplateCustomization = async (templateId: string, customVariables: any[], reason: string) => {
    try {
      await api.post('/customization-requests', {
        templateId,
        customVariables,
        reason
      });

      // Refresh template to pull new customization requests
      const fetchedTemplates = await dataRepository.getTemplates();
      setTemplates(fetchedTemplates);
      showToast('Template customization requested! Pending Partner Approval.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to request customization.', 'error');
    }
  };

  const approveTemplateCustomization = async (customizationId: string) => {
    try {
      await api.patch(`/customization-requests/${customizationId}/approve`);
      
      const fetchedTemplates = await dataRepository.getTemplates();
      setTemplates(fetchedTemplates);
      
      const fetchedLogs = await dataRepository.getActivityLogs();
      setActivityLogs(fetchedLogs);
      
      const fetchedNotifs = await dataRepository.getNotifications();
      setNotifications(fetchedNotifs);
      
      showToast('Customization Approved! Variables added to master template.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to approve customization.', 'error');
    }
  };

  const rejectTemplateCustomization = async (customizationId: string) => {
    try {
      await api.patch(`/customization-requests/${customizationId}/reject`);
      
      const fetchedTemplates = await dataRepository.getTemplates();
      setTemplates(fetchedTemplates);
      
      showToast('Customization Request Declined.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to reject customization.', 'error');
    }
  };

  // Document Actions
  const generateDocument = async (
    templateId: string,
    clientId: string,
    matterId: string,
    variables: Record<string, string>,
    priority: TaskPriority = 'high',
    dueDate?: string,
    taskId?: string
  ): Promise<LegalDocument | null> => {
    try {
      const res = await api.post('/documents/generate', {
        templateId,
        clientId,
        matterId,
        taskId,
        priority: priority.toLowerCase(),
        dueDate,
        variables
      });

      const newDoc = res.data.document;

      // Sync state variables
      const fetchedDocs = await dataRepository.getDocuments();
      setDocuments(fetchedDocs);

      const fetchedTasks = await dataRepository.getTasks();
      setTasks(fetchedTasks);

      const fetchedLogs = await dataRepository.getActivityLogs();
      setActivityLogs(fetchedLogs);

      showToast(`Legal Document compiled successfully!`, 'success');
      return newDoc;
    } catch (err: any) {
      showToast(err.message || 'Failed to generate document.', 'error');
      return null;
    }
  };

  const saveDocumentDraft = async (id: string, content: string, variables: Record<string, string>, changeDescription = 'Saved draft version checkpoint.') => {
    try {
      await api.post(`/documents/${id}/save-draft`, {
        content,
        variables,
        changeDescription
      });

      const fetchedDocs = await dataRepository.getDocuments();
      setDocuments(fetchedDocs);

      const fetchedLogs = await dataRepository.getActivityLogs();
      setActivityLogs(fetchedLogs);

      showToast('Version snapshot saved to document history!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save draft.', 'error');
    }
  };

  const restoreDocumentVersion = async (documentId: string, versionNumber: number) => {
    try {
      await api.post(`/documents/${documentId}/restore-version/${versionNumber}`);

      const fetchedDocs = await dataRepository.getDocuments();
      setDocuments(fetchedDocs);

      const fetchedLogs = await dataRepository.getActivityLogs();
      setActivityLogs(fetchedLogs);

      showToast('Historical version restored successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to restore version.', 'error');
    }
  };

  const submitDocumentForReview = async (id: string) => {
    try {
      await api.post(`/documents/${id}/submit-review`);

      const fetchedDocs = await dataRepository.getDocuments();
      setDocuments(fetchedDocs);

      const fetchedTasks = await dataRepository.getTasks();
      setTasks(fetchedTasks);

      const fetchedLogs = await dataRepository.getActivityLogs();
      setActivityLogs(fetchedLogs);

      const fetchedNotifs = await dataRepository.getNotifications();
      setNotifications(fetchedNotifs);

      showToast('Document submitted for Senior Partner review.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit document.', 'error');
    }
  };

  const approveDocument = async (id: string, reviewNotes = 'Approved & sealed by Partner.') => {
    try {
      await api.post(`/documents/${id}/review-decision`, {
        decision: 'approved',
        notes: reviewNotes
      });

      const fetchedDocs = await dataRepository.getDocuments();
      setDocuments(fetchedDocs);

      const fetchedTasks = await dataRepository.getTasks();
      setTasks(fetchedTasks);

      const fetchedLogs = await dataRepository.getActivityLogs();
      setActivityLogs(fetchedLogs);

      const fetchedNotifs = await dataRepository.getNotifications();
      setNotifications(fetchedNotifs);

      showToast('Document Approved & Sealed by Senior Partner!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to approve document.', 'error');
    }
  };

  const rejectDocument = async (id: string, reviewNotes = 'Revisions requested.') => {
    try {
      await api.post(`/documents/${id}/review-decision`, {
        decision: 'rejected',
        notes: reviewNotes
      });

      const fetchedDocs = await dataRepository.getDocuments();
      setDocuments(fetchedDocs);

      const fetchedTasks = await dataRepository.getTasks();
      setTasks(fetchedTasks);

      const fetchedLogs = await dataRepository.getActivityLogs();
      setActivityLogs(fetchedLogs);

      const fetchedNotifs = await dataRepository.getNotifications();
      setNotifications(fetchedNotifs);

      showToast('Revisions requested and sent back to lawyer.', 'warning');
    } catch (err: any) {
      showToast(err.message || 'Failed to reject document.', 'error');
    }
  };

  const deleteDocument = async (id: string) => {
    if (!checkPermission(currentUser, 'create_edit_delete_template')) {
      showToast('Only Partners can delete documents from vault.', 'error');
      return;
    }

    try {
      await dataRepository.deleteDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
      const fetchedTasks = await dataRepository.getTasks();
      setTasks(fetchedTasks);
      showToast('Document deleted successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete document.', 'error');
    }
  };

  const addInlineComment = async (documentId: string, selectedText: string, commentText: string, parentCommentId: string | null = null) => {
    try {
      await api.post(`/documents/${documentId}/comments`, {
        selectedText,
        commentText,
        parentCommentId: parentCommentId || undefined
      });

      const fetchedDocs = await dataRepository.getDocuments();
      setDocuments(fetchedDocs);

      showToast('Inline review comment posted.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to add review comment.', 'error');
    }
  };

  const renewDocument = async (id: string) => {
    try {
      const res = await api.post(`/documents/${id}/renew`, {});
      const renewed = res.data.document;

      const fetchedDocs = await dataRepository.getDocuments();
      setDocuments(fetchedDocs);

      const fetchedLogs = await dataRepository.getActivityLogs();
      setActivityLogs(fetchedLogs);

      showToast(`Document renewed! Saved as new draft.`, 'success');
      setSelectedDocumentId(renewed.id);
      setActiveTab('document_editor');
    } catch (err: any) {
      showToast(err.message || 'Failed to renew document.', 'error');
    }
  };

  const assignTask = async (data: Omit<WorkflowTask, 'id' | 'createdAt' | 'updatedAt' | 'assignedById' | 'assignedByName' | 'status' | 'templateName' | 'assigneeName' | 'assigneeAvatar'>): Promise<WorkflowTask | null> => {
    try {
      const task = await dataRepository.addTask(data);
      setTasks(prev => [task, ...prev]);

      const fetchedLogs = await dataRepository.getActivityLogs();
      setActivityLogs(fetchedLogs);

      const fetchedNotifs = await dataRepository.getNotifications();
      setNotifications(fetchedNotifs);

      showToast('Task assigned successfully.', 'success');
      return task;
    } catch (err: any) {
      showToast(err.message || 'Failed to assign task.', 'error');
      return null;
    }
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    try {
      await dataRepository.updateTask(taskId, { status });
      
      const fetchedTasks = await dataRepository.getTasks();
      setTasks(fetchedTasks);

      const fetchedLogs = await dataRepository.getActivityLogs();
      setActivityLogs(fetchedLogs);

      showToast(`Task status updated to ${status.replace('_', ' ').toUpperCase()}`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to update task status.', 'error');
    }
  };

  const sendAgreementToClient = async (taskId: string, documentId?: string) => {
    try {
      const res = await dataRepository.sendAgreementToClient(taskId, documentId);
      showToast(res.message || 'Agreement dispatched to client with attached PDF.', 'success');

      const [fetchedTasks, fetchedDocs, fetchedLogs, fetchedNotifs] = await Promise.all([
        dataRepository.getTasks(),
        dataRepository.getDocuments(),
        dataRepository.getActivityLogs(),
        dataRepository.getNotifications()
      ]);

      setTasks(fetchedTasks);
      setDocuments(fetchedDocs);
      setActivityLogs(fetchedLogs);
      setNotifications(fetchedNotifs);
    } catch (err: any) {
      showToast(err.message || 'Failed to dispatch agreement to client.', 'error');
      throw err;
    }
  };

  const markDocumentDelivered = async (documentId: string) => {
    try {
      await api.post(`/documents/${documentId}/deliver`, {});

      const fetchedDocs = await dataRepository.getDocuments();
      setDocuments(fetchedDocs);

      const fetchedTasks = await dataRepository.getTasks();
      setTasks(fetchedTasks);

      const fetchedLogs = await dataRepository.getActivityLogs();
      setActivityLogs(fetchedLogs);

      const fetchedNotifs = await dataRepository.getNotifications();
      setNotifications(fetchedNotifs);

      showToast('Document marked as delivered and task completed!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to mark document as delivered.', 'error');
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      
      const fetchedNotifs = await dataRepository.getNotifications();
      setNotifications(fetchedNotifs);
    } catch (err: any) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await api.delete('/notifications');
      setNotifications([]);
    } catch (err: any) {
      showToast(err.message || 'Failed to clear notifications.', 'error');
    }
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
      sendAgreementToClient,
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
