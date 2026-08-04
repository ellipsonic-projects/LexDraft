import React, { useState } from 'react';
import { LegalDocument } from '../../types';
import { History, X, RotateCcw, GitCompare, User } from 'lucide-react';

interface VersionHistoryModalProps {
  document: LegalDocument;
  onClose: () => void;
  onRestore: (versionNumber: number) => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({ document, onClose, onRestore }) => {
  const [selectedVersionNum, setSelectedVersionNum] = useState<number>(document.currentVersion);

  const selectedVersion = document.versions.find(v => v.versionNumber === selectedVersionNum) || document.versions[0];
  const currentVersionObj = document.versions.find(v => v.versionNumber === document.currentVersion) || document.versions[0];

  const computeLineDiff = (oldHtml: string, newHtml: string) => {
    const cleanLinesOld = oldHtml.replace(/<[^>]+>/g, '\n').split('\n').filter(l => l.trim().length > 0);
    const cleanLinesNew = newHtml.replace(/<[^>]+>/g, '\n').split('\n').filter(l => l.trim().length > 0);

    const diffResult: { type: 'added' | 'removed' | 'unchanged'; text: string }[] = [];

    const oldSet = new Set(cleanLinesOld);
    const newSet = new Set(cleanLinesNew);

    cleanLinesNew.forEach(line => {
      if (!oldSet.has(line)) {
        diffResult.push({ type: 'added', text: line });
      } else {
        diffResult.push({ type: 'unchanged', text: line });
      }
    });

    cleanLinesOld.forEach(line => {
      if (!newSet.has(line)) {
        diffResult.push({ type: 'removed', text: line });
      }
    });

    return diffResult;
  };

  const diffLines = selectedVersion && currentVersionObj ? computeLineDiff(selectedVersion.content, currentVersionObj.content) : [];

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-900/10 text-blue-900 dark:text-blue-400 rounded-xl border border-blue-800/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Document Version History & Visual Diff</h2>
              <p className="text-xs text-slate-500">{document.title} • Current Version: <span className="font-mono text-blue-800 dark:text-blue-400 font-bold">v{document.currentVersion}</span></p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden divide-x divide-slate-200 dark:divide-slate-800">
          <div className="p-4 space-y-3 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Version History Checkpoints</p>

            <div className="space-y-2">
              {document.versions.map((v) => (
                <button
                  key={v.versionNumber}
                  onClick={() => setSelectedVersionNum(v.versionNumber)}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all ${
                    selectedVersionNum === v.versionNumber
                      ? 'bg-blue-900/10 border-blue-800/40 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-blue-800 dark:text-blue-400 font-mono">Version v{v.versionNumber}</span>
                    {v.versionNumber === document.currentVersion && (
                      <span className="px-2 py-0.5 text-[9px] font-bold bg-blue-900/20 text-blue-900 dark:text-blue-400 rounded-full">
                        Active Draft
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 mt-1 leading-snug">
                    {v.changeDescription}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-center space-x-1">
                      <User className="w-3 h-3" />
                      <span>{v.authorName}</span>
                    </span>
                    <span>{new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 p-6 overflow-y-auto space-y-5 bg-white dark:bg-slate-900">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <GitCompare className="w-4 h-4 text-blue-800 dark:text-blue-400" />
                  <span>Comparing Snapshot <span className="font-mono text-blue-800 dark:text-blue-400">v{selectedVersion?.versionNumber}</span> to Active Draft <span className="font-mono text-blue-800 dark:text-blue-400">v{document.currentVersion}</span></span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedVersion?.changeDescription}</p>
              </div>

              {selectedVersion?.versionNumber !== document.currentVersion && (
                <button
                  onClick={() => {
                    onRestore(selectedVersion.versionNumber);
                    onClose();
                  }}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-900/20 transition-all flex items-center space-x-1.5 shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Restore Snapshot v{selectedVersion?.versionNumber}</span>
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4 text-xs font-semibold text-slate-500">
                <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span>Green: Added In Current Draft</span></span>
                <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /><span>Red: Removed / Replaced</span></span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 font-mono text-xs max-h-[50vh] overflow-y-auto">
                {diffLines.map((line, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded leading-relaxed text-xs ${
                      line.type === 'added'
                        ? 'bg-emerald-100 text-emerald-900 border-l-4 border-emerald-500 font-semibold'
                        : line.type === 'removed'
                        ? 'bg-rose-100 text-rose-900 border-l-4 border-rose-500 line-through opacity-80'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="font-bold mr-2 text-[10px] uppercase">{line.type === 'added' ? '+ ADDED:' : line.type === 'removed' ? '- REMOVED:' : ' '}</span>
                    {line.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
