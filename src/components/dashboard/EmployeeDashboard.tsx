import React, { useState } from 'react';
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
    approveDocument,
    rejectDocument,
    markDocumentDelivered,
    theme,
    clients,
    setSelectedTaskId,
    setSelectedTemplateId
  } = useApp();

  const isDark = theme === 'dark';
  const isBoss = currentUser.role === 'boss';

  const [activeKpi, setActiveKpi] = useState<'draft' | 'under_review' | 'approved'>('draft');

  // Partner sees all firm items, lawyers see only their own assigned items
  const myTasks = isBoss 
    ? tasks.filter(t => t.status !== 'completed') 
    : tasks.filter(t => t.assigneeId === currentUser.id);

  const myDraftDocs = isBoss 
    ? documents.filter(d => d.status === 'draft') 
    : documents.filter(d => d.authorId === currentUser.id && d.status === 'draft');

  const myUnderReviewDocs = isBoss 
    ? documents.filter(d => d.status === 'under_review') 
    : documents.filter(d => d.authorId === currentUser.id && d.status === 'under_review');

  const myApprovedDocs = isBoss 
    ? documents.filter(d => d.status === 'approved') 
    : documents.filter(d => d.authorId === currentUser.id && d.status === 'approved');

  const myExpiringDocs = myApprovedDocs.filter(d => {
    if (!d.expiryDate) return false;
    const diffTime = new Date(d.expiryDate).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  });

  const getUrgencyBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-blush-peach text-sienna-brown border border-sienna-brown/10 uppercase flex items-center space-x-1"><AlertTriangle className="w-2.5 h-2.5" /><span>URGENT</span></span>;
      case 'high':
        return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-mist-gray dark:bg-slate-800 text-slate-500 uppercase">HIGH</span>;
      case 'medium':
        return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-mist-gray dark:bg-slate-800 text-slate-500 uppercase">MEDIUM</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-mist-gray dark:bg-slate-800 text-slate-400 uppercase">LOW</span>;
    }
  };

  const displayedDocs = activeKpi === 'draft' 
    ? myDraftDocs 
    : activeKpi === 'under_review' 
      ? myUnderReviewDocs 
      : myApprovedDocs;

  return (
    <div className="p-6 space-y-6 w-full animate-page-fade">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2E7ED] dark:border-slate-800 pb-5">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-450 font-bold">
              {isBoss ? 'Partner Workbench' : 'Lawyer Workbench'}
            </span>
            <span className="text-[10px] text-slate-350 dark:text-slate-550">• Workspace Tracker</span>
          </div>
          <h1 className="text-4xl serif-display font-light italic text-ink-black dark:text-paper-white mt-1">
            {currentUser.name}, <span className="font-normal font-sohne not-italic text-slate-400">{currentUser.title || (isBoss ? 'Senior Partner' : 'Associate Lawyer')}</span>
          </h1>
          <p className="text-xs text-slate-405 dark:text-slate-500 font-light max-w-xl">
            {isBoss ? (
              <>Currently overseeing <span className="font-medium text-ink-black dark:text-white">{myTasks.length} active cases</span> firm-wide.</>
            ) : (
              <>Currently working on <span className="font-medium text-ink-black dark:text-white">{myTasks.filter(t => t.status !== 'completed').length} active assigned cases</span>. Use our templates to draft legal agreements.</>
            )}
          </p>
        </div>

        <button
          onClick={() => setActiveTab('document_generator')}
          className="btn-filled rounded-full text-xs flex items-center space-x-1.5 cursor-pointer shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>New AI Document</span>
        </button>
      </div>

      {myExpiringDocs.length > 0 && (
        <div className="card-accent space-y-2">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-sienna-brown dark:text-blush-peach" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-sienna-brown dark:text-blush-peach">
              Agreements Expiring Soon ({myExpiringDocs.length})
            </h2>
          </div>
          <p className="text-[11px] font-light leading-normal">
            {isBoss ? (
              <>Renew final agreements directly from the Vault or click the renew buttons below: {myExpiringDocs.map(d => `"${d.title}"`).join(', ')}.</>
            ) : (
              <>Please contact Rajesh Varma (Senior Partner) to authorize renewal cloning for: {myExpiringDocs.map(d => `"${d.title}"`).join(', ')}.</>
            )}
          </p>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { id: 'assigned', label: 'Assigned Cases', val: myTasks.length, desc: isBoss ? 'Firm-wide active tasks' : 'Pending partner review', icon: Clock },
          { id: 'draft', label: 'Active Drafts', val: myDraftDocs.length, desc: isBoss ? 'All drafts in progress' : 'Auto-saved versions', icon: FileText },
          { id: 'under_review', label: 'Under Review', val: myUnderReviewDocs.length, desc: isBoss ? 'Awaiting your approval' : 'Submitted to Partner', icon: AlertCircle },
          { id: 'approved', label: 'Approved & Sealed', val: myApprovedDocs.length, desc: isBoss ? 'Approved documents' : 'Ready for delivery', icon: CheckCircle2 }
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          const isActive = (kpi.id === 'assigned' && activeKpi === 'draft') || (kpi.id === activeKpi);
          return (
            <div 
              key={idx} 
              onClick={() => {
                if (kpi.id !== 'assigned') {
                  setActiveKpi(kpi.id as any);
                } else {
                  setActiveKpi('draft');
                }
              }}
              className={`p-5 bg-white dark:bg-slate-900 rounded-2xl border shadow-[0_4px_20px_rgba(15,23,42,0.06)] hover:shadow-[0_8px_30px_rgba(15,23,42,0.09)] transition-all duration-200 cursor-pointer ${
                isActive 
                  ? 'border-sienna-brown dark:border-blush-peach ring-2 ring-sienna-brown/10 dark:ring-blush-peach/10 bg-slate-50/10 dark:bg-slate-950/10' 
                  : 'border-[#E2E7ED] dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-slate-400 mb-3">
                <span className="text-[10px] font-medium uppercase tracking-wider">{kpi.label}</span>
                <Icon className="w-3.5 h-3.5 text-slate-405" />
              </div>
              <p className="text-2xl font-bold text-ink-black dark:text-white leading-none">{kpi.val}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-505 mt-2 font-light">{kpi.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Cases & Urgency Requirements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Assigned Cases & Urgency */}
        <div className="floating-artifact space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-lg serif-heading font-normal text-ink-black dark:text-paper-white flex items-center space-x-2">
                <Briefcase className="w-4 h-4 text-slate-400" />
                <span>
                  {isBoss ? `Firm-wide Assigned Cases (${myTasks.length})` : `Assigned Cases & Instructions (${myTasks.length})`}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-1 font-light">
                {isBoss ? 'Active case files allocated to legal associates' : 'Agreements assigned to you for drafting by Rajesh Varma'}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('workflow')}
              className="text-[11px] text-slate-500 hover:text-ink-black dark:hover:text-white font-medium"
            >
              Kanban
            </button>
          </div>

          <div className="space-y-4">
            {myTasks.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-mist-gray dark:bg-slate-900/30 text-slate-400 text-xs font-light">
                No pending assigned cases.
              </div>
            ) : (
              myTasks.map((t) => (
                <div key={t.id} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-mist-gray/30 dark:bg-slate-900/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink-black dark:text-paper-white">{t.title}</span>
                    {getUrgencyBadge(t.priority)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-450 dark:text-slate-400">
                    <div>Client: <strong className="font-medium text-slate-600 dark:text-slate-300">{clients.find(c => c.id === t.clientId)?.name || 'Unknown'}</strong></div>
                    <div>Target Due Date: <span className="font-mono">{t.dueDate}</span></div>
                    {isBoss && (
                      <div className="col-span-2">Assignee: <span className="font-medium text-slate-600 dark:text-slate-300">{t.assigneeName}</span></div>
                    )}
                  </div>

                  {t.requirements && (
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 text-[11px] space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Instructions</span>
                      <p className="text-slate-605 dark:text-slate-400 font-light leading-normal">{t.requirements}</p>
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
                          if (t.templateId === 'tpl_house_rental') {
                            setActiveTab('house_rental_wizard');
                          } else {
                            setActiveTab('document_generator');
                          }
                        }
                      }}
                      className="px-3.5 py-1.5 bg-ink-black hover:opacity-90 dark:bg-paper-white text-paper-white dark:text-ink-black rounded-full text-[11px] font-medium transition-transform active:scale-95 flex items-center space-x-1"
                    >
                      <span>{t.documentId ? 'Open in Vault' : 'Draft Document'}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Draft Documents */}
        <div className="floating-artifact space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-lg serif-heading font-normal text-ink-black dark:text-paper-white flex items-center space-x-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span>
                  {activeKpi === 'draft' && `Active Draft Documents (${myDraftDocs.length})`}
                  {activeKpi === 'under_review' && `Documents Under Review (${myUnderReviewDocs.length})`}
                  {activeKpi === 'approved' && `Approved & Sealed Documents (${myApprovedDocs.length})`}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-1 font-light">
                {activeKpi === 'draft' && 'Drafts saved in your workspace awaiting review submission'}
                {activeKpi === 'under_review' && 'Agreements awaiting feedback or partner signature'}
                {activeKpi === 'approved' && 'Final approved documents ready for client delivery'}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('documents')}
              className="text-[11px] text-slate-500 hover:text-ink-black dark:hover:text-white font-medium"
            >
              Open Vault
            </button>
          </div>

          <div className="space-y-4">
            {displayedDocs.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-mist-gray dark:bg-slate-900/30">
                <FileCheck2 className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {activeKpi === 'draft' && 'No active drafts in workspace'}
                  {activeKpi === 'under_review' && 'No documents under review'}
                  {activeKpi === 'approved' && 'No approved documents'}
                </p>
                {activeKpi === 'draft' && (
                  <button
                    onClick={() => setActiveTab('document_generator')}
                    className="mt-3 btn-filled text-[11px]"
                  >
                    Generate Document
                  </button>
                )}
              </div>
            ) : (
              displayedDocs.map((doc) => (
                <div key={doc.id} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-mist-gray/30 dark:bg-slate-900/30 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-ink-black dark:text-paper-white">{doc.title}</p>
                    <p className="text-[10px] text-slate-450 dark:text-slate-500">
                      Version: <span className="font-medium text-slate-600 dark:text-slate-300">v{doc.currentVersion}</span> • Client: {clients.find(c => c.id === doc.clientId)?.name || 'Unknown'}
                      {isBoss && ` • Author: ${doc.authorName}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedDocumentId(doc.id);
                        setActiveTab('documents');
                      }}
                      className="px-3 py-1.5 border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-semibold rounded-full"
                    >
                      Open
                    </button>
                    {activeKpi === 'draft' && !isBoss && (
                      <button
                        onClick={() => submitDocumentForReview(doc.id)}
                        className="px-3 py-1.5 bg-ink-black dark:bg-paper-white text-paper-white dark:text-ink-black text-[10px] font-semibold rounded-full transition-transform active:scale-95"
                      >
                        Submit Review
                      </button>
                    )}
                    {activeKpi === 'under_review' && isBoss && (
                      <>
                        <button
                          onClick={() => approveDocument(doc.id)}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-semibold rounded-full transition-transform active:scale-95"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => rejectDocument(doc.id)}
                          className="px-3 py-1.5 bg-rose-650 hover:bg-rose-700 text-white text-[10px] font-semibold rounded-full transition-transform active:scale-95"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {activeKpi === 'approved' && isBoss && (
                      <button
                        onClick={() => markDocumentDelivered(doc.id)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-semibold rounded-full transition-transform active:scale-95"
                      >
                        Deliver
                      </button>
                    )}
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

