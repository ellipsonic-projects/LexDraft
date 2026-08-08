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
    <div className="p-8 space-y-8 max-w-6xl mx-auto animate-in fade-in duration-200">
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border shadow-lg transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-900/10 text-blue-900 dark:text-blue-400 border border-blue-800/30 uppercase tracking-wider flex items-center space-x-1">
              <History className="w-3.5 h-3.5" />
              <span>Firm Audit & Security Trail</span>
            </span>
          </div>
          <h1 className={`text-2xl font-extrabold mt-2 tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Activity Log & Document History
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Granular event logs recording every document creation, variable edit, partner approval, and version restoration.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filter audit logs..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className={`w-full text-xs rounded-lg pl-9 pr-3 py-2 border focus:outline-none ${
              isDark ? 'bg-slate-950 text-slate-200 border-slate-800 focus:border-blue-800/50' : 'bg-slate-50 text-slate-800 border-slate-200 focus:border-blue-800'
            }`}
          />
        </div>
      </div>

      <div className={`rounded-2xl border p-6 shadow-xl space-y-4 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <div key={log.id} className={`p-4 rounded-xl border flex items-start justify-between text-xs space-x-4 ${
              isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{log.userName}</span>
                  <span className="px-2 py-0.5 text-[9px] font-bold bg-blue-900/10 text-blue-900 dark:text-blue-400 border border-blue-800/20 rounded capitalize">
                    {log.userRole}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{log.action}</span>
                </div>
                <p className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{log.entityName}</p>
                <p className="text-slate-500 text-[11px] leading-relaxed">{log.details}</p>
              </div>

              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                {new Date(log.timestamp).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
