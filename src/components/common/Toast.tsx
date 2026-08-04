import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, Info, AlertTriangle, AlertCircle } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast } = useApp();

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    info: <Info className="w-4 h-4 text-amber-400 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
  };

  const borders = {
    success: 'border-emerald-500/40 bg-slate-900/95 text-slate-100',
    info: 'border-amber-500/40 bg-slate-900/95 text-slate-100',
    warning: 'border-amber-500/40 bg-slate-900/95 text-slate-100',
    error: 'border-rose-500/40 bg-slate-900/95 text-slate-100'
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
      <div className={`px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md flex items-center space-x-3 text-xs font-semibold max-w-md ${borders[toast.type]}`}>
        {icons[toast.type]}
        <span>{toast.message}</span>
      </div>
    </div>
  );
};
