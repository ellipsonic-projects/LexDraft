import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, RefreshCw, FileText, Shield, ZoomIn, Scissors, Eye, Pen, ChevronDown, ChevronUp, X } from 'lucide-react';
import type { RewriteAction } from '../../services/ai';

interface FloatingAiToolbarProps {
  /** Whether the toolbar is visible */
  visible: boolean;
  /** The selected text that was highlighted */
  selectedText: string;
  /** The bounding rect of the selection (used to position the toolbar) */
  selectionRect: DOMRect | null;
  /** The editor container element */
  editorContainer: HTMLElement | null;
  /** Whether an AI rewrite is in progress */
  isLoading: boolean;
  /** Callback when user clicks an action */
  onAction: (action: RewriteAction) => void;
  /** Callback when toolbar closes */
  onClose: () => void;
  isDark?: boolean;
}

const ACTIONS: { action: RewriteAction; label: string; icon: React.ReactNode }[] = [
  { action: 'REWRITE_LEGALLY', label: 'Rewrite Legally', icon: <Shield className="w-3.5 h-3.5 text-indigo-500" /> },
  { action: 'REWRITE_PROFESSIONALLY', label: 'Rewrite Professionally', icon: <Pen className="w-3.5 h-3.5 text-blue-500" /> },
  { action: 'SIMPLIFY', label: 'Simplify', icon: <Eye className="w-3.5 h-3.5 text-emerald-500" /> },
  { action: 'SUMMARIZE', label: 'Summarize', icon: <FileText className="w-3.5 h-3.5 text-amber-500" /> },
  { action: 'MAKE_DEFENSIBLE', label: 'Make Defensible', icon: <Shield className="w-3.5 h-3.5 text-rose-500" /> },
  { action: 'EXPAND', label: 'Expand', icon: <ZoomIn className="w-3.5 h-3.5 text-purple-500" /> },
  { action: 'SHORTEN', label: 'Shorten', icon: <Scissors className="w-3.5 h-3.5 text-slate-500" /> },
  { action: 'IMPROVE_CLARITY', label: 'Improve Clarity', icon: <RefreshCw className="w-3.5 h-3.5 text-cyan-500" /> },
  { action: 'IMPROVE_FORMALITY', label: 'Improve Formality', icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" /> },
];

export const FloatingAiToolbar: React.FC<FloatingAiToolbarProps> = ({
  visible,
  selectedText,
  selectionRect,
  isLoading,
  onAction,
  onClose,
}) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    if (!visible || !selectionRect) {
      setShowActions(false);
      return;
    }

    const toolbarWidth = 260;
    const toolbarHeight = 40;

    // Calculate fixed viewport coordinates directly relative to window
    let left = selectionRect.left + (selectionRect.width / 2) - (toolbarWidth / 2);
    let top = selectionRect.top - toolbarHeight - 10;

    // Clamp horizontally inside window viewport
    left = Math.max(12, Math.min(left, window.innerWidth - toolbarWidth - 12));

    // If toolbar extends above top of visible window, position directly below selection
    if (top < 10) {
      top = selectionRect.bottom + 8;
    }

    setPosition({ top, left });
  }, [visible, selectionRect]);

  // Close when clicking outside
  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [visible, onClose]);

  if (!visible || !selectionRect) return null;

  return createPortal(
    <div
      ref={toolbarRef}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 99999,
      }}
      className="flex flex-col gap-1.5 pointer-events-auto animate-in fade-in duration-150 select-none"
    >
      {/* Main LexDraft Pill Control */}
      <div
        onClick={() => !isLoading && setShowActions(s => !s)}
        className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-full shadow-2xl border border-slate-800 dark:border-slate-200 cursor-pointer transition-all hover:scale-105"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600 animate-pulse shrink-0" />
        <span className="text-xs font-bold tracking-tight">
          {isLoading ? 'AI Writing…' : 'AI Rewrite'}
        </span>
        <span className="text-[10px] opacity-75 truncate max-w-[110px]" title={selectedText}>
          · "{selectedText.slice(0, 24)}{selectedText.length > 24 ? '…' : ''}"
        </span>
        {showActions ? <ChevronUp className="w-3 h-3 opacity-60 ml-1 shrink-0" /> : <ChevronDown className="w-3 h-3 opacity-60 ml-1 shrink-0" />}
      </div>

      {/* Actions Grid Menu */}
      {showActions && !isLoading && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-2xl grid grid-cols-1 sm:grid-cols-2 gap-1 min-w-[260px] animate-in fade-in zoom-in-95 duration-150">
          {ACTIONS.map(({ action, label, icon }) => (
            <button
              key={action}
              onClick={() => {
                setShowActions(false);
                onAction(action);
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium transition-colors text-left w-full cursor-pointer"
            >
              {icon}
              <span className="truncate">{label}</span>
            </button>
          ))}
          <button
            onClick={onClose}
            className="col-span-full mt-1 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-1 transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" /> Dismiss
          </button>
        </div>
      )}
    </div>,
    document.body
  );
};
