import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { History, Search } from 'lucide-react';

export const ActivityLogView: React.FC = () => {
  const { activityLogs, theme, currentUser } = useApp();
  const isDark = theme === 'dark';
  const [filterQuery, setFilterQuery] = useState('');

  const ownLogs = activityLogs.filter(l =>
    currentUser.role === 'boss' ? true : l.userId === currentUser.id
  );

  const filteredLogs = ownLogs.filter(l =>
    l.userName.toLowerCase().includes(filterQuery.toLowerCase()) ||
    l.action.toLowerCase().includes(filterQuery.toLowerCase()) ||
    l.entityName.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 w-full animate-page-fade">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2E7ED] dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-450 font-bold">Audit History</span>
            <span className="text-[10px] text-slate-355 dark:text-slate-550">• Workspace Logs</span>
          </div>
          <h1 className="text-4xl serif-display font-light italic text-ink-black dark:text-paper-white mt-1">
            Logs, <span className="font-normal font-sohne not-italic text-slate-400">Firm Activity Trails</span>
          </h1>
          <p className="text-xs text-slate-450 dark:text-slate-500 font-light max-w-xl">
            Granular event logs recording document creation, variable modifications, reviews, and version updates.
          </p>
        </div>

        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Filter logs..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full input-composer text-xs pl-9 pr-3 py-2.5"
          />
        </div>
      </div>

      {/* Logs Catalog */}
      <div className="floating-artifact p-6 space-y-4">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredLogs.map((log) => (
            <div key={log.id} className="py-4.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start justify-between gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="font-semibold text-ink-black dark:text-paper-white">{log.userName}</span>
                  <span className="px-2 py-0.5 text-[9px] font-semibold bg-mist-gray dark:bg-slate-800 text-slate-550 rounded-full uppercase tracking-wider">
                    {log.userRole}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="font-semibold text-sienna-brown dark:text-blush-peach">{log.action}</span>
                </div>
                <p className="font-medium text-slate-700 dark:text-slate-300 italic">{log.entityName}</p>
                <p className="text-slate-405 dark:text-slate-500 leading-relaxed font-light">{log.details}</p>
              </div>

              <span className="text-[10px] font-mono text-slate-400 shrink-0 font-light pt-0.5">
                {new Date(log.timestamp).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
