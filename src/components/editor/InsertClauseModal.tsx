import React from 'react';
import { X, Plus, AlertTriangle } from 'lucide-react';

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
  isDark,
}) => {
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const border = isDark ? '#334155' : '#e2e8f0';
  const text = isDark ? '#f1f5f9' : '#0f172a';
  const subtext = isDark ? '#94a3b8' : '#64748b';

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
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: cardBg,
          border: `1px solid ${border}`,
          borderRadius: '20px',
          width: '100%',
          maxWidth: '520px',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: isDark ? '#1a2744' : '#eff6ff',
            borderBottom: `1px solid ${border}`,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: isDark ? '#1e3a8a' : '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Plus style={{ width: '16px', height: '16px', color: isDark ? '#93c5fd' : '#1d4ed8' }} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: text }}>Insert Recommended Clause</div>
              <div style={{ fontSize: '11px', color: subtext, marginTop: '2px' }}>{findingTitle}</div>
            </div>
          </div>
          <button
            onClick={onCancel}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'transparent',
              border: `1px solid ${border}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: subtext,
              flexShrink: 0,
            }}
          >
            <X style={{ width: '14px', height: '14px' }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {/* Why needed */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-start',
              background: isDark ? '#451a03' : '#fff7ed',
              border: isDark ? '1px solid #7c2d12' : '1px solid #fed7aa',
              borderRadius: '10px',
              padding: '10px 12px',
              marginBottom: '16px',
            }}
          >
            <AlertTriangle style={{ width: '14px', height: '14px', color: '#f97316', flexShrink: 0, marginTop: '1px' }} />
            <p style={{ fontSize: '11px', color: isDark ? '#fdba74' : '#9a3412', margin: 0, lineHeight: 1.5 }}>
              {findingDescription}
            </p>
          </div>

          {/* Clause preview */}
          <div style={{ marginBottom: '8px' }}>
            <div
              style={{
                fontSize: '9px',
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: subtext,
                marginBottom: '6px',
                textTransform: 'uppercase',
              }}
            >
              Clause to be Inserted
            </div>
            <div
              style={{
                background: isDark ? '#0f172a' : '#f8fafc',
                border: `1px solid ${border}`,
                borderRadius: '10px',
                padding: '12px',
                fontSize: '11.5px',
                color: text,
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                maxHeight: '200px',
                overflow: 'auto',
                fontFamily: '"Times New Roman", Georgia, serif',
              }}
            >
              {plainText}
            </div>
          </div>

          <p
            style={{
              fontSize: '10px',
              color: subtext,
              fontStyle: 'italic',
              margin: '12px 0 0',
            }}
          >
            The clause will be inserted at the end of the document. AI-generated clauses should be reviewed by a legal professional before use in binding agreements.
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: `1px solid ${border}`,
            display: 'flex',
            gap: '8px',
            background: isDark ? '#0f172a' : '#f8fafc',
          }}
        >
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '12px',
              border: 'none',
              background: isDark ? '#1d4ed8' : '#2563eb',
              color: 'white',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.88'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
          >
            <Plus style={{ width: '13px', height: '13px' }} />
            Confirm Insertion
          </button>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              border: `1px solid ${border}`,
              background: 'transparent',
              color: subtext,
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
