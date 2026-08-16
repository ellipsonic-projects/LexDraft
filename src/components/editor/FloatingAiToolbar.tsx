import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, RefreshCw, FileText, Minimize2, Shield, ZoomIn, Scissors, Eye, Pen } from 'lucide-react';
import type { RewriteAction } from '../../services/ai';

interface FloatingAiToolbarProps {
  /** Whether the toolbar is visible */
  visible: boolean;
  /** The selected text that was highlighted */
  selectedText: string;
  /** The bounding rect of the selection (used to position the toolbar) */
  selectionRect: DOMRect | null;
  /** The editor container element (used for scroll-adjusted positioning) */
  editorContainer: HTMLElement | null;
  /** Whether an AI rewrite is in progress */
  isLoading: boolean;
  /** Callback when user clicks an action */
  onAction: (action: RewriteAction) => void;
  /** Callback when toolbar closes */
  onClose: () => void;
  isDark: boolean;
}

const ACTIONS: { action: RewriteAction; label: string; icon: React.ReactNode; color: string }[] = [
  { action: 'REWRITE_LEGALLY', label: 'Rewrite Legally', icon: <Shield className="w-3 h-3" />, color: '#6366f1' },
  { action: 'REWRITE_PROFESSIONALLY', label: 'Rewrite Professionally', icon: <Pen className="w-3 h-3" />, color: '#0ea5e9' },
  { action: 'SIMPLIFY', label: 'Simplify', icon: <Eye className="w-3 h-3" />, color: '#10b981' },
  { action: 'SUMMARIZE', label: 'Summarize', icon: <FileText className="w-3 h-3" />, color: '#f59e0b' },
  { action: 'MAKE_DEFENSIBLE', label: 'Make Defensible', icon: <Shield className="w-3 h-3" />, color: '#ef4444' },
  { action: 'EXPAND', label: 'Expand', icon: <ZoomIn className="w-3 h-3" />, color: '#8b5cf6' },
  { action: 'SHORTEN', label: 'Shorten', icon: <Scissors className="w-3 h-3" />, color: '#64748b' },
  { action: 'IMPROVE_CLARITY', label: 'Improve Clarity', icon: <RefreshCw className="w-3 h-3" />, color: '#06b6d4' },
  { action: 'IMPROVE_FORMALITY', label: 'Improve Formality', icon: <Sparkles className="w-3 h-3" />, color: '#f97316' },
];

export const FloatingAiToolbar: React.FC<FloatingAiToolbarProps> = ({
  visible,
  selectedText,
  selectionRect,
  editorContainer,
  isLoading,
  onAction,
  onClose,
  isDark,
}) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    if (!visible || !selectionRect || !editorContainer) {
      setShowActions(false);
      return;
    }

    const containerRect = editorContainer.getBoundingClientRect();
    const toolbarWidth = 240;
    const toolbarHeight = 36;

    // Calculate position relative to container viewport bounds
    let left = selectionRect.left - containerRect.left + (selectionRect.width / 2) - (toolbarWidth / 2);
    let top = selectionRect.top - containerRect.top - toolbarHeight - 10;

    // Clamp horizontally inside container
    left = Math.max(12, Math.min(left, containerRect.width - toolbarWidth - 12));

    // If toolbar extends above visible container, show below selection instead
    if (top < 8) {
      top = selectionRect.bottom - containerRect.top + 8;
    }

    setPosition({ top, left });
    setShowActions(false);
  }, [visible, selectionRect, editorContainer]);

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

  const bg = isDark ? '#1e293b' : '#ffffff';
  const border = isDark ? '#334155' : '#e2e8f0';
  const text = isDark ? '#f1f5f9' : '#0f172a';
  const subtext = isDark ? '#94a3b8' : '#64748b';

  return (
    <div
      ref={toolbarRef}
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        pointerEvents: 'all',
      }}
    >
      {/* Main trigger pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: isDark ? 'linear-gradient(135deg, #312e81, #1e1b4b)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          border: '1px solid rgba(99,102,241,0.4)',
          borderRadius: '20px',
          padding: '5px 12px',
          boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          transition: 'transform 0.15s ease',
          width: 'max-content',
          minWidth: '180px',
          maxWidth: '280px',
        }}
        onMouseEnter={(e) => { if (!isLoading) (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
        onClick={() => !isLoading && setShowActions(s => !s)}
      >
        <Sparkles className="w-3.5 h-3.5 text-indigo-200" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'white', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
          {isLoading ? 'AI Writing…' : 'AI Rewrite'}
        </span>
        <span
          style={{
            fontSize: '10px',
            color: 'rgba(199,210,254,0.85)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '120px',
          }}
          title={selectedText}
        >
          · "{selectedText.slice(0, 30)}{selectedText.length > 30 ? '…' : ''}"
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'rgba(199,210,254,0.7)', flexShrink: 0 }}>
          {showActions ? '▲' : '▼'}
        </span>
      </div>

      {/* Actions dropdown */}
      {showActions && !isLoading && (
        <div
          style={{
            background: bg,
            border: `1px solid ${border}`,
            borderRadius: '12px',
            padding: '6px',
            boxShadow: isDark
              ? '0 8px 32px rgba(0,0,0,0.5)'
              : '0 8px 32px rgba(0,0,0,0.15)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px',
            minWidth: '240px',
          }}
        >
          {ACTIONS.map(({ action, label, icon, color }) => (
            <button
              key={action}
              onClick={() => {
                setShowActions(false);
                onAction(action);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 10px',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: text,
                fontSize: '11px',
                fontWeight: 600,
                transition: 'background 0.1s',
                textAlign: 'left',
                width: '100%',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = isDark ? '#1e3a5f22' : '#f1f5f9';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <span style={{ color, flexShrink: 0 }}>{icon}</span>
              {label}
            </button>
          ))}
          <button
            onClick={onClose}
            style={{
              gridColumn: '1 / -1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '5px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: subtext,
              fontSize: '10px',
              marginTop: '2px',
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
