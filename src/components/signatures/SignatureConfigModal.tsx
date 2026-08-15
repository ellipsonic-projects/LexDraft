import React, { useState, useEffect } from 'react';
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

const COMMON_ROLES = [
  'Owner',
  'Tenant',
  'Landlord',
  'Lessor',
  'Lessee',
  'Manager',
  'Property Manager',
  'Lawyer',
  'Senior Partner',
  'Client',
  'Witness',
  'Co-Signer',
  'Guarantor'
];

/**
 * Extracts signature roles directly from document HTML content.
 */
export function extractRolesFromHtml(html: string): string[] {
  if (!html) return [];
  const foundRoles: string[] = [];

  // Match elements with class "sig-role"
  const sigRoleRegex = /<(?:p|span|div|td|th)\b[^>]*class="[^"]*sig-role[^"]*"[^>]*>([\s\S]*?)<\/(?:p|span|div|td|th)>/gi;
  let match: RegExpExecArray | null;
  while ((match = sigRoleRegex.exec(html)) !== null) {
    const cleanRole = match[1].replace(/<[^>]+>/g, '').trim();
    if (cleanRole && !foundRoles.includes(cleanRole)) {
      foundRoles.push(cleanRole);
    }
  }

  // Fallback: search for known legal role keywords in content
  if (foundRoles.length === 0) {
    for (const role of COMMON_ROLES) {
      const reg = new RegExp(`\\b${role}\\b`, 'i');
      if (reg.test(html) && !foundRoles.includes(role)) {
        foundRoles.push(role);
      }
    }
  }

  return foundRoles;
}

function buildSignerForRole(
  role: string,
  order: number,
  client: Client | null,
  users: User[]
): CreateSignerInput {
  const roleLower = role.toLowerCase();

  // If role is Client / Tenant / Lessee
  if (['client', 'tenant', 'lessee', 'buyer'].some(r => roleLower.includes(r))) {
    if (client) {
      return {
        signerName: client.name,
        signerEmail: client.contactEmail,
        signerRole: role,
        signerType: 'EXISTING_CLIENT',
        clientId: client.id,
        signingOrder: order
      };
    }
  }

  // If role is Lawyer / Partner / Advocate
  if (['lawyer', 'partner', 'associate', 'advocate', 'attorney'].some(r => roleLower.includes(r))) {
    const assignedUser = users[0];
    if (assignedUser) {
      return {
        signerName: assignedUser.name,
        signerEmail: assignedUser.email,
        signerRole: role,
        signerType: 'INTERNAL_USER',
        userId: assignedUser.id,
        signingOrder: order
      };
    }
  }

  // Otherwise (Owner, Lessor, Manager, Witness, Landlord, etc.) -> External
  return {
    signerName: '',
    signerEmail: '',
    signerRole: role,
    signerType: 'EXTERNAL',
    signingOrder: order
  };
}

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
  const [signers, setSigners] = useState<CreateSignerInput[]>([]);
  const [detectedRoles, setDetectedRoles] = useState<string[]>([]);
  const [isLoadingDoc, setIsLoadingDoc] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadDocAndDetectRoles() {
      setIsLoadingDoc(true);
      try {
        const doc = await dataRepository.getDocumentById(documentId);
        const roles = doc?.content ? extractRolesFromHtml(doc.content) : [];

        if (isMounted) {
          setDetectedRoles(roles);
          if (roles.length > 0) {
            const initial = roles.map((role, idx) => buildSignerForRole(role, idx + 1, client, users));
            setSigners(initial);
          } else {
            // Default setup: Lawyer + Client + Witness
            const defaultList: CreateSignerInput[] = [
              buildSignerForRole('Lawyer', 1, client, users),
              buildSignerForRole('Client', 2, client, users),
              buildSignerForRole('Witness', 3, client, users)
            ];
            setSigners(defaultList);
          }
        }
      } catch {
        if (isMounted) {
          setSigners([
            buildSignerForRole('Lawyer', 1, client, users),
            buildSignerForRole('Client', 2, client, users)
          ]);
        }
      } finally {
        if (isMounted) setIsLoadingDoc(false);
      }
    }
    loadDocAndDetectRoles();
    return () => { isMounted = false; };
  }, [documentId, client, users]);

  const addSignerWithRole = (roleName: string) => {
    setSigners((prev) => [
      ...prev,
      buildSignerForRole(roleName, prev.length + 1, client, users)
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
      const user = users[0];
      if (user) {
        updates.signerName = user.name;
        updates.signerEmail = user.email;
        updates.signerRole = user.title || 'Lawyer';
        updates.userId = user.id;
      }
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
    if (signers.length === 0) {
      showToast('Please add at least one signer.', 'warning');
      return;
    }

    // Validation
    for (let i = 0; i < signers.length; i++) {
      const s = signers[i];
      if (!s.signerName.trim()) {
        showToast(`Signer ${i + 1} (${s.signerRole}): Name is required.`, 'error');
        return;
      }
      if (!s.signerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.signerEmail)) {
        showToast(`Signer ${i + 1} (${s.signerRole}): Valid email address is required.`, 'error');
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
    background: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px'
  };

  const modalStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: '18px',
    width: '100%',
    maxWidth: '720px',
    maxHeight: '92vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 70px rgba(0,0,0,0.35)'
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
                <span style={{ fontSize: '22px' }}>✍️</span>
                <h2 style={{ margin: 0, color: '#fff', fontSize: '19px', fontWeight: 700 }}>
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
                padding: '6px 12px',
                fontSize: '16px'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Dynamic detected roles bar */}
        <div style={{
          background: '#eff6ff',
          borderBottom: '1px solid #bfdbfe',
          padding: '12px 28px',
          flexShrink: 0
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
            📋 Detected Agreement Roles ({detectedRoles.length > 0 ? detectedRoles.length : 'Standard Legal'})
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {(detectedRoles.length > 0 ? detectedRoles : ['Owner', 'Tenant', 'Manager', 'Lawyer', 'Witness']).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => addSignerWithRole(role)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  border: '1px solid #93c5fd',
                  background: '#fff',
                  color: '#1d4ed8',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title={`Add ${role} signer to process`}
              >
                <span>+</span> <span>{role}</span>
              </button>
            ))}
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#3b82f6' }}>
            Signers are executed sequentially (1 → 2 → 3). Next signer is notified only after previous one signs.
          </p>
        </div>

        {/* Signers list */}
        <div style={{ overflowY: 'auto', padding: '24px 28px', flex: 1 }}>
          {isLoadingDoc ? (
            <div style={{ padding: '40px', color: '#64748b', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
              <p style={{ margin: 0, fontSize: '14px' }}>Analyzing document structure and signature blocks...</p>
            </div>
          ) : (
            signers.map((signer, index) => (
              <div
                key={index}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
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
                  padding: '3px 12px',
                  borderRadius: '20px',
                  boxShadow: '0 2px 6px rgba(99,102,241,0.3)'
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
                      {[
                        { type: 'EXTERNAL' as SignerType, label: '🌐 External Party (Owner / Manager / Witness)' },
                        { type: 'EXISTING_CLIENT' as SignerType, label: '🤝 Client' },
                        { type: 'INTERNAL_USER' as SignerType, label: '👤 Internal (Lawyer / Partner)' }
                      ].map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => handleTypeChange(index, item.type)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid',
                            borderColor: signer.signerType === item.type ? '#6366f1' : '#cbd5e1',
                            background: signer.signerType === item.type ? '#eff6ff' : '#fff',
                            color: signer.signerType === item.type ? '#4f46e5' : '#475569',
                            fontSize: '12px',
                            fontWeight: signer.signerType === item.type ? 600 : 400,
                            cursor: 'pointer'
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* If Internal User: user picker */}
                  {signer.signerType === 'INTERNAL_USER' && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Select Organization User *
                      </label>
                      <select
                        value={signer.userId || ''}
                        onChange={(e) => handleUserSelect(index, e.target.value)}
                        style={inputStyle}
                      >
                        <option value="">— Select a lawyer/user —</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>{u.name} ({u.title || u.role}) — {u.email}</option>
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
                      placeholder="e.g. Ramesh Gowda"
                      style={inputStyle}
                      readOnly={signer.signerType === 'INTERNAL_USER' && !!signer.userId}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label style={labelStyle}>Signer Email *</label>
                    <input
                      type="email"
                      value={signer.signerEmail}
                      onChange={(e) => updateSigner(index, { signerEmail: e.target.value })}
                      placeholder="e.g. ramesh@gmail.com"
                      style={inputStyle}
                      readOnly={signer.signerType === 'INTERNAL_USER' && !!signer.userId}
                    />
                  </div>

                  {/* Role */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Role / Capacity in Agreement *</label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {COMMON_ROLES.map((r) => (
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
                            fontWeight: signer.signerRole === r ? 600 : 400,
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
                      placeholder="Or type custom role (e.g. Property Owner, Building Manager...)"
                      style={{ ...inputStyle, fontSize: '13px' }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Add Signer Button */}
          {!isLoadingDoc && (
            <button
              type="button"
              onClick={() => addSignerWithRole('Witness')}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px dashed #cbd5e1',
                borderRadius: '12px',
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
          )}
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
            disabled={isSubmitting || isLoadingDoc}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              background: isSubmitting || isLoadingDoc
                ? '#c7d2fe'
                : 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#fff',
              cursor: isSubmitting || isLoadingDoc ? 'not-allowed' : 'pointer',
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
  border: '1px solid #cbd5e1',
  fontSize: '14px',
  color: '#1e293b',
  background: '#fff',
  boxSizing: 'border-box'
};
