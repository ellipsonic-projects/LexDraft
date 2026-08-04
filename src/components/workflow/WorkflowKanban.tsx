import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Kanban,
  Plus,
  ChevronRight,
  X,
  Lock
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
    theme,
    showToast
  } = useApp();

  const isBoss = currentUser.role === 'boss';
  const isDark = theme === 'dark';
  const [showAssignModal, setShowAssignModal] = useState(false);

  const [templateId, setTemplateId] = useState(templates[0]?.id || '');
  const [clientName, setClientName] = useState('');
  const [assigneeId, setAssigneeId] = useState(users.find(u => u.role === 'employee')?.id || '');
  const [priority, setPriority] = useState<TaskPriority>('high');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const columns: { id: TaskStatus; label: string; color: string }[] = [
    { id: 'assigned', label: 'Assigned', color: isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-100/60' },
    { id: 'in_progress', label: 'In Progress', color: isDark ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-indigo-200 bg-indigo-50/50' },
    { id: 'draft_ready', label: 'Draft Ready', color: isDark ? 'border-blue-800/30 bg-blue-900/5' : 'border-blue-200 bg-blue-50/50' },
    { id: 'under_review', label: 'Under Review', color: isDark ? 'border-blue-800/40 bg-blue-900/10' : 'border-blue-300 bg-blue-100/50' },
    { id: 'approved', label: 'Approved', color: isDark ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50/50' },
    { id: 'completed', label: 'Completed', color: isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-white' }
  ];

  const handleCreateTask = () => {
    if (!isBoss) {
      showToast('Task assignment is restricted to Senior Partners', 'warning');
      return;
    }
    if (!templateId || !clientName || !assigneeId) return;
    assignTask({
      templateId,
      clientName,
      assigneeId,
      priority,
      dueDate,
      notes
    });
    setShowAssignModal(false);
    setClientName('');
    setNotes('');
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-200">
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border shadow-lg transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-900/10 text-blue-900 dark:text-blue-400 border border-blue-800/30 uppercase tracking-wider flex items-center space-x-1">
              <Kanban className="w-3.5 h-3.5" />
              <span>Firm Workflow Pipeline</span>
            </span>
          </div>
          <h1 className={`text-2xl font-extrabold mt-2 tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Document Assignment & Review Kanban
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Track document drafting lifecycle from assignment, drafting, partner review to final execution.
          </p>
        </div>

        {/* Assign Task Button - Restricted to Boss */}
        {isBoss ? (
          <button
            onClick={() => setShowAssignModal(true)}
            className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-900/20 transition-all flex items-center space-x-2 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Assign New Task</span>
          </button>
        ) : (
          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border border-slate-200 dark:border-slate-700">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Partner Task Assignment Only</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div
              key={col.id}
              className={`rounded-2xl border p-4 flex flex-col justify-between min-h-[65vh] space-y-4 ${col.color}`}
            >
              <div className={`flex items-center justify-between border-b pb-2.5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{col.label}</span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                  isDark ? 'bg-slate-950 text-blue-400 border-slate-800' : 'bg-white text-blue-900 border-slate-200 shadow-xs'
                }`}>
                  {colTasks.length}
                </span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto">
                {colTasks.map((t) => (
                  <div
                    key={t.id}
                    className={`p-3.5 rounded-xl border transition-all space-y-2 shadow-md group ${
                      isDark ? 'bg-slate-900 border-slate-800 hover:border-blue-800/40' : 'bg-white border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                        t.priority === 'urgent' ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20' : 'bg-blue-900/10 text-blue-900 dark:text-blue-400 border border-blue-800/20'
                      }`}>
                        {t.priority}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{t.dueDate}</span>
                    </div>

                    <div>
                      <h4 className={`text-xs font-bold transition-colors ${
                        isDark ? 'text-slate-200 group-hover:text-blue-400' : 'text-slate-900 group-hover:text-blue-900'
                      }`}>
                        {t.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Client: {t.clientName}</p>
                    </div>

                    <div className={`flex items-center justify-between pt-2 border-t text-[10px] ${
                      isDark ? 'border-slate-800' : 'border-slate-100'
                    }`}>
                      <span className="text-slate-500">{t.assigneeName}</span>

                      {col.id !== 'completed' && (
                        <button
                          onClick={() => {
                            const statuses: TaskStatus[] = ['assigned', 'in_progress', 'draft_ready', 'under_review', 'approved', 'completed'];
                            const idx = statuses.indexOf(t.status);
                            if (idx < statuses.length - 1) {
                              updateTaskStatus(t.id, statuses[idx + 1]);
                            }
                          }}
                          className={`p-1 rounded transition-colors ${
                            isDark ? 'bg-slate-800 text-slate-400 hover:bg-blue-900 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-blue-900 hover:text-white'
                          }`}
                          title="Advance Status"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showAssignModal && isBoss && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-lg border rounded-2xl shadow-2xl p-6 space-y-5 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className={`text-base font-bold flex items-center space-x-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                <Plus className="w-5 h-5 text-blue-900" />
                <span>Assign New Document Task</span>
              </h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Select Template</label>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none mt-1 ${
                    isDark ? 'bg-slate-950 text-slate-200 border-slate-800' : 'bg-slate-50 text-slate-800 border-slate-200'
                  }`}
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Client / Party Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Acme Corp Merger"
                  className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none mt-1 font-semibold ${
                    isDark ? 'bg-slate-950 text-slate-200 border-slate-800' : 'bg-slate-50 text-slate-800 border-slate-200'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Assign Associate Lawyer</label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none mt-1 ${
                      isDark ? 'bg-slate-950 text-slate-200 border-slate-800' : 'bg-slate-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    {users.filter(u => u.role === 'employee').map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.title})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Priority Level</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none mt-1 capitalize ${
                      isDark ? 'bg-slate-950 text-slate-200 border-slate-800' : 'bg-slate-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={handleCreateTask}
              className="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-900/20 transition-all"
            >
              Create Assignment Task
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
