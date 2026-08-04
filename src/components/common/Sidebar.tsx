import React from 'react';
import { useApp, NavTab } from '../../context/AppContext';
import {
  LayoutDashboard,
  FileText,
  Wand2,
  Kanban,
  History,
  BarChart3,
  Settings,
  PlusCircle,
  Briefcase
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { currentUser, activeTab, setActiveTab, templates, documents, tasks, theme } = useApp();

  const isBoss = currentUser.role === 'boss';
  const isDark = theme === 'dark';

  const pendingCustomizationsCount = templates.reduce((acc, t) => {
    return acc + (t.pendingCustomizations?.filter(c => c.status === 'pending').length || 0);
  }, 0);

  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }>; badge?: number; bossOnly?: boolean }[] = [
    {
      id: 'boss_dashboard',
      label: 'Partner Dashboard',
      icon: LayoutDashboard,
      bossOnly: true
    },
    {
      id: 'employee_dashboard',
      label: 'Lawyer Workbench',
      icon: Briefcase
    },
    {
      id: 'document_generator',
      label: 'Document Generator',
      icon: PlusCircle
    },
    {
      id: 'documents',
      label: 'Document Vault & Editor',
      icon: FileText,
      badge: documents.length
    },
    {
      id: 'workflow',
      label: 'Workflow Kanban',
      icon: Kanban,
      badge: tasks.filter(t => t.status !== 'completed').length
    },
    {
      id: 'template_studio',
      label: isBoss ? 'Template Checker & Updater' : 'Template Studio & Customization',
      icon: Wand2,
      badge: isBoss && pendingCustomizationsCount > 0 ? pendingCustomizationsCount : undefined
    },
    {
      id: 'activity',
      label: 'Activity & Audit Logs',
      icon: History
    },
    {
      id: 'analytics',
      label: 'Firm Analytics',
      icon: BarChart3,
      bossOnly: true
    },
    {
      id: 'settings',
      label: 'Settings & Team',
      icon: Settings
    }
  ];

  return (
    <aside className={`w-64 border-r flex flex-col justify-between shrink-0 select-none min-h-[calc(100vh-4rem)] transition-colors ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
    }`}>
      <div className="p-3.5 space-y-6">
        {/* Quick Launch Generator Button */}
        <button
          onClick={() => setActiveTab('document_generator')}
          className="w-full bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-md shadow-blue-900/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <PlusCircle className="w-4 h-4 text-white stroke-[2.5]" />
          <span>New AI Document</span>
        </button>

        {/* Primary Navigation */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            {isBoss ? 'Senior Partner Menu' : 'Associate Lawyer Menu'}
          </p>

          {navItems
            .filter(item => !item.bossOnly || isBoss)
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-150 ${
                    isActive
                      ? isDark
                        ? 'bg-blue-900/20 text-blue-400 border border-blue-800/40 font-bold'
                        : 'bg-blue-50 text-blue-900 border border-blue-200 font-bold shadow-xs'
                      : isDark
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-700 dark:text-blue-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                        isActive
                          ? 'bg-blue-900 text-white'
                          : isDark
                          ? 'bg-slate-800 text-slate-400 border border-slate-700'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      </div>

      {/* Role Permissions Card */}
      <div className={`p-3.5 m-3 border rounded-2xl ${
        isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Active Workspace</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
            isBoss ? 'bg-blue-900/10 text-blue-800 dark:text-blue-400 border border-blue-800/20' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
          }`}>
            {isBoss ? 'Partner' : 'Lawyer'}
          </span>
        </div>
        <p className="text-[10px] text-slate-500 leading-tight">
          {isBoss
            ? 'Partner: Template Checker & Updater, Task Assignments, Partner Sign-off & Analytics.'
            : 'Lawyer: Case Urgency, Document Generator, Combined Vault & Editor, Customization Requests.'}
        </p>
      </div>
    </aside>
  );
};
