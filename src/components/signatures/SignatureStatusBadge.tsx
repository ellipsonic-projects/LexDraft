import React from 'react';
import { SignatureRequest } from '../../types';

interface SignatureStatusBadgeProps {
  signatureRequest: SignatureRequest | null;
  compact?: boolean;
}

const STATUS_CONFIG = {
  PENDING: { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: '⏳', label: 'Awaiting Signing' },
  IN_PROGRESS: { color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', icon: '✍️', label: 'Signing In Progress' },
  COMPLETED: { color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', icon: '✅', label: 'Fully Signed' },
  CANCELLED: { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', icon: '✕', label: 'Signing Cancelled' },
  EXPIRED: { color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', icon: '⏰', label: 'Signing Expired' }
} as const;

const SIGNER_STATUS_CONFIG = {
  PENDING: { color: '#94a3b8', icon: '○', label: 'Waiting' },
  ACTIVE: { color: '#3b82f6', icon: '◉', label: 'Signing Now' },
  SIGNED: { color: '#22c55e', icon: '✓', label: 'Signed' },
  DECLINED: { color: '#ef4444', icon: '✕', label: 'Declined' },
  EXPIRED: { color: '#94a3b8', icon: '⏰', label: 'Expired' }
} as const;

export const SignatureStatusBadge: React.FC<SignatureStatusBadgeProps> = ({
  signatureRequest,
  compact = false
}) => {
  if (!signatureRequest) return null;

  const cfg = STATUS_CONFIG[signatureRequest.status];
  const signedCount = signatureRequest.signers.filter((s) => s.status === 'SIGNED').length;
  const totalCount = signatureRequest.signers.length;

  if (compact) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 8px',
        borderRadius: '20px',
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        fontSize: '11px',
        fontWeight: 600,
        whiteSpace: 'nowrap'
      }}>
        {cfg.icon} {cfg.label}
        {totalCount > 0 && <span style={{ opacity: 0.7 }}>({signedCount}/{totalCount})</span>}
      </span>
    );
  }

  return (
    <div style={{
      border: `1px solid ${cfg.border}`,
      borderRadius: '12px',
      background: cfg.bg,
      padding: '16px',
      marginTop: '12px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>{cfg.icon}</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
        </div>
        <span style={{
          fontSize: '12px',
          color: '#64748b',
          background: 'rgba(255,255,255,0.7)',
          padding: '2px 8px',
          borderRadius: '20px',
          border: '1px solid #e2e8f0'
        }}>
          {signedCount}/{totalCount} signed
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        height: '4px',
        background: '#e2e8f0',
        borderRadius: '2px',
        marginBottom: '14px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${totalCount > 0 ? (signedCount / totalCount) * 100 : 0}%`,
          background: cfg.color,
          borderRadius: '2px',
          transition: 'width 0.5s ease'
        }} />
      </div>

      {/* Signer list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {signatureRequest.signers.map((signer, idx) => {
          const sc = SIGNER_STATUS_CONFIG[signer.status];
          return (
            <div
              key={signer.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.7)',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: signer.status === 'ACTIVE' ? '#bfdbfe' : '#e2e8f0'
              }}
            >
              {/* Order number */}
              <div style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: signer.status === 'SIGNED' ? '#22c55e' : signer.status === 'ACTIVE' ? '#3b82f6' : '#e2e8f0',
                color: ['SIGNED', 'ACTIVE'].includes(signer.status) ? '#fff' : '#94a3b8',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {signer.status === 'SIGNED' ? '✓' : signer.status === 'DECLINED' ? '✕' : idx + 1}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1e293b',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {signer.signerName}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {signer.signerRole} · {signer.signerEmail}
                </div>
              </div>

              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: sc.color,
                flexShrink: 0
              }}>
                {sc.icon} {sc.label}
              </span>

              {signer.signedAt && (
                <span style={{ fontSize: '10px', color: '#94a3b8', flexShrink: 0 }}>
                  {new Date(signer.signedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {signatureRequest.status === 'COMPLETED' && (
        <div style={{
          marginTop: '12px',
          padding: '10px 14px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#166534',
          fontWeight: 500
        }}>
          📎 A signed copy of the agreement has been emailed to all signers.
        </div>
      )}

      {signatureRequest.status === 'CANCELLED' && (
        <div style={{
          marginTop: '12px',
          padding: '10px 14px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#991b1b'
        }}>
          ⚠️ A signer declined. Please review and start a new signing process if needed.
        </div>
      )}
    </div>
  );
};
