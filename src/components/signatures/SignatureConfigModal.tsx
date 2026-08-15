import React, { useState } from 'react';
import { CreateSignerInput, SignerType, User, Client } from '../../types';
import { dataRepository } from '../../services/dataRepository';

interface SignatureConfigModalProps {
  taskId: string;
  documentId: string;
  documentTitle: string;
  users: User[];
  client: Client | null;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const SIGNER_ROLES = ['Senior Partner', 'Lawyer', 'Associate', 'Client', 'Witness', 'Co-Signer', 'Guarantor'];

const defaultSigner = (): CreateSignerInput => ({
  signerName: '',
  signerEmail: '',
  signerRole: 'Client',
  signerType: 'EXTERNAL',
  signingOrder: 1
});

export const SignatureConfigModal: React.FC<SignatureConfigModalProps> = ({
  taskId,
  documentId,
  documentTitle,
  users,
  client,
  onClose,
  onSuccess,
  showToast
}) => {
  const [signers, setSigners] = useState<CreateSignerInput[]>([
    { ...defaultSigner(), signingOrder: 1 }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addSigner = () => {
    setSigners((prev) => [
      ...prev,
      { ...defaultSigner(), signingOrder: prev.length + 1 }
    ]);
  };

  const removeSigner = (index: number) => {
    setSigners((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((s, i) => ({ ...s, signingOrder: i + 1 }));
    });
  };

  const updateSigner = (index: number, updates: Partial<CreateSignerInput>) => {
    setSigners((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  const handleTypeChange = (index: number, type: SignerType) => {
    const updates: Partial<CreateSignerInput> = { signerType: type, userId: undefined, clientId: undefined };
    if (type === 'EXISTING_CLIENT' && client) {
      updates.signerName = client.name;
      updates.signerEmail = client.contactEmail;
      updates.signerRole = 'Client';
      updates.clientId = client.id;
    } else if (type === 'INTERNAL_USER') {
      updates.signerName = '';
      updates.signerEmail = '';
      updates.signerRole = 'Senior Partner';
    } else {
      updates.signerName = '';
      updates.signerEmail = '';
    }
    updateSigner(index, updates);
  };

  const handleUserSelect = (index: number, userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      updateSigner(index, {
        userId,
        signerName: user.name,
        signerEmail: user.email,
        signerRole: user.title || 'Lawyer'
      });
    }
  };

  const handleSubmit = async () => {
    // Validation
    for (let i = 0; i < signers.length; i++) {
      const s = signers[i];
      if (!s.signerName.trim()) {
        showToast(`Signer ${i + 1}: Name is required.`, 'error');
        return;
      }
      if (!s.signerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.signerEmail)) {
        showToast(`Signer ${i + 1}: Valid email is required.`, 'error');
        return;
      }
      if (!s.signerRole.trim()) {
        showToast(`Signer ${i + 1}: Role is required.`, 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await dataRepository.createSignatureRequest({ taskId, documentId, signers });
      showToast('Signing process started! First signer has been notified by email.', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err?.data?.message || err?.message || 'Failed to start signing process.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px'
  };

  const modalStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '680px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  };

  const signerTypeLabels: Record<SignerType, string> = {
    INTERNAL_USER: 'Internal User (Lawyer/Partner)',
    EXISTING_CLIENT: 'Existing Client',
    EXTERNAL: 'External Party'
  };

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          padding: '24px 28px',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <span style={{ fontSize: '20px' }}>✍️</span>
                <h2 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: 700 }}>
                  Configure Signing Process
                </h2>
              </div>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
                {documentTitle}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                padding: '6px 10px',
                fontSize: '16px'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Info bar */}
        <div style={{
          background: '#f0f9ff',
          borderBottom: '1px solid #bae6fd',
          padding: '12px 28px',
          fontSize: '12px',
          color: '#0369a1',
          flexShrink: 0
        }}>
          📋 Signers will be notified by email in the order listed below. The next signer is activated only after the previous one signs.
        </div>

        {/* Signers list */}
        <div style={{ overflowY: 'auto', padding: '24px 28px', flex: 1 }}>
          {signers.map((signer, index) => (
            <div
              key={index}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '16px',
                background: '#f8fafc',
                position: 'relative'
              }}
            >
              {/* Order badge */}
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '16px',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '20px'
              }}>
                Signer {index + 1}
              </div>

              {signers.length > 1 && (
                <button
                  onClick={() => removeSigner(index)}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    color: '#dc2626',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '4px 8px'
                  }}
                >
                  ✕ Remove
                </button>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '8px' }}>
                {/* Signer Type */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Signer Type
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {(Object.keys(signerTypeLabels) as SignerType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleTypeChange(index, t)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid',
                          borderColor: signer.signerType === t ? '#6366f1' : '#e2e8f0',
                          background: signer.signerType === t ? '#eff6ff' : '#fff',
                          color: signer.signerType === t ? '#4f46e5' : '#64748b',
                          fontSize: '12px',
                          fontWeight: signer.signerType === t ? 600 : 400,
                          cursor: 'pointer'
                        }}
                      >
                        {t === 'INTERNAL_USER' ? '👤 Internal' : t === 'EXISTING_CLIENT' ? '🤝 Client' : '🌐 External'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* If Internal User: user picker */}
                {signer.signerType === 'INTERNAL_USER' && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Select User
                    </label>
                    <select
                      value={signer.userId || ''}
                      onChange={(e) => handleUserSelect(index, e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">— Select a user —</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.title || u.role})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label style={labelStyle}>Full Name *</label>
                  <input
                    type="text"
                    value={signer.signerName}
                    onChange={(e) => updateSigner(index, { signerName: e.target.value })}
                    placeholder="e.g. Aarav Mehta"
                    style={inputStyle}
                    readOnly={signer.signerType === 'INTERNAL_USER' && !!signer.userId}
                  />
                </div>

                {/* Email */}
                <div>
                  <label style={labelStyle}>Email *</label>
                  <input
                    type="email"
                    value={signer.signerEmail}
                    onChange={(e) => updateSigner(index, { signerEmail: e.target.value })}
                    placeholder="e.g. aarav@email.com"
                    style={inputStyle}
                    readOnly={signer.signerType === 'INTERNAL_USER' && !!signer.userId}
                  />
                </div>

                {/* Role */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Role / Capacity *</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    {SIGNER_ROLES.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => updateSigner(index, { signerRole: r })}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid',
                          borderColor: signer.signerRole === r ? '#6366f1' : '#e2e8f0',
                          background: signer.signerRole === r ? '#eff6ff' : '#fff',
                          color: signer.signerRole === r ? '#4f46e5' : '#64748b',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={signer.signerRole}
                    onChange={(e) => updateSigner(index, { signerRole: e.target.value })}
                    placeholder="Or type a custom role"
                    style={{ ...inputStyle, fontSize: '12px' }}
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Add Signer Button */}
          <button
            type="button"
            onClick={addSigner}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px dashed #cbd5e1',
              borderRadius: '10px',
              background: 'transparent',
              color: '#6366f1',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              marginBottom: '8px'
            }}
          >
            + Add Another Signer
          </button>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          background: '#f8fafc',
          flexShrink: 0
        }}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#fff',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              background: isSubmitting
                ? '#c7d2fe'
                : 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#fff',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isSubmitting ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                Starting...
              </>
            ) : (
              <>✍️ Start Signing Process</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  color: '#64748b',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  fontSize: '14px',
  color: '#1e293b',
  background: '#fff',
  boxSizing: 'border-box'
};
