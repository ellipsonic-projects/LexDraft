import React from 'react';
import { useApp } from '../../context/AppContext';
import { BarChart3, TrendingUp, Award, Zap } from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { templates, users, theme } = useApp();
  const isDark = theme === 'dark';
  const activeLawyers = users.filter(u => u.role === 'employee');

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-200">
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border shadow-lg transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-900/10 text-blue-900 dark:text-blue-400 border border-blue-800/30 uppercase tracking-wider flex items-center space-x-1">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Firm Efficiency & Productivity Analytics</span>
            </span>
          </div>
          <h1 className={`text-2xl font-extrabold mt-2 tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Law Firm Operational Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Track document preparation velocity, template reuse rates, turnaround benchmarks, and lawyer performance metrics.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className={`p-5 rounded-2xl border space-y-1 shadow-xs ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <span className="text-xs font-semibold text-slate-500">Avg Drafting Speed</span>
          <p className="text-3xl font-extrabold text-blue-900 dark:text-blue-400">4.2 mins</p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
            <TrendingUp className="w-3 h-3" />
            <span>72% faster than manual word docs</span>
          </p>
        </div>

        <div className={`p-5 rounded-2xl border space-y-1 shadow-xs ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <span className="text-xs font-semibold text-slate-500">Template Reuse Rate</span>
          <p className={`text-3xl font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>96.8%</p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Zero duplicate agreement work</p>
        </div>

        <div className={`p-5 rounded-2xl border space-y-1 shadow-xs ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <span className="text-xs font-semibold text-slate-500">First Pass Approval Rate</span>
          <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">94.2%</p>
          <p className="text-[10px] text-slate-500">Minimal revision cycles</p>
        </div>

        <div className={`p-5 rounded-2xl border space-y-1 shadow-xs ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <span className="text-xs font-semibold text-slate-500">Hours Saved This Month</span>
          <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">184 hrs</p>
          <p className="text-[10px] text-indigo-600 dark:text-indigo-300 font-semibold">Firm billable time preserved</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className={`rounded-2xl border p-6 shadow-xl space-y-4 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h3 className={`text-base font-bold flex items-center space-x-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            <Award className="w-4 h-4 text-blue-900 dark:text-blue-400" />
            <span>Top Performing Legal Templates</span>
          </h3>

          <div className="space-y-3">
            {templates.map((tpl) => (
              <div key={tpl.id} className={`p-3.5 rounded-xl border space-y-2 ${
                isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between items-center text-xs">
                  <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{tpl.name}</span>
                  <span className="font-mono text-blue-900 dark:text-blue-400 font-bold">{tpl.usageCount} uses</span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                  <div
                    style={{ width: `${Math.min((tpl.usageCount / 100) * 100, 100)}%` }}
                    className="bg-gradient-to-r from-blue-900 to-indigo-600 h-full rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-2xl border p-6 shadow-xl space-y-4 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h3 className={`text-base font-bold flex items-center space-x-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Associate Lawyer Output & Speed</span>
          </h3>

          <div className="space-y-3">
            {activeLawyers.map((lawyer) => (
              <div key={lawyer.id} className={`p-4 rounded-xl border space-y-2 text-xs ${
                isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <img src={lawyer.avatar} alt={lawyer.name} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <p className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{lawyer.name}</p>
                      <p className="text-[10px] text-slate-500">{lawyer.title}</p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold rounded-lg border border-emerald-500/30">
                    High Efficiency
                  </span>
                </div>

                <div className={`grid grid-cols-2 gap-2 pt-2 border-t text-[11px] text-slate-500 ${
                  isDark ? 'border-slate-800' : 'border-slate-200'
                }`}>
                  <div>Drafts Completed: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>14</strong></div>
                  <div>Avg Turnaround: <strong className="text-blue-900 dark:text-blue-400">3.8 mins</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
