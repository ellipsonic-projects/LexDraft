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
    <div className="p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border shadow-lg transition-colors ${
        isDark
          ? 'bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border-blue-800/30'
          : 'bg-gradient-to-r from-blue-900/10 via-white to-blue-900/5 border-blue-200/80'
      }`}>
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-900/10 text-blue-900 dark:text-blue-400 border border-blue-800/30 uppercase tracking-wider flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Partner Command Dashboard</span>
            </span>
            <span className="text-xs text-slate-500 font-medium">• Live Firm Overview</span>
          </div>
          <h1 className={`text-2xl font-extrabold mt-2 tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Welcome back, <span className="text-blue-900 dark:text-blue-400">Adv. Rajesh Varma (Senior Partner)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            You have <strong className="text-blue-900 dark:text-blue-400">{pendingReviews.length} documents awaiting review</strong> and <strong className="text-indigo-600 dark:text-indigo-400">{pendingCustomizationsCount} template customization requests</strong>.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => setActiveTab('template_studio')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-2 ${
              pendingCustomizationsCount > 0
                ? 'bg-blue-900 text-white border-blue-900 shadow-md animate-pulse'
                : isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <Wand2 className="w-4 h-4 text-blue-400" />
            <span>Template Checker & Updater ({pendingCustomizationsCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('workflow')}
            className="px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-900/20 transition-all flex items-center space-x-2"
          >
            <Kanban className="w-4 h-4 stroke-[2.5]" />
            <span>Live Kanban Board</span>
          </button>
        </div>
      </div>

      {expiringDocs.length > 0 && (
        <div className={`p-5 rounded-2xl border ${
          isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
        } space-y-3`}>
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-amber-500 animate-pulse" />
            <h2 className="text-sm font-extrabold uppercase tracking-wide">Active Agreements Expiring Soon ({expiringDocs.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expiringDocs.map(doc => {
              const client = clients.find(c => c.id === doc.clientId);
              const diffTime = new Date(doc.expiryDate!).getTime() - new Date().getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return (
                <div key={doc.id} className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                  isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div>
                    <p className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{doc.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Client: {client?.name || 'Unknown'} • Expires: <span className="text-amber-500 font-bold">{doc.expiryDate}</span> ({diffDays} days left)
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      renewDocument(doc.id);
                      setActiveTab('documents');
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-xl text-[11px] shadow-sm shrink-0 flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Renew</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI Metric Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className={`p-4 rounded-2xl border transition-all shadow-xs ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Total Documents</span>
            <FileText className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          </div>
          <p className={`text-2xl font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{documents.length}</p>
          <div className="flex items-center space-x-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
            <TrendingUp className="w-3 h-3" />
            <span>+18% this month</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border transition-all shadow-xs ${
          isDark ? 'bg-slate-900 border-blue-800/30' : 'bg-blue-50/60 border-blue-200/80'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-900 dark:text-blue-400">Pending Reviews</span>
            <AlertCircle className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-extrabold text-blue-900 dark:text-blue-400">{pendingReviews.length}</p>
          <p className="text-[10px] text-slate-500 mt-1">Requires partner sign-off</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-all shadow-xs ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Active Lawyers</span>
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className={`text-2xl font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{activeEmployees.length}</p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">All online & drafting</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-all shadow-xs ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Master Templates</span>
            <Wand2 className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          </div>
          <p className={`text-2xl font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{templates.length}</p>
          <p className="text-[10px] text-slate-500 mt-1">Reused 170+ times</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-all shadow-xs ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Customizations</span>
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className={`text-2xl font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{pendingCustomizationsCount}</p>
          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-1">Pending approval</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-all shadow-xs ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Approval Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className={`text-2xl font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>94.2%</p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">First-pass accuracy</p>
        </div>
      </div>

      {/* Main Grid: Pending Reviews & Live Kanban Updates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Pending Reviews Table */}
          <div className={`rounded-2xl border p-6 shadow-xl space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-base font-extrabold flex items-center space-x-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  <AlertCircle className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <span>Pending Documents Under Review ({pendingReviews.length})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Documents submitted by associate lawyers requiring partner sign-off & seal</p>
              </div>
              <button
                onClick={() => setActiveTab('documents')}
                className="text-xs text-blue-800 dark:text-blue-400 font-bold hover:underline flex items-center space-x-1"
              >
                <span>Open Document Vault</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {pendingReviews.length === 0 ? (
              <div className={`p-8 text-center rounded-xl border ${
                isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>All pending reviews cleared!</p>
                <p className="text-[11px] text-slate-500">Your lawyers will submit new drafts when ready.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingReviews.map((doc) => {
                  const template = templates.find(t => t.id === doc.templateId);
                  const isStale = template ? doc.templateVersionAtGeneration !== template.version : false;
                  return (
                    <div
                      key={doc.id}
                      className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                        isDark
                          ? 'bg-slate-950/70 border-slate-800 hover:border-blue-700/40'
                          : 'bg-slate-50/80 border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{doc.title}</span>
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded capitalize">
                            {doc.priority} Case Urgency
                          </span>
                          {isStale && (
                            <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded animate-pulse" title={`Master template version is now v${template?.version}`}>
                              Outdated Template
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          Client: <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>{clients.find(c => c.id === doc.clientId)?.name || 'Unknown Client'}</strong> • Lawyer: <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{doc.authorName}</span>
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedDocumentId(doc.id);
                          setActiveTab('documents');
                        }}
                        className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-900/20 transition-all flex items-center space-x-1.5 shrink-0"
                      >
                        <span>Review & Approve</span>
                        <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Kanban Live Updates Feed reflected on Partner Dashboard */}
          <div className={`rounded-2xl border p-6 shadow-xl space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-base font-extrabold flex items-center space-x-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  <Kanban className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Kanban Live Updates & Case Status Tracker</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Real-time task movement updates reflected from lawyer Kanban pipelines</p>
              </div>
              <button
                onClick={() => setActiveTab('workflow')}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                View Full Kanban
              </button>
            </div>

            <div className="space-y-3">
              {recentKanbanUpdates.map((t) => (
                <div key={t.id} className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{t.title}</span>
                      <span className="px-2 py-0.5 text-[9px] font-bold bg-blue-900/10 text-blue-900 dark:text-blue-400 border border-blue-800/20 rounded capitalize">
                        {t.priority} Urgency
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      Client: <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>{clients.find(c => c.id === t.clientId)?.name || 'Unknown Client'}</strong> • Assigned Lawyer: <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{t.assigneeName}</span>
                    </p>
                  </div>

                  <span className={`px-3 py-1 rounded-lg text-xs font-extrabold uppercase border ${
                    t.status === 'approved'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                      : t.status === 'under_review'
                      ? 'bg-blue-900/10 text-blue-900 dark:text-blue-400 border-blue-800/30'
                      : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30'
                  }`}>
                    {t.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Workload & Activity Feed */}
        <div className="space-y-6">
          <div className={`rounded-2xl border p-6 shadow-xl space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <h2 className={`text-base font-bold flex items-center space-x-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>How Employees Are Working</span>
              </h2>
              <span className="text-xs text-slate-500">{activeEmployees.length} Associate Lawyers</span>
            </div>

            <div className="space-y-3">
              {activeEmployees.map((emp) => (
                <div key={emp.id} className={`p-3.5 rounded-xl border space-y-2 ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="relative">
                        <img src={emp.avatar} alt={emp.name} className="w-8 h-8 rounded-full object-cover" />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950" />
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{emp.name}</p>
                        <p className="text-[10px] text-slate-500">{emp.title}</p>
                      </div>
                    </div>

                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold capitalize">
                      Active Drafting
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Weekly Output & Efficiency</span>
                      <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>12 Documents</span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                      <div className="bg-blue-800 h-full rounded-full w-[82%]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl border p-6 shadow-xl space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h2 className={`text-base font-bold flex items-center space-x-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              <Activity className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <span>Real-Time Activity & Audit Logs</span>
            </h2>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {activityLogs.slice(0, 5).map((log) => (
                <div key={log.id} className={`p-3 rounded-xl border text-xs space-y-1 ${
                  isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between text-slate-500">
                    <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{log.userName}</span>
                    <span className="text-[10px] font-mono">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-blue-800 dark:text-blue-400 font-bold">{log.action}: <span className={`font-normal ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{log.entityName}</span></p>
                  <p className="text-[11px] text-slate-500 leading-tight">{log.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
