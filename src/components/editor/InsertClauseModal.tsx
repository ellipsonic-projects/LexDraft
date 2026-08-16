import React from 'react';
import { X, Plus, AlertTriangle, FileText, Check } from 'lucide-react';

interface InsertClauseModalProps {
  /** The HTML content of the clause to be inserted */
  clauseHtml: string;
  /** The title of the finding that suggested this clause */
  findingTitle: string;
  /** Description of why this clause is needed */
  findingDescription: string;
  /** Called when user confirms insertion */
  onConfirm: () => void;
  /** Called when user cancels */
  onCancel: () => void;
  isDark: boolean;
}

export const InsertClauseModal: React.FC<InsertClauseModalProps> = ({
  clauseHtml,
  findingTitle,
  findingDescription,
  onConfirm,
  onCancel,
}) => {
  // Strip HTML tags for preview display
  const plainText = clauseHtml
    .replace(/<h[1-6][^>]*>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-500/20">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold serif-heading text-slate-900 dark:text-slate-100">
                Insert Recommended Clause
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {findingTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Finding Rationale */}
          <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/60 rounded-2xl space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              ⚖️ Recommendation Rationale
            </span>
            <p className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed">
              {findingDescription}
            </p>
          </div>

          {/* Clause Preview Container */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Target Clause Content
            </span>
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-mono whitespace-pre-wrap max-h-[260px] overflow-y-auto shadow-inner">
              {plainText}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <p className="text-[10px] text-slate-400 italic">
            Inserts directly into the matching logical section in the editor canvas.
          </p>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={onCancel}
              className="btn-ghost px-4 py-2 text-xs rounded-full cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="btn-filled px-5 py-2 text-xs rounded-full shadow-md flex items-center space-x-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirm & Insert Clause</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
