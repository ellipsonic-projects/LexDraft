import React from 'react';
import { X, Check, Copy, AlertTriangle, Sparkles } from 'lucide-react';
import type { RewriteResult, RewriteAction } from '../../services/ai';

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

interface RewritePreviewModalProps {
  result: RewriteResult;
  onReplace: () => void;
  onInsertBelow: () => void;
  onCancel: () => void;
  isDark: boolean;
}

export const RewritePreviewModal: React.FC<RewritePreviewModalProps> = ({
  result,
  onReplace,
  onInsertBelow,
  onCancel,
  isDark,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.rewrittenText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const bg = isDark ? '#0f172a' : '#ffffff';
  const overlay = 'rgba(0,0,0,0.6)';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const border = isDark ? '#334155' : '#e2e8f0';
  const text = isDark ? '#f1f5f9' : '#0f172a';
  const subtext = isDark ? '#94a3b8' : '#64748b';
  const originalBg = isDark ? '#1a1a2e' : '#fef9f0';
  const rewriteBg = isDark ? '#0d2137' : '#f0fdf4';
  const originalBorder = isDark ? '#7c3aed33' : '#e9d5ff';
  const rewriteBorder = isDark ? '#065f4633' : '#bbf7d0';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: overlay,
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
          maxWidth: '680px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: isDark
              ? 'linear-gradient(135deg, #312e81, #1e1b4b)'
              : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles style={{ width: '16px', height: '16px', color: 'white' }} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>
                AI Rewrite Preview
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(199,210,254,0.9)', marginTop: '1px', fontWeight: 600 }}>
                {ACTION_LABELS[result.action]} · 🇮🇳 Indian Legal Drafting · {result.providerLabel}
              </div>
            </div>
          </div>
          <button
            onClick={onCancel}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            <X style={{ width: '14px', height: '14px' }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {/* Legal review warning */}
          {result.needsLegalReview && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                background: isDark ? '#451a1a' : '#fef2f2',
                border: isDark ? '1px solid #7f1d1d' : '1px solid #fecaca',
                borderRadius: '10px',
                padding: '10px 12px',
                marginBottom: '16px',
              }}
            >
              <AlertTriangle style={{ width: '14px', height: '14px', color: '#ef4444', flexShrink: 0, marginTop: '1px' }} />
              <p style={{ fontSize: '11px', color: isDark ? '#fca5a5' : '#991b1b', margin: 0 }}>
                <strong>Needs Legal Review:</strong> The AI flagged uncertainty in this rewrite. Have a qualified legal professional review before applying.
              </p>
            </div>
          )}

          {/* Warnings */}
          {result.warnings && result.warnings.length > 0 && (
            <div
              style={{
                background: isDark ? '#3b2005' : '#fffbe6',
                border: isDark ? '1px solid #78350f' : '1px solid #ffe58f',
                borderRadius: '10px',
                padding: '10px 12px',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '9px', fontWeight: 800, color: isDark ? '#fde047' : '#d97706', marginBottom: '4px', textTransform: 'uppercase' }}>
                Statutory Cautions & Legal Warnings
              </div>
              {result.warnings.map((w, idx) => (
                <div key={idx} style={{ fontSize: '11px', color: isDark ? '#fef08a' : '#92400e', lineHeight: 1.4 }}>
                  • {w}
                </div>
              ))}
            </div>
          )}

          {/* Two columns: Original vs Rewrite */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            {/* Original */}
            <div>
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  color: isDark ? '#a855f7' : '#7c3aed',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                }}
              >
                Original Text
              </div>
              <div
                style={{
                  background: originalBg,
                  border: `1px solid ${originalBorder}`,
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '12px',
                  color: subtext,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  minHeight: '80px',
                  maxHeight: '200px',
                  overflow: 'auto',
                }}
              >
                {result.originalText}
              </div>
            </div>

            {/* Rewrite */}
            <div>
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  color: isDark ? '#34d399' : '#065f46',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                }}
              >
                Suggested Text (Indian Legal Drafting)
              </div>
              <div
                style={{
                  background: rewriteBg,
                  border: `1px solid ${rewriteBorder}`,
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '12px',
                  color: text,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  minHeight: '80px',
                  maxHeight: '200px',
                  overflow: 'auto',
                }}
              >
                {result.rewrittenText}
              </div>
            </div>
          </div>

          {/* Legal Basis Cards */}
          {result.legalBasis && result.legalBasis.length > 0 && (
            <div
              style={{
                background: isDark ? '#1e293b' : '#f0f9ff',
                border: isDark ? '1px solid #334155' : '1px solid #bae6fd',
                borderRadius: '10px',
                padding: '10px 12px',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  color: isDark ? '#38bdf8' : '#0284c7',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                }}
              >
                ⚖️ Applicable Indian Statutory Basis
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {result.legalBasis.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: isDark ? '#0f172a' : '#ffffff',
                      border: `1px solid ${border}`,
                      borderRadius: '8px',
                      padding: '8px 10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: text }}>{item.source}</span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          background: isDark ? '#312e81' : '#e0e7ff',
                          color: isDark ? '#c7d2fe' : '#4338ca',
                          padding: '2px 8px',
                          borderRadius: '12px',
                        }}
                      >
                        {item.reference}
                      </span>
                    </div>
                    <p style={{ fontSize: '10px', color: subtext, margin: '4px 0 0 0', lineHeight: 1.4 }}>
                      {item.relevance}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rationale */}
          {result.rationale && (
            <div
              style={{
                background: isDark ? '#1e293b' : '#f8fafc',
                border: `1px solid ${border}`,
                borderRadius: '10px',
                padding: '10px 12px',
              }}
            >
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  color: subtext,
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                }}
              >
                Drafting Rationale
              </div>
              <p style={{ fontSize: '11px', color: text, margin: 0, lineHeight: 1.5 }}>
                {result.rationale}
              </p>
            </div>
          )}

          {/* Disclaimer */}
          <p
            style={{
              fontSize: '10px',
              color: subtext,
              marginTop: '12px',
              marginBottom: 0,
              fontStyle: 'italic',
            }}
          >
            AI-generated suggestions are assistive only and should be reviewed by a qualified legal professional before use in binding agreements.
          </p>
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: `1px solid ${border}`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: isDark ? '#0f172a' : '#f8fafc',
          }}
        >
          <button
            onClick={onReplace}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
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
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.9'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
          >
            <Check style={{ width: '13px', height: '13px' }} />
            Replace Selection
          </button>
          <button
            onClick={onInsertBelow}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '12px',
              border: `1px solid ${border}`,
              background: 'transparent',
              color: text,
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            Insert Below
          </button>
          <button
            onClick={handleCopy}
            style={{
              padding: '10px 12px',
              borderRadius: '12px',
              border: `1px solid ${border}`,
              background: 'transparent',
              color: subtext,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
            }}
            title="Copy rewrite to clipboard"
          >
            <Copy style={{ width: '12px', height: '12px' }} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 12px',
              borderRadius: '12px',
              border: `1px solid ${border}`,
              background: 'transparent',
              color: subtext,
              fontSize: '12px',
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
