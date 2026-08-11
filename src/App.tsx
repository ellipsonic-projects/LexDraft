import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LandingPage } from './components/auth/LandingPage';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { CommandPalette } from './components/common/CommandPalette';
import { Toast } from './components/common/Toast';
import { BossDashboard } from './components/dashboard/BossDashboard';
import { EmployeeDashboard } from './components/dashboard/EmployeeDashboard';
import { TemplateStudio } from './components/templates/TemplateStudio';
import { DocumentGenerator } from './components/generation/DocumentGenerator';
import { DocumentsList } from './components/documents/DocumentsList';
import { LegalDocumentEditor } from './components/editor/LegalDocumentEditor';
import { WorkflowKanban } from './components/workflow/WorkflowKanban';
import { ActivityLogView } from './components/activity/ActivityLogView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SettingsView } from './components/settings/SettingsView';
import { HouseRentalWizard } from './components/agreements/HouseRentalWizard';

const MainContent: React.FC = () => {
  const { activeTab, theme, currentUser } = useApp();
  const isDark = theme === 'dark';

  const renderView = () => {
    const isBoss = currentUser.role === 'boss';

    switch (activeTab) {
      case 'boss_dashboard':
        return isBoss ? <BossDashboard /> : <EmployeeDashboard />;
      case 'employee_dashboard':
        return <EmployeeDashboard />;
      case 'template_studio':
        return <TemplateStudio />;
      case 'document_generator':
        return <DocumentGenerator />;
      case 'house_rental_wizard':
        return <HouseRentalWizard />;
      case 'documents':
        return <DocumentsList />;
      case 'document_editor':
        return <LegalDocumentEditor />;
      case 'workflow':
        return <WorkflowKanban />;
      case 'activity':
        return <ActivityLogView />;
      case 'analytics':
        return isBoss ? (
          <AnalyticsView />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-3">
            <div className="px-3 py-1 bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[10px] font-bold rounded uppercase">Access Denied</div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Senior Partner Authorization Required</h2>
            <p className="text-xs text-slate-500 max-w-sm text-center">Analytics reports and metric insights are restricted to Partners.</p>
          </div>
        );
      case 'settings':
        return isBoss ? (
          <SettingsView />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-3">
            <div className="px-3 py-1 bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[10px] font-bold rounded uppercase">Access Denied</div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Senior Partner Authorization Required</h2>
            <p className="text-xs text-slate-500 max-w-sm text-center">System and tenant configurations are restricted to Partners.</p>
          </div>
        );
      default:
        return isBoss ? <BossDashboard /> : <EmployeeDashboard />;
    }
  };

  return (
    <div className={`flex-1 overflow-y-auto transition-colors ${
      isDark ? 'bg-[#0a0b0d] text-slate-100' : 'bg-[#F4F6F8] text-ink-black'
    }`}>
      {renderView()}
    </div>
  );
};

const AppShellContent: React.FC = () => {
  const { isAuthenticated, theme } = useApp();
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col selection:bg-blue-900/30 selection:text-blue-900 transition-colors ${
      isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {!isAuthenticated ? (
        <LandingPage />
      ) : (
        <>
          <Header />
          <div className="flex-1 flex overflow-hidden">
            <Sidebar />
            <MainContent />
          </div>
          <CommandPalette />
          <Toast />
        </>
      )}
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <AppShellContent />
    </AppProvider>
  );
}

export default App;
