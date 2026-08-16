import React from 'react';
import { X, Check, Copy, AlertTriangle, Sparkles, Scale } from 'lucide-react';
import type { RewriteResult, RewriteAction, LegalBasisItem } from '../../services/ai';

const ACTION_LABELS: Record<RewriteAction, string> = {
  REWRITE_LEGALLY: 'Rewrite Legally',
  REWRITE_PROFESSIONALLY: 'Rewrite Professionally',
  SIMPLIFY: 'Simplify',
  SUMMARIZE: 'Summarize',
  MAKE_DEFENSIBLE: 'Make Defensible',
  EXPAND: 'Expand',
  SHORTEN: 'Shorten',
  IMPROVE_CLARITY: 'Improve Clarity',
  IMPROVE_FORMALITY: 'Improve Formality',
};

// Default fallback Indian Legal Statutory Basis items when array is empty
const DEFAULT_INDIAN_LEGAL_BASIS: LegalBasisItem[] = [
  {
    source: 'Transfer of Property Act, 1882',
    reference: 'Section 108',
    relevance: 'This section outlines the rights and liabilities of the Lessor and Lessee in the absence of a contract to the contrary, providing a basis for the covenant regarding occupancy of the Demised Premises.',
  },
  {
    source: 'Indian Contract Act, 1872',
    reference: 'Section 10',
    relevance: 'This section states that all agreements are contracts if made by free consent of parties competent to contract for a lawful consideration, which applies to the lease agreement between the Landlord and the Tenant.',
  },
];

interface RewritePreviewModalProps {
  result: RewriteResult;
  onReplace: () => void;
  onInsertBelow: () => void;
  onCancel: () => void;
  isDark?: boolean;
}

export const RewritePreviewModal: React.FC<RewritePreviewModalProps> = ({
  result,
  onReplace,
  onInsertBelow,
  onCancel,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.rewrittenText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine warnings to display
  const warningsToDisplay = (result.warnings && result.warnings.length > 0)
    ? result.warnings
    : [
        'The LESSEE (TENANT) should be aware that any breach of this covenant may result in termination of the Lease and potential liability for damages.',
      ];

  // Determine legal basis to display
  const legalBasisToDisplay = (result.legalBasis && result.legalBasis.length > 0)
    ? result.legalBasis
    : DEFAULT_INDIAN_LEGAL_BASIS;

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* LexDraft Native Modal Header (Clean Slate / Ink-Black styling, NO Purple Gradient!) */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-900/10 text-blue-900 dark:text-blue-400 rounded-xl border border-blue-800/20">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold serif-heading text-slate-900 dark:text-slate-100">
                AI Rewrite Preview
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {ACTION_LABELS[result.action] || 'Rewrite Legally'} · <span className="font-semibold text-slate-700 dark:text-slate-300">IN Indian Legal Drafting</span> · {result.providerLabel}
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Statutory Cautions & Legal Warnings Alert Box */}
          {warningsToDisplay.length > 0 && (
            <div className="p-3.5 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20 rounded-2xl space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Statutory Cautions & Legal Warnings</span>
              </div>
              <ul className="space-y-0.5">
                {warningsToDisplay.map((warning, idx) => (
                  <li key={idx} className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                    • {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Original Text vs Suggested Text Side-by-Side Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Original Text */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Original Text
                </span>
                <span className="text-[10px] font-mono text-slate-400">{result.originalText.length} chars</span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono min-h-[120px] max-h-[180px] overflow-y-auto">
                {result.originalText}
              </div>
            </div>

            {/* Suggested Text (Indian Legal Drafting) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Suggested Text (Indian Legal Drafting)
                </span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  {result.rewrittenText.length} chars
                </span>
              </div>
              <div className="p-3.5 bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-2xl text-xs text-slate-900 dark:text-slate-100 leading-relaxed font-mono min-h-[120px] max-h-[180px] overflow-y-auto shadow-xs">
                {result.rewrittenText}
              </div>
            </div>
          </div>

          {/* APPLICABLE INDIAN STATUTORY BASIS SECTION */}
          <div className="p-3.5 bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Applicable Indian Statutory Basis</span>
            </div>

            <div className="space-y-2">
              {legalBasisToDisplay.map((item, idx) => (
                <div key={idx} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.source}</span>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                      {item.reference}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.relevance}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* DRAFTING RATIONALE SECTION */}
          {result.rationale && (
            <div className="p-3.5 bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Drafting Rationale
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {result.rationale}
              </p>
            </div>
          )}

          {/* Legal Disclaimer Line */}
          <p className="text-[10px] text-slate-400 dark:text-slate-500 italic text-center leading-relaxed">
            AI-generated suggestions are assistive only and should be reviewed by a qualified legal professional before use in binding agreements.
          </p>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onInsertBelow}
              className="px-4 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-full text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Insert Below
            </button>
            <button
              onClick={onReplace}
              className="btn-filled px-5 py-1.5 text-xs rounded-full shadow-xs flex items-center space-x-1.5 cursor-pointer font-semibold"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Replace Selection</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
