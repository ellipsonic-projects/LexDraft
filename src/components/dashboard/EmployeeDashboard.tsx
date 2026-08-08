import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Sparkles,
  Briefcase,
  AlertTriangle,
  FileCheck2
} from 'lucide-react';
import { TaskPriority } from '../../types';

export const EmployeeDashboard: React.FC = () => {
  const {
    currentUser,
    documents,
    tasks,
    setActiveTab,
    setSelectedDocumentId,
    submitDocumentForReview,
    theme,
    clients,
    setSelectedTaskId,
    setSelectedTemplateId
  } = useApp();

  const isDark = theme === 'dark';
  const myTasks = tasks.filter(t => t.assigneeId === currentUser.id);
  const myDraftDocs = documents.filter(d => d.authorId === currentUser.id && d.status === 'draft');
  const myUnderReviewDocs = documents.filter(d => d.authorId === currentUser.id && d.status === 'under_review');
  const myApprovedDocs = documents.filter(d => d.authorId === currentUser.id && d.status === 'approved');
  const myExpiringDocs = myApprovedDocs.filter(d => {
    if (!d.expiryDate) return false;
    const diffTime = new Date(d.expiryDate).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  });

  const getUrgencyBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/30 uppercase flex items-center space-x-1"><AlertTriangle className="w-3 h-3" /><span>URGENT CASE</span></span>;
      case 'high':
        return <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-900/10 text-blue-900 dark:text-blue-400 border border-blue-800/30 uppercase">HIGH URGENCY</span>;
      case 'medium':
        return <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/30 uppercase">MEDIUM URGENCY</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 border border-slate-200 dark:border-slate-700 uppercase">LOW URGENCY</span>;
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border shadow-lg transition-colors ${
        isDark
          ? 'bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border-blue-800/30'
          : 'bg-gradient-to-r from-blue-900/10 via-white to-blue-900/5 border-blue-200/80'
      }`}>
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-900/10 text-blue-900 dark:text-blue-400 border border-blue-800/20 uppercase tracking-wider flex items-center space-x-1">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Lawyer Workbench</span>
            </span>
            <span className="text-xs text-slate-500 font-medium">• Case Urgency & Requirements Tracker</span>
          </div>
          <h1 className={`text-2xl font-extrabold mt-2 tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Welcome back, <span className="text-blue-900 dark:text-blue-400">{currentUser.name}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            You have <strong className="text-blue-800 dark:text-blue-300">{myTasks.filter(t => t.status !== 'completed').length} active assigned cases</strong>. Use our step-by-step document generator to compile legal agreements.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('document_generator')}
          className="px-5 py-3 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-900/20 transition-all flex items-center space-x-2 shrink-0"
        >
          <Sparkles className="w-4 h-4 stroke-[2.5]" />
          <span>Generate Document From Template</span>
        </button>
      </div>

      {myExpiringDocs.length > 0 && (
        <div className={`p-4 rounded-xl border flex items-center space-x-3 text-xs ${
          isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <p className="font-bold">You have expiring agreements requiring renewal attention ({myExpiringDocs.length})</p>
            <p className="text-[11px] mt-0.5 text-slate-500">
              Please contact Rajesh Varma (Senior Partner) to authorize renewal cloning for: {myExpiringDocs.map(d => `"${d.title}"`).join(', ')}.
            </p>
          </div>
        </div>
      )}

      {/* KPI Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border transition-all shadow-xs ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Assigned Cases</span>
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className={`text-2xl font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{myTasks.length}</p>
          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1">Pending partner review</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-all shadow-xs ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Active Drafts</span>
            <FileText className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          </div>
          <p className={`text-2xl font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{myDraftDocs.length}</p>
          <p className="text-[10px] text-slate-500 mt-1">Auto-saved versions</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-all shadow-xs ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Under Review</span>
            <AlertCircle className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          </div>
          <p className={`text-2xl font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{myUnderReviewDocs.length}</p>
          <p className="text-[10px] text-blue-700 dark:text-blue-400 font-semibold mt-1">Submitted to Partner</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-all shadow-xs ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Approved & Sealed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className={`text-2xl font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{myApprovedDocs.length}</p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">Ready for client execution</p>
        </div>
      </div>

      {/* Main Grid: Cases & Urgency Requirements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Assigned Cases & Urgency */}
        <div className={`rounded-2xl border p-6 shadow-xl space-y-4 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-base font-extrabold flex items-center space-x-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Assigned Cases & Requirement Urgency ({myTasks.length})</span>
            </h2>
            <button
              onClick={() => setActiveTab('workflow')}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              View Kanban Board
            </button>
          </div>

          <div className="space-y-4">
            {myTasks.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">No pending assigned cases!</div>
            ) : (
              myTasks.map((t) => (
                <div key={t.id} className={`p-4 rounded-xl border space-y-3 ${
                  isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{t.title}</span>
                    {getUrgencyBadge(t.priority)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <div>Client: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{clients.find(c => c.id === t.clientId)?.name || 'Unknown Client'}</strong></div>
                    <div>Target Due Date: <span className="text-blue-900 dark:text-blue-400 font-mono font-bold">{t.dueDate}</span></div>
                  </div>

                  {t.requirements && (
                    <div className={`p-3 rounded-xl border space-y-1 text-xs ${
                      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Partner Instructions & Requirements</span>
                      <p className="text-slate-700 dark:text-slate-300 leading-snug">{t.requirements}</p>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => {
                        if (t.documentId) {
                          setSelectedDocumentId(t.documentId);
                          setActiveTab('documents');
                        } else {
                          setSelectedTaskId(t.id);
                          setSelectedTemplateId(t.templateId);
                          setActiveTab('document_generator');
                        }
                      }}
                      className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5"
                    >
                      <span>{t.documentId ? 'Open in Vault & Editor' : 'Start Document Draft'}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* My Draft Documents */}
        <div className={`rounded-2xl border p-6 shadow-xl space-y-4 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-base font-bold flex items-center space-x-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              <FileText className="w-4 h-4 text-blue-800 dark:text-blue-400" />
              <span>Active Draft Documents in Progress</span>
            </h2>
            <button
              onClick={() => setActiveTab('documents')}
              className="text-xs text-blue-800 dark:text-blue-400 font-bold hover:underline"
            >
              Open Combined Vault & Editor
            </button>
          </div>

          <div className="space-y-3">
            {myDraftDocs.length === 0 ? (
              <div className={`p-8 text-center rounded-xl border ${
                isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <FileCheck2 className="w-8 h-8 text-blue-800 mx-auto mb-2" />
                <p className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>No unsubmitted active drafts</p>
                <button
                  onClick={() => setActiveTab('document_generator')}
                  className="mt-3 px-3.5 py-2 bg-blue-900 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Generate Document Now
                </button>
              </div>
            ) : (
              myDraftDocs.map((doc) => (
                <div key={doc.id} className={`p-4 rounded-xl border flex items-center justify-between ${
                  isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="space-y-1">
                    <p className={`text-xs font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{doc.title}</p>
                    <p className="text-[11px] text-slate-500">
                      Version: <span className="text-blue-800 dark:text-blue-400 font-mono font-bold">v{doc.currentVersion}</span> • Client: {clients.find(c => c.id === doc.clientId)?.name || 'Unknown Client'}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedDocumentId(doc.id);
                        setActiveTab('documents');
                      }}
                      className={`px-3 py-1.5 border font-semibold text-xs rounded-xl ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      Open Editor
                    </button>
                    <button
                      onClick={() => submitDocumentForReview(doc.id)}
                      className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs"
                    >
                      Submit for Partner Review
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
