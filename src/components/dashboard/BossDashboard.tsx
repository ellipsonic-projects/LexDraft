import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  Clock,
  Users,
  Wand2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
  Activity,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Kanban,
  RefreshCw
} from 'lucide-react';

export const BossDashboard: React.FC = () => {
  const {
    documents,
    templates,
    tasks,
    users,
    activityLogs,
    setActiveTab,
    setSelectedDocumentId,
    theme,
    clients,
    renewDocument
  } = useApp();

  const isDark = theme === 'dark';
  const expiringDocs = documents.filter(d => {
    if (d.status !== 'approved' || !d.expiryDate) return false;
    const diffTime = new Date(d.expiryDate).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  });
  const pendingReviews = documents.filter(d => d.status === 'under_review');
  const activeEmployees = users.filter(u => u.role === 'employee');

  const pendingCustomizationsCount = templates.reduce((acc, t) => {
    return acc + (t.pendingCustomizations?.filter(c => c.status === 'pending').length || 0);
  }, 0);

  const recentKanbanUpdates = tasks.slice(0, 4);

  const weeklyData = [
    { day: 'Mon', count: 8 },
    { day: 'Tue', count: 14 },
    { day: 'Wed', count: 11 },
    { day: 'Thu', count: 19 },
    { day: 'Fri', count: 22 },
    { day: 'Sat', count: 6 },
    { day: 'Sun', count: 4 }
  ];

  const maxWeeklyCount = Math.max(...weeklyData.map(d => d.count));

  return (
    <div className="p-6 space-y-6 w-full animate-page-fade">
      {/* Editorial Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2E7ED] dark:border-slate-800 pb-5">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-450 font-bold">Partner command portal</span>
            <span className="text-[10px] text-slate-350 dark:text-slate-550">• Real-time Firm Insights</span>
          </div>
          <h1 className="text-4xl serif-display font-light italic text-ink-black dark:text-paper-white mt-1">
            Rajesh Varma, <span className="font-normal font-sohne not-italic text-slate-400">Senior Managing Partner</span>
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-light max-w-xl">
            Currently overseeing <span className="font-medium text-ink-black dark:text-white">{pendingReviews.length} pending document reviews</span> and <span className="font-medium text-ink-black dark:text-white">{pendingCustomizationsCount} customization requests</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('template_studio')}
            className={`btn-ghost rounded-full text-xs transition-all flex items-center space-x-1.5 cursor-pointer ${
              pendingCustomizationsCount > 0 ? 'bg-blush-peach dark:bg-sienna-brown border-transparent text-sienna-brown dark:text-blush-peach' : ''
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Templates Checker ({pendingCustomizationsCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('workflow')}
            className="btn-filled rounded-full text-xs flex items-center space-x-1.5 cursor-pointer"
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Workflow Kanban</span>
          </button>
        </div>
      </div>

      {/* Accent Peach Card for Expiring Agreements (Treat as single chromatic accent per page) */}
      {expiringDocs.length > 0 && (
        <div className="card-accent space-y-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-sienna-brown dark:text-blush-peach" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-sienna-brown dark:text-blush-peach">
              Agreements Expiring Soon ({expiringDocs.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expiringDocs.map(doc => {
              const client = clients.find(c => c.id === doc.clientId);
              const diffTime = new Date(doc.expiryDate!).getTime() - new Date().getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return (
                <div 
                  key={doc.id} 
                  className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xs p-4 rounded-2xl border border-sienna-brown/10 dark:border-blush-peach/10 flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-sienna-brown dark:text-blush-peach">{doc.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Client: {client?.name || 'Unknown'} • Expires in <span className="font-semibold text-sienna-brown dark:text-blush-peach">{diffDays} days</span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      renewDocument(doc.id);
                      setActiveTab('documents');
                    }}
                    className="px-3.5 py-1.5 bg-ink-black dark:bg-paper-white text-paper-white dark:text-ink-black rounded-full text-[10px] font-medium transition-transform active:scale-95 flex items-center space-x-1 shrink-0"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Renew</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Vault Documents', val: documents.length, desc: '+18% this month', icon: FileText, color: 'text-indigo-650' },
          { label: 'Pending Reviews', val: pendingReviews.length, desc: 'Requires signature', icon: AlertCircle, color: 'text-rose-650', highlight: true },
          { label: 'Active Associate Lawyers', val: activeEmployees.length, desc: 'All online', icon: Users, color: 'text-slate-500' },
          { label: 'Legal Templates', val: templates.length, desc: 'Reused 170+ times', icon: Wand2, color: 'text-slate-500' },
          { label: 'Customization Requests', val: pendingCustomizationsCount, desc: 'Pending checker approval', icon: Sparkles, color: 'text-slate-500' },
          { label: 'Sign-off Approval Rate', val: '94.2%', desc: 'First-pass velocity', icon: TrendingUp, color: 'text-emerald-650' }
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div 
              key={idx} 
              className={`p-5 rounded-2xl border transition-all duration-200 shadow-[0_4px_20px_rgba(15,23,42,0.06)] hover:shadow-[0_8px_30px_rgba(15,23,42,0.09)] ${
                kpi.highlight 
                  ? 'bg-[#EEF4FA] border-[#E2E7ED] dark:bg-slate-900 dark:border-slate-800' 
                  : 'bg-white border-[#E2E7ED] dark:bg-slate-900/40 dark:border-slate-900/60'
              }`}
            >
              <div className="flex items-center justify-between text-slate-400 mb-3">
                <span className="text-[10px] font-medium uppercase tracking-wider">{kpi.label}</span>
                <Icon className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-2xl font-bold text-ink-black dark:text-white leading-none">{kpi.val}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-light">{kpi.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Pending Reviews & Live Updates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-8">
          {/* Pending Reviews floating artifact */}
          <div className="floating-artifact space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-lg serif-heading font-normal text-ink-black dark:text-paper-white flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-slate-400" />
                  <span>Awaiting Sign-off & Review ({pendingReviews.length})</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-1 font-light">Draft agreements prepared by associates requiring your formal review</p>
              </div>
              <button
                onClick={() => setActiveTab('documents')}
                className="text-[11px] text-slate-500 hover:text-ink-black dark:hover:text-white font-medium flex items-center space-x-1"
              >
                <span>View Vault</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {pendingReviews.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-mist-gray dark:bg-slate-900/30">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">All reviews cleared</p>
                <p className="text-[10px] text-slate-400 mt-1 font-light">You are fully up to date.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {pendingReviews.map((doc) => {
                  const template = templates.find(t => t.id === doc.templateId);
                  const isStale = template ? doc.templateVersionAtGeneration !== template.version : false;
                  return (
                    <div
                      key={doc.id}
                      className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="text-xs font-semibold text-ink-black dark:text-paper-white">{doc.title}</span>
                          <span className="px-2 py-0.5 text-[9px] font-medium bg-mist-gray dark:bg-slate-800 text-slate-500 rounded-full capitalize">
                            {doc.priority}
                          </span>
                          {isStale && (
                            <span className="px-2 py-0.5 text-[9px] bg-blush-peach dark:bg-sienna-brown text-sienna-brown dark:text-blush-peach rounded-full">
                              Outdated Version
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-light">
                          Client: <span className="font-normal text-slate-600 dark:text-slate-300">{clients.find(c => c.id === doc.clientId)?.name || 'Unknown'}</span> • Associate: <span className="font-normal text-slate-600 dark:text-slate-300">{doc.authorName}</span>
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedDocumentId(doc.id);
                          setActiveTab('documents');
                        }}
                        className="px-4 py-2 bg-ink-black hover:opacity-90 dark:bg-paper-white text-paper-white dark:text-ink-black rounded-full text-xs font-medium transition-transform active:scale-95 shrink-0 flex items-center space-x-1"
                      >
                        <span>Review</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Kanban Updates floating artifact */}
          <div className="floating-artifact space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-lg serif-heading font-normal text-ink-black dark:text-paper-white flex items-center space-x-2">
                  <Kanban className="w-4 h-4 text-slate-400" />
                  <span>Pipeline Live Tracker</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-1 font-light">Recent task transitions across employee workflow lanes</p>
              </div>
              <button
                onClick={() => setActiveTab('workflow')}
                className="text-[11px] text-slate-500 hover:text-ink-black dark:hover:text-white font-medium"
              >
                Workflow Kanban
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentKanbanUpdates.map((t) => {
                const isCompleted = t.status === 'completed' || t.status === 'approved';
                return (
                  <div key={t.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="text-xs font-semibold text-ink-black dark:text-paper-white">{t.title}</span>
                        <span className="px-2 py-0.5 text-[9px] font-medium bg-mist-gray dark:bg-slate-800 text-slate-500 rounded-full capitalize">
                          {t.priority}
                        </span>
                        {isCompleted && (
                          <span className="px-2 py-0.5 text-[9px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-full">
                            FINAL SIGNED AGREEMENT
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-light">
                        Matter: <span className="font-normal text-slate-650 dark:text-slate-300">{t.title}</span> • Assigned: <span className="font-normal text-slate-650 dark:text-slate-300">{t.assigneeName}</span>
                      </p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        isCompleted
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : t.status === 'under_review'
                          ? 'bg-blush-peach text-sienna-brown border border-sienna-brown/10'
                          : 'bg-mist-gray text-slate-500 border border-slate-200'
                      }`}>
                        {isCompleted ? 'COMPLETED' : t.status.replace('_', ' ')}
                      </span>

                      {isCompleted && t.documentId && (
                        <button
                          onClick={() => {
                            if (setSelectedDocumentId) setSelectedDocumentId(t.documentId);
                            setActiveTab('documents');
                          }}
                          className="px-3 py-1 bg-ink-black dark:bg-paper-white text-paper-white dark:text-ink-black text-[10px] font-semibold rounded-lg hover:opacity-90 transition-opacity"
                        >
                          View Completed
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Workload Neutral Card */}
          <div className="card-neutral space-y-6">
            <div className="flex items-end justify-between">
              <h2 className="text-base font-semibold text-ink-black dark:text-paper-white flex items-center space-x-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span>Team Directory</span>
              </h2>
              <span className="text-[11px] text-slate-400 font-light">{activeEmployees.length} Associates</span>
            </div>

            <div className="space-y-4">
              {activeEmployees.map((emp) => (
                <div key={emp.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <img src={emp.avatar} alt={emp.name} className="w-8 h-8 rounded-full object-cover" />
                      <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-mist-gray dark:ring-slate-900" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-ink-black dark:text-paper-white">{emp.name}</p>
                      <p className="text-[10px] text-slate-405 font-light">{emp.title}</p>
                    </div>
                  </div>

                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-medium uppercase tracking-wider">
                    Online
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity feed neutral card */}
          <div className="card-neutral space-y-6">
            <h2 className="text-base font-semibold text-ink-black dark:text-paper-white flex items-center space-x-2">
              <Activity className="w-4 h-4 text-slate-400" />
              <span>Real-Time Audits</span>
            </h2>

            <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
              {activityLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="font-semibold text-[11px]">{log.userName}</span>
                    <span className="text-[9px] font-mono font-light">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="font-medium text-slate-700 dark:text-slate-300 leading-tight">
                    {log.action} <span className="font-light italic">{log.entityName}</span>
                  </p>
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 font-light">{log.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
