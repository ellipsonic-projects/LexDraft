import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Briefcase,
  Trash2,
  ArrowUpRight,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { TaskPriority } from '../../types';

export const LawyerWorkbench: React.FC = () => {
  const {
    tasks,
    users,
    clients,
    theme,
    deleteTask,
    setSelectedDocumentId,
    setSelectedTaskId,
    setSelectedTemplateId,
    setActiveTab,
    currentUser
  } = useApp();

  const isDark = theme === 'dark';
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedLawyers, setExpandedLawyers] = useState<Set<string>>(new Set());

  const lawyers = users.filter(u => u.role === 'employee');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'in_progress': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'draft_ready': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'under_review': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'approved': return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
      case 'completed': return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-200';
    }
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blush-peach text-sienna-brown border border-sienna-brown/10 uppercase flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /><span>URGENT</span></span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 uppercase">HIGH</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-mist-gray dark:bg-slate-800 text-slate-500 uppercase">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-mist-gray dark:bg-slate-800 text-slate-400 uppercase">LOW</span>;
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirmDeleteId !== taskId) {
      setConfirmDeleteId(taskId);
      return;
    }
    setDeletingId(taskId);
    setConfirmDeleteId(null);
    try {
      await deleteTask(taskId);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleLawyer = (lawyerId: string) => {
    setExpandedLawyers(prev => {
      const next = new Set(prev);
      if (next.has(lawyerId)) next.delete(lawyerId);
      else next.add(lawyerId);
      return next;
    });
  };

  const totalActive = tasks.filter(t => t.status !== 'completed').length;

  return (
    <div className="p-6 space-y-6 w-full animate-page-fade">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2E7ED] dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-450 font-bold">Partner Control</span>
            <span className="text-[10px] text-slate-350 dark:text-slate-550">• Lawyer Assignment Dashboard</span>
          </div>
          <h1 className="text-4xl serif-display font-light italic text-ink-black dark:text-paper-white mt-1">
            Lawyer <span className="font-normal font-sohne not-italic text-slate-400">Workbench</span>
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-light max-w-xl">
            Overview of all <span className="font-medium text-ink-black dark:text-white">{totalActive} active tasks</span> assigned across {lawyers.length} associate lawyers. Partners can delete tasks from here.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('workflow')}
          className="btn-filled rounded-full text-xs flex items-center space-x-1.5 cursor-pointer shrink-0"
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>View Kanban</span>
        </button>
      </div>

      {/* All Tasks Summary */}
      {tasks.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-mist-gray dark:bg-slate-900/30">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No tasks assigned yet</p>
          <p className="text-xs text-slate-400 mt-1 font-light">Use the Workflow Kanban to assign cases to lawyers.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {lawyers.map(lawyer => {
            const lawyerTasks = tasks.filter(t => t.assigneeId === lawyer.id);
            if (lawyerTasks.length === 0) return null;

            const isExpanded = expandedLawyers.has(lawyer.id);
            const activeTasks = lawyerTasks.filter(t => t.status !== 'completed');
            const completedTasks = lawyerTasks.filter(t => t.status === 'completed');

            return (
              <div key={lawyer.id} className="floating-artifact space-y-0 overflow-hidden">
                {/* Lawyer Header */}
                <button
                  onClick={() => toggleLawyer(lawyer.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <img src={lawyer.avatar} alt={lawyer.name} className="w-9 h-9 rounded-full object-cover" />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-ink-black dark:text-paper-white">{lawyer.name}</p>
                      <p className="text-[10px] text-slate-400 font-light">{lawyer.title}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold text-[10px]">
                        {activeTasks.length} Active
                      </span>
                      {completedTasks.length > 0 && (
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold text-[10px]">
                          {completedTasks.length} Completed
                        </span>
                      )}
                    </div>
                    {isExpanded
                      ? <ChevronDown className="w-4 h-4 text-slate-400" />
                      : <ChevronRight className="w-4 h-4 text-slate-400" />
                    }
                  </div>
                </button>

                {/* Tasks List - collapsed by default, expanded on click */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                    {lawyerTasks.map(task => {
                      const client = clients.find(c => c.id === task.clientId);
                      const isDeleting = deletingId === task.id;
                      const isConfirming = confirmDeleteId === task.id;

                      return (
                        <div key={task.id} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <div className="space-y-2 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-semibold text-ink-black dark:text-paper-white truncate">{task.title}</p>
                              {getPriorityBadge(task.priority)}
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider border ${getStatusColor(task.status)}`}>
                                {task.status.replace(/_/g, ' ')}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 text-[10px] text-slate-450 dark:text-slate-500">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span>{client?.name || 'Unknown Client'}</span>
                              </span>
                              <span className="flex items-center gap-1 font-mono">
                                <Calendar className="w-3 h-3" />
                                <span>Due: {task.dueDate}</span>
                              </span>
                              {task.documentId && (
                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                  <Clock className="w-3 h-3" />
                                  <span>Document linked</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Open Task */}
                            <button
                              onClick={() => {
                                if (task.documentId) {
                                  setSelectedDocumentId(task.documentId);
                                  setActiveTab('documents');
                                } else {
                                  setSelectedTaskId(task.id);
                                  setSelectedTemplateId(task.templateId);
                                  setActiveTab('workflow');
                                }
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-ink-black dark:hover:text-white transition-colors"
                              title="Open Task"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Task */}
                            {isConfirming ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 text-[10px] text-slate-500 hover:text-ink-black dark:hover:text-white font-medium rounded cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  disabled={isDeleting}
                                  className="px-2.5 py-1 text-[10px] bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold cursor-pointer disabled:opacity-50 transition-colors"
                                >
                                  {isDeleting ? '...' : 'Confirm Delete'}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                disabled={isDeleting}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors disabled:opacity-50 cursor-pointer"
                                title="Delete Task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
