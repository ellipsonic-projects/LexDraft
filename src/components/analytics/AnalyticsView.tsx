import React from 'react';
import { useApp } from '../../context/AppContext';
import { BarChart3, TrendingUp, Award, Zap } from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { templates, users, theme } = useApp();
  const isDark = theme === 'dark';
  const activeLawyers = users.filter(u => u.role === 'employee');

  return (
    <div className="p-6 space-y-6 w-full animate-page-fade">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2E7ED] dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-450 font-bold">Firm Performance</span>
            <span className="text-[10px] text-slate-355 dark:text-slate-550">• Turnaround Benchmarks</span>
          </div>
          <h1 className="text-4xl serif-display font-light italic text-ink-black dark:text-paper-white mt-1">
            Analytics, <span className="font-normal font-sohne not-italic text-slate-400">Firm Operational Insights</span>
          </h1>
          <p className="text-xs text-slate-450 dark:text-slate-500 font-light max-w-xl">
            Track document preparation velocity, template reuse rates, turnaround benchmarks, and lawyer performance metrics.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Avg Drafting Speed', val: '4.2 mins', desc: '72% faster than manual word docs', trend: true },
          { label: 'Template Reuse Rate', val: '96.8%', desc: 'Zero duplicate agreement work', trend: false },
          { label: 'First Pass Approval Rate', val: '94.2%', desc: 'Minimal revision cycles', trend: false },
          { label: 'Hours Saved This Month', val: '184 hrs', desc: 'Firm billable time preserved', trend: false }
        ].map((kpi, idx) => (
          <div 
            key={idx} 
            className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-[#E2E7ED] dark:border-slate-850 shadow-[0_4px_20px_rgba(15,23,42,0.06)] hover:shadow-[0_8px_30px_rgba(15,23,42,0.09)] transition-all duration-200"
          >
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-3">
              {kpi.label}
            </div>
            <p className="text-2.5xl font-bold text-ink-black dark:text-white leading-none">{kpi.val}</p>
            {kpi.trend ? (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center space-x-1 mt-2">
                <TrendingUp className="w-3 h-3" />
                <span>{kpi.desc}</span>
              </p>
            ) : (
              <p className="text-[10px] text-slate-400 dark:text-slate-505 mt-2 font-light">{kpi.desc}</p>
            )}
          </div>
        ))}
      </div>

      {/* Visual Lists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Templates floating-artifact */}
        <div className="floating-artifact space-y-6">
          <h3 className="text-lg serif-heading font-normal text-ink-black dark:text-paper-white flex items-center space-x-2">
            <Award className="w-4 h-4 text-slate-450" />
            <span>Top Performing Legal Templates</span>
          </h3>

          <div className="space-y-4">
            {templates.map((tpl) => (
              <div key={tpl.id} className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{tpl.name}</span>
                  <span className="font-mono text-slate-400 font-medium">{tpl.usageCount} uses</span>
                </div>
                {/* Clean gestural line chart representation */}
                <div className="w-full h-1 bg-mist-gray dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min((tpl.usageCount / 100) * 100, 100)}%` }}
                    className="bg-ink-black dark:bg-paper-white h-full rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lawyer Performance floating-artifact */}
        <div className="floating-artifact space-y-6">
          <h3 className="text-lg serif-heading font-normal text-ink-black dark:text-paper-white flex items-center space-x-2">
            <Zap className="w-4 h-4 text-slate-450" />
            <span>Associate Lawyer Output & Speed</span>
          </h3>

          <div className="space-y-4.5">
            {activeLawyers.map((lawyer) => (
              <div key={lawyer.id} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-mist-gray/30 dark:bg-slate-900/30 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img src={lawyer.avatar} alt={lawyer.name} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <p className="font-semibold text-ink-black dark:text-paper-white">{lawyer.name}</p>
                      <p className="text-[10px] text-slate-400 font-light">{lawyer.title}</p>
                    </div>
                  </div>

                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-medium uppercase tracking-wider">
                    High Efficiency
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-450 dark:text-slate-400 font-light">
                  <div>Drafts Completed: <strong className="font-medium text-slate-700 dark:text-slate-200">14</strong></div>
                  <div>Avg Turnaround: <strong className="font-mono text-sienna-brown dark:text-blush-peach">3.8 mins</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
