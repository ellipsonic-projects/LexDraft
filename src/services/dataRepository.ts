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

const KEYS = {
  USERS: 'lexdraft_users',
  ORGANIZATION: 'lexdraft_organization',
  CLIENTS: 'lexdraft_clients',
  MATTERS: 'lexdraft_matters',
  TEMPLATES: 'lexdraft_templates',
  DOCUMENTS: 'lexdraft_documents',
  TASKS: 'lexdraft_tasks',
  ACTIVITY_LOGS: 'lexdraft_activityLogs',
  NOTIFICATIONS: 'lexdraft_notifications',
};

// Local storage helpers
const getLocal = <T>(key: string, fallback: T): T => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
};

const setLocal = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving to localStorage for key: ${key}`, e);
  }
};

export const dataRepository = {
  // Authentication / Users
  getUsers: async (): Promise<User[]> => {
    return getLocal<User[]>(KEYS.USERS, initialUsers);
  },
  saveUsers: async (users: User[]): Promise<void> => {
    setLocal(KEYS.USERS, users);
  },

  // Organization
  getOrganization: async (): Promise<Organization> => {
    return getLocal<Organization>(KEYS.ORGANIZATION, initialOrganization);
  },

  // Clients
  getClients: async (): Promise<Client[]> => {
    return getLocal<Client[]>(KEYS.CLIENTS, initialClients);
  },
  saveClients: async (clients: Client[]): Promise<void> => {
    setLocal(KEYS.CLIENTS, clients);
  },
  addClient: async (client: Client): Promise<Client> => {
    const clients = await dataRepository.getClients();
    clients.push(client);
    await dataRepository.saveClients(clients);
    return client;
  },

  // Matters
  getMatters: async (): Promise<Matter[]> => {
    return getLocal<Matter[]>(KEYS.MATTERS, initialMatters);
  },
  saveMatters: async (matters: Matter[]): Promise<void> => {
    setLocal(KEYS.MATTERS, matters);
  },
  addMatter: async (matter: Matter): Promise<Matter> => {
    const matters = await dataRepository.getMatters();
    matters.push(matter);
    await dataRepository.saveMatters(matters);
    return matter;
  },
  updateMatter: async (id: string, updates: Partial<Matter>): Promise<Matter> => {
    const matters = await dataRepository.getMatters();
    const idx = matters.findIndex(m => m.id === id);
    if (idx === -1) throw new Error(`Matter with ID ${id} not found.`);
    matters[idx] = { ...matters[idx], ...updates };
    await dataRepository.saveMatters(matters);
    return matters[idx];
  },

  // Templates
  getTemplates: async (): Promise<LegalTemplate[]> => {
    return getLocal<LegalTemplate[]>(KEYS.TEMPLATES, initialTemplates);
  },
  saveTemplates: async (templates: LegalTemplate[]): Promise<void> => {
    setLocal(KEYS.TEMPLATES, templates);
  },
  addTemplate: async (template: LegalTemplate): Promise<LegalTemplate> => {
    const templates = await dataRepository.getTemplates();
    templates.push(template);
    await dataRepository.saveTemplates(templates);
    return template;
  },
  updateTemplate: async (id: string, updates: Partial<LegalTemplate>): Promise<LegalTemplate> => {
    const templates = await dataRepository.getTemplates();
    const idx = templates.findIndex(t => t.id === id);
    if (idx === -1) throw new Error(`Template with ID ${id} not found.`);
    templates[idx] = { ...templates[idx], ...updates, updatedAt: new Date().toISOString() };
    await dataRepository.saveTemplates(templates);
    return templates[idx];
  },
  deleteTemplate: async (id: string): Promise<void> => {
    const templates = await dataRepository.getTemplates();
    const updated = templates.filter(t => t.id !== id);
    await dataRepository.saveTemplates(updated);
  },

  // Documents
  getDocuments: async (): Promise<LegalDocument[]> => {
    return getLocal<LegalDocument[]>(KEYS.DOCUMENTS, initialDocuments);
  },
  saveDocuments: async (documents: LegalDocument[]): Promise<void> => {
    setLocal(KEYS.DOCUMENTS, documents);
  },
  addDocument: async (document: LegalDocument): Promise<LegalDocument> => {
    const docs = await dataRepository.getDocuments();
    docs.push(document);
    await dataRepository.saveDocuments(docs);
    return document;
  },
  updateDocument: async (id: string, updates: Partial<LegalDocument>): Promise<LegalDocument> => {
    const docs = await dataRepository.getDocuments();
    const idx = docs.findIndex(d => d.id === id);
    if (idx === -1) throw new Error(`Document with ID ${id} not found.`);
    docs[idx] = { ...docs[idx], ...updates, updatedAt: new Date().toISOString() };
    await dataRepository.saveDocuments(docs);
    return docs[idx];
  },
  deleteDocument: async (id: string): Promise<void> => {
    const docs = await dataRepository.getDocuments();
    const updated = docs.filter(d => d.id !== id);
    await dataRepository.saveDocuments(updated);
  },

  // Tasks
  getTasks: async (): Promise<WorkflowTask[]> => {
    return getLocal<WorkflowTask[]>(KEYS.TASKS, initialWorkflowTasks);
  },
  saveTasks: async (tasks: WorkflowTask[]): Promise<void> => {
    setLocal(KEYS.TASKS, tasks);
  },
  addTask: async (task: WorkflowTask): Promise<WorkflowTask> => {
    const tasks = await dataRepository.getTasks();
    tasks.push(task);
    await dataRepository.saveTasks(tasks);
    return task;
  },
  updateTask: async (id: string, updates: Partial<WorkflowTask>): Promise<WorkflowTask> => {
    const tasks = await dataRepository.getTasks();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) throw new Error(`Task with ID ${id} not found.`);
    tasks[idx] = { ...tasks[idx], ...updates, updatedAt: new Date().toISOString() };
    await dataRepository.saveTasks(tasks);
    return tasks[idx];
  },
  deleteTask: async (id: string): Promise<void> => {
    const tasks = await dataRepository.getTasks();
    const updated = tasks.filter(t => t.id !== id);
    await dataRepository.saveTasks(updated);
  },

  // Activity Logs
  getActivityLogs: async (): Promise<ActivityLog[]> => {
    return getLocal<ActivityLog[]>(KEYS.ACTIVITY_LOGS, initialActivityLogs);
  },
  saveActivityLogs: async (logs: ActivityLog[]): Promise<void> => {
    setLocal(KEYS.ACTIVITY_LOGS, logs);
  },
  addActivityLog: async (log: ActivityLog): Promise<ActivityLog> => {
    const logs = await dataRepository.getActivityLogs();
    logs.unshift(log); // newest first
    await dataRepository.saveActivityLogs(logs);
    return log;
  },

  // Notifications
  getNotifications: async (): Promise<NotificationItem[]> => {
    return getLocal<NotificationItem[]>(KEYS.NOTIFICATIONS, initialNotifications);
  },
  saveNotifications: async (notifications: NotificationItem[]): Promise<void> => {
    setLocal(KEYS.NOTIFICATIONS, notifications);
  },
  addNotification: async (notification: NotificationItem): Promise<NotificationItem> => {
    const notifications = await dataRepository.getNotifications();
    notifications.unshift(notification); // newest first
    await dataRepository.saveNotifications(notifications);
    return notification;
  }
};
