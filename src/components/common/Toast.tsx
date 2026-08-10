import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, Info, AlertTriangle, AlertCircle } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast } = useApp();

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
    info: <Info className="w-4 h-4 text-slate-500 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-sienna-brown dark:text-blush-peach shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-page-fade">
      <div className="px-4 py-3 rounded-full border border-slate-150 dark:border-slate-850 bg-white dark:bg-slate-900 text-ink-black dark:text-white shadow-xl flex items-center space-x-3 text-xs font-semibold max-w-md">
        {icons[toast.type]}
        <span>{toast.message}</span>
      </div>
    </div>
  );
};
