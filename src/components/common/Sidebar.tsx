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
  const {
    currentUser,
    activeTab,
    setActiveTab,
    templates,
    documents,
    tasks,
    theme,
    setSelectedTaskId,
    setSelectedTemplateId
  } = useApp();

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
      id: 'lawyer_workbench',
      label: 'Lawyer Workbench',
      icon: Briefcase,
      bossOnly: true,
      badge: tasks.filter(t => t.status !== 'completed').length || undefined
    },
    {
      id: 'employee_dashboard',
      label: 'My Workbench',
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
    <aside className={`w-64 border-r flex flex-col justify-between shrink-0 select-none min-h-[calc(100vh-4rem)] transition-all ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#E2E7ED] shadow-[1px_0_10px_0_rgba(15,23,42,0.02)]'
    }`}>
      <div className="p-4 space-y-6">
        {/* Quick Launch Generator Button - Steep lozenge pill-shape style */}
        <button
          onClick={() => {
            setSelectedTaskId(null);
            setSelectedTemplateId(null);
            setActiveTab('document_generator');
          }}
          className="w-full bg-ink-black hover:opacity-90 dark:bg-paper-white text-paper-white dark:text-ink-black font-semibold text-xs py-2.5 px-4 rounded-full flex items-center justify-center space-x-2 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-sm"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>New AI Document</span>
        </button>

        {/* Primary Navigation */}
        <div className="space-y-1">
          <p className="px-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">
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
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition-all duration-150 cursor-pointer ${
                    isActive
                      ? isDark
                        ? 'bg-slate-950 text-paper-white border border-slate-800 font-semibold shadow-[0_2px_8px_0_rgba(0,0,0,0.3)]'
                        : 'bg-[#EEF4FA] text-[#172033] border border-[#E2E7ED] font-semibold'
                      : isDark
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                      : 'text-slate-650 hover:text-[#172033] hover:bg-[#EEF4FA]/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-ink-black dark:text-white' : 'text-slate-450'}`} />
                    <span className="font-sohne">{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-2 py-0.5 text-[9px] font-semibold rounded-full leading-none ${
                        isActive
                          ? 'bg-ink-black text-paper-white dark:bg-paper-white dark:text-ink-black'
                          : isDark
                          ? 'bg-slate-900 text-slate-400 border border-slate-800'
                          : 'bg-mist-gray text-slate-500 border border-slate-200'
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

      {/* Role Permissions Card - styled as Card Neutral */}
      <div className={`p-4 m-4 border-0 rounded-2xl bg-mist-gray dark:bg-slate-900`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Workspace Mode</span>
          <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-blush-peach text-sienna-brown dark:bg-sienna-brown dark:text-blush-peach">
            {isBoss ? 'Partner' : 'Lawyer'}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal font-light">
          {isBoss
            ? 'Access to assignment pipelines, reviewer dashboard, and template updates.'
            : 'Access to document workbench, customization requests, and templates.'}
        </p>
      </div>
    </aside>
  );
};
