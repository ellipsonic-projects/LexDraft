import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SignatureConfigModal } from '../signatures/SignatureConfigModal';
import { SignatureStatusBadge } from '../signatures/SignatureStatusBadge';
import { dataRepository } from '../../services/dataRepository';
import { SignatureRequest } from '../../types';
import {
  Kanban as KanbanIcon,
  Plus,
  ChevronRight,
  X,
  Lock,
  Calendar,
  User,
  Briefcase,
  Send,
  CheckCircle2,
  Clock,
  Trash2
} from 'lucide-react';
import { TaskStatus, TaskPriority } from '../../types';

export const WorkflowKanban: React.FC = () => {
  const {
    currentUser,
    tasks,
    users,
    templates,
    assignTask,
    updateTaskStatus,
    sendAgreementToClient,
    deleteTask,
    theme,
    showToast,
    clients,
    matters,
    createClient,
    createMatter
  } = useApp();

  const isBoss = currentUser.role === 'boss';
  const isDark = theme === 'dark';
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [sendingTaskId, setSendingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState<string | null>(null);
  const [signingTaskId, setSigningTaskId] = useState<string | null>(null);
  const [signingDocumentId, setSigningDocumentId] = useState<string | null>(null);
  const [signingDocumentTitle, setSigningDocumentTitle] = useState<string>('');
  const [signingClientId, setSigningClientId] = useState<string | null>(null);
  // signatureMap: taskId -> SignatureRequest
  const [signatureMap, setSignatureMap] = useState<Record<string, SignatureRequest | null>>({});

  const [templateId, setTemplateId] = useState(templates[0]?.id || '');
  const [clientId, setClientId] = useState('');
  const [matterId, setMatterId] = useState('');
  const [assigneeId, setAssigneeId] = useState(users.find(u => u.role === 'employee')?.id || '');
  const [priority, setPriority] = useState<TaskPriority>('high');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Load signature requests for all tasks that have an associated document
  useEffect(() => {
    const fetchSignatures = async () => {
      const tasksWithDocs = tasks.filter((t) => t.documentId && (t.status === 'approved' || t.status === 'completed'));
      for (const t of tasksWithDocs) {
        if (t.documentId && !(t.id in signatureMap)) {
          const req = await dataRepository.getSignatureRequestForDocument(t.documentId);
          setSignatureMap((prev) => ({ ...prev, [t.id]: req }));
        }
      }
    };
    fetchSignatures();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  // Quick Client Creation Modal State
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newMatterTitle, setNewMatterTitle] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  const columns: { id: TaskStatus; label: string; color: string }[] = [
    { id: 'assigned', label: 'Assigned', color: isDark ? 'bg-slate-900 border-slate-800' : 'bg-[#EEF1F4] border-[#E2E7ED]' },
    { id: 'in_progress', label: 'In Progress', color: isDark ? 'bg-slate-900 border-slate-800' : 'bg-[#EEF1F4] border-[#E2E7ED]' },
    { id: 'draft_ready', label: 'Draft Ready', color: isDark ? 'bg-slate-900 border-slate-800' : 'bg-[#EEF1F4] border-[#E2E7ED]' },
    { id: 'under_review', label: 'Under Review', color: isDark ? 'bg-slate-900 border-slate-800' : 'bg-[#EEF1F4] border-[#E2E7ED]' },
    { id: 'approved', label: 'Approved', color: isDark ? 'bg-slate-900 border-slate-800' : 'bg-[#EEF1F4] border-[#E2E7ED]' },
    { id: 'completed', label: 'Completed', color: isDark ? 'bg-slate-900 border-slate-800' : 'bg-[#EEF1F4] border-[#E2E7ED]' }
  ];

  const handleQuickCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) {
      showToast('Client name is required', 'warning');
      return;
    }
    setIsCreatingClient(true);
    try {
      const email = newClientEmail.trim() || `${newClientName.toLowerCase().replace(/[^a-z0-9]/g, '')}@client.com`;
      const phone = newClientPhone.trim() || '+91 9800000000';
      const created = await createClient(newClientName.trim(), email, phone);
      if (created) {
        const mTitle = newMatterTitle.trim() || `${newClientName.trim()} - General Legal Retainer`;
        const mCode = `MAT-${Date.now().toString().slice(-4)}`;
        const createdMatter = await createMatter(created.id, mTitle, mCode);

        setClientId(created.id);
        if (createdMatter) {
          setMatterId(createdMatter.id);
        }
        setShowNewClientForm(false);
        setNewClientName('');
        setNewClientEmail('');
        setNewClientPhone('');
        setNewMatterTitle('');
        showToast(`Client "${created.name}" created and selected!`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to create client', 'error');
    } finally {
      setIsCreatingClient(false);
    }
  };

  const handleSendToClient = async (taskId: string, docId?: string) => {
    setSendingTaskId(taskId);
    try {
      await sendAgreementToClient(taskId, docId);
    } catch {
      // Toast already handled in context
    } finally {
      setSendingTaskId(null);
    }
  };

  const handleCreateTask = () => {
    if (!isBoss) {
      showToast('Task assignment is restricted to Senior Partners', 'warning');
      return;
    }
    if (!taskTitle.trim()) {
      showToast('Please enter a task title.', 'warning');
      return;
    }
    if (!templateId || !clientId || !matterId || !assigneeId) {
      showToast('Please select a template, client, matter, and assignee.', 'warning');
      return;
    }
    assignTask({
      title: taskTitle.trim(),
      templateId,
      clientId,
      matterId,
      assigneeId,
      priority,
      dueDate: new Date(dueDate).toISOString(),
      notes,
      documentId: null
    });
    setShowAssignModal(false);
    setTaskTitle('');
    setNotes('');
  };

  return (
    <div className="p-6 space-y-6 w-full animate-page-fade">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2E7ED] dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-450 font-bold">Firm Workflow</span>
            <span className="text-[10px] text-slate-350 dark:text-slate-550">• Status Columns</span>
          </div>
          <h1 className="text-4xl serif-display font-light italic text-ink-black dark:text-paper-white mt-1">
            Pipeline, <span className="font-normal font-sohne not-italic text-slate-400">Task Kanban Board</span>
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-505 font-light max-w-xl">
            Track document status transitions from assignment, drafting, to partner review and client delivery.
          </p>
        </div>

        {isBoss ? (
          <button
            onClick={() => setShowAssignModal(true)}
            className="btn-filled rounded-full text-xs flex items-center space-x-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Assign New Task</span>
          </button>
        ) : (
          <div className="px-4.5 py-2.5 bg-mist-gray dark:bg-slate-900 text-slate-500 rounded-full text-xs font-medium flex items-center space-x-2 border border-slate-200 dark:border-slate-800">
            <Lock className="w-3.5 h-3.5" />
            <span>Task creation restricted to Partners</span>
          </div>
        )}
      </div>

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 items-start">
        {columns.map((col) => {
          const columnTasks = tasks.filter(t => t.status === col.id);
          return (
            <div 
              key={col.id} 
              className={`rounded-[24px] border border-dashed p-4 min-h-[500px] flex flex-col space-y-4 ${col.color}`}
            >
              {/* Column Title */}
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-ink-black dark:text-white capitalize">{col.label}</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-full leading-none">
                  {columnTasks.length}
                </span>
              </div>

              {/* Tasks List */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[70vh] pr-1">
                {columnTasks.map((t) => {
                  const client = clients.find(c => c.id === t.clientId);
                  const isAssignedToMe = t.assigneeId === currentUser.id;
                  const canAdvance = isBoss || (isAssignedToMe && t.status !== 'under_review' && t.status !== 'approved' && t.status !== 'completed');
                  
                  return (
                    <div 
                      key={t.id}
                      className="floating-artifact p-4.5 space-y-3.5 hover:border-slate-350 dark:hover:border-slate-700 transition-all duration-200 group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${
                            t.priority === 'urgent' ? 'text-sienna-brown dark:text-blush-peach' : 'text-slate-400'
                          }`}>
                            {t.priority}
                          </span>
                          {t.documentId && <span title="Locked to Document"><Lock className="w-3 h-3 text-slate-450" /></span>}
                        </div>
                        <h4 className="text-xs font-semibold text-ink-black dark:text-paper-white leading-snug">
                          {t.title}
                        </h4>
                      </div>

                      <div className="space-y-1.5 text-[10px] text-slate-450 dark:text-slate-500 font-light leading-normal">
                        <div className="flex items-center space-x-1.5">
                          <Briefcase className="w-3 h-3 text-slate-400" />
                          <span>Client: <span className="font-normal text-slate-700 dark:text-slate-300">{client?.name || 'Unknown'}</span></span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>Lawyer: <span className="font-normal text-slate-700 dark:text-slate-300">{t.assigneeName}</span></span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span className="font-mono">Due: {t.dueDate}</span>
                        </div>
                      </div>

                      {/* Notes snippet */}
                      {t.notes && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal border-t border-slate-100 dark:border-slate-800 pt-2 font-light line-clamp-2">
                          {t.notes}
                        </p>
                      )}

                      {/* Client Approval Status Box */}
                      {t.latestClientApproval && (
                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2 text-[10px]">
                          <span className="text-slate-400 font-medium flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-slate-400" />
                            <span>Client Approval:</span>
                          </span>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] tracking-wide uppercase ${
                            t.latestClientApproval.status === 'ACCEPTED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : t.latestClientApproval.status === 'REJECTED'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          }`}>
                            {t.latestClientApproval.status}
                          </span>
                        </div>
                      )}

                      {/* Send to Client for Review Button (When Draft Ready) */}
                      {t.status === 'draft_ready' && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <button
                            onClick={() => handleSendToClient(t.id, t.documentId || undefined)}
                            disabled={sendingTaskId === t.id}
                            className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                          >
                            <Send className="w-3 h-3" />
                            <span>{sendingTaskId === t.id ? 'Sending PDF...' : 'Send to Client for Review'}</span>
                          </button>
                        </div>
                      )}

                      {/* Start Signing Process Button (Boss only, task with document) */}
                      {isBoss && t.documentId && (t.status === 'approved' || t.status === 'under_review' || t.status === 'draft_ready' || t.status === 'completed' || t.latestClientApproval?.status === 'ACCEPTED') && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          {(!signatureMap[t.id] || signatureMap[t.id]?.status === 'CANCELLED') ? (
                            <button
                              onClick={() => {
                                setSigningTaskId(t.id);
                                setSigningDocumentId(t.documentId || null);
                                setSigningDocumentTitle(t.title);
                                setSigningClientId(t.clientId);
                              }}
                              className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[11px] font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>✍️ Start Signing Process</span>
                            </button>
                          ) : (
                            <SignatureStatusBadge signatureRequest={signatureMap[t.id]} compact />
                          )}
                        </div>
                      )}


                      {/* Advance Button */}
                      {canAdvance && t.status !== 'completed' && t.status !== 'draft_ready' && (
                        <div className="flex justify-between items-center pt-1">
                          {isBoss && (
                            confirmDeleteTaskId === t.id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => setConfirmDeleteTaskId(null)} className="text-[9px] text-slate-500 hover:underline cursor-pointer">Cancel</button>
                                <button
                                  onClick={async () => { setConfirmDeleteTaskId(null); setDeletingTaskId(t.id); await deleteTask(t.id); setDeletingTaskId(null); }}
                                  disabled={deletingTaskId === t.id}
                                  className="px-2 py-0.5 bg-rose-600 text-white rounded text-[9px] font-semibold cursor-pointer"
                                >Delete</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteTaskId(t.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded cursor-pointer"
                                title="Delete Task"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )
                          )}
                          {!isBoss && <span />}
                          <button
                            onClick={() => {
                              const statusOrder: TaskStatus[] = ['assigned', 'in_progress', 'draft_ready', 'under_review', 'approved', 'completed'];
                              const currentIndex = statusOrder.indexOf(t.status);
                              if (currentIndex !== -1 && currentIndex < statusOrder.length - 1) {
                                updateTaskStatus(t.id, statusOrder[currentIndex + 1]);
                              }
                            }}
                            className="p-1 rounded-full bg-mist-gray hover:bg-ink-black hover:text-white dark:bg-slate-900 dark:hover:bg-paper-white dark:hover:text-ink-black text-slate-500 transition-colors cursor-pointer"
                            title="Move to Next State"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Signature Config Modal */}
      {signingTaskId && signingDocumentId && (
        <SignatureConfigModal
          taskId={signingTaskId}
          documentId={signingDocumentId}
          documentTitle={signingDocumentTitle}
          users={users}
          client={clients.find((c) => c.id === signingClientId) || null}
          onClose={() => { setSigningTaskId(null); setSigningDocumentId(null); }}
          onSuccess={() => {
            // Refresh signature status for this task
            if (signingDocumentId && signingTaskId) {
              const tid = signingTaskId;
              const did = signingDocumentId;
              dataRepository.getSignatureRequestForDocument(did).then((req) => {
                setSignatureMap((prev) => ({ ...prev, [tid]: req }));
              });
            }
          }}
          showToast={showToast}
        />
      )}

      {/* Assign Task Modal */}
      {showAssignModal && isBoss && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md border border-slate-150 dark:border-slate-850 rounded-[24px] bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-semibold serif-heading text-ink-black dark:text-paper-white">
                Assign Document Task
              </h3>
              <button 
                onClick={() => setShowAssignModal(false)} 
                className="text-slate-400 hover:text-ink-black dark:hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Task Title</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Draft TechCorp Service Agreement"
                  className="w-full input-composer"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Legal Template</label>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="w-full input-composer text-xs py-2"
                >
                  {templates.filter(t => t.status === 'active').map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Client</label>
                  <button
                    type="button"
                    onClick={() => setShowNewClientForm(!showNewClientForm)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{showNewClientForm ? 'Select Existing' : 'Add New Client'}</span>
                  </button>
                </div>

                {showNewClientForm ? (
                  <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 space-y-2.5 animate-fadeIn">
                    <div className="text-[11px] font-semibold text-blue-900 dark:text-blue-300">
                      Quick Add Client & Retainer Matter
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Client Full Name / Entity *"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        className="w-full input-composer text-xs py-1.5"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="email"
                        placeholder="Contact Email (Optional)"
                        value={newClientEmail}
                        onChange={(e) => setNewClientEmail(e.target.value)}
                        className="w-full input-composer text-xs py-1.5"
                      />
                      <input
                        type="tel"
                        placeholder="Contact Phone (Optional)"
                        value={newClientPhone}
                        onChange={(e) => setNewClientPhone(e.target.value)}
                        className="w-full input-composer text-xs py-1.5"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Initial Matter Title (e.g. Corporate Lease Diligence)"
                        value={newMatterTitle}
                        onChange={(e) => setNewMatterTitle(e.target.value)}
                        className="w-full input-composer text-xs py-1.5"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowNewClientForm(false)}
                        className="px-3 py-1 rounded-full text-xs font-medium text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleQuickCreateClient}
                        disabled={isCreatingClient}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {isCreatingClient ? 'Creating...' : 'Save & Select Client'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    value={clientId}
                    onChange={(e) => {
                      const cId = e.target.value;
                      setClientId(cId);
                      const matching = matters.filter(m => m.clientId === cId && m.status === 'active');
                      setMatterId(matching[0]?.id || '');
                    }}
                    className="w-full input-composer text-xs py-2"
                  >
                    <option value="">-- Choose Client --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {!showNewClientForm && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Select Matter</label>
                  <select
                    value={matterId}
                    onChange={(e) => setMatterId(e.target.value)}
                    className="w-full input-composer text-xs py-2"
                  >
                    <option value="">-- Choose Matter --</option>
                    {matters.filter(m => m.clientId === clientId && m.status === 'active').map(m => (
                      <option key={m.id} value={m.id}>{m.title} ({m.matterCode})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Associate Lawyer</label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full input-composer text-xs py-2"
                  >
                    {users.filter(u => u.role === 'employee').map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.title})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full input-composer text-xs py-2 capitalize"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full input-composer text-xs py-2"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Additional Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter notes/requirements..."
                  className="w-full input-composer text-xs h-16 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => setShowAssignModal(false)}
                className="btn-ghost text-xs rounded-full flex-1 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                className="btn-filled text-xs rounded-full flex-1 cursor-pointer"
              >
                Assign Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
