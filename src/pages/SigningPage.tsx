import React, { useState, useEffect, useCallback } from 'react';
import { SignatureCanvas } from '../components/signatures/SignatureCanvas';
import { SignatureUpload } from '../components/signatures/SignatureUpload';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

type SignatureMethodTab = 'DRAWN' | 'UPLOADED';

interface SignerInfo {
  signerName: string;
  signerRole: string;
  documentTitle: string;
  documentVersionNumber: number;
  documentContent: string;
  expiresAt: string;
  totalSigners: number;
  currentOrder: number;
  signers: Array<{ signerName: string; signerRole: string; status: string; signingOrder: number }>;
}

type PageState =
  | { phase: 'loading' }
  | { phase: 'invalid'; code: string; message: string }
  | { phase: 'ready'; token: string; info: SignerInfo }
  | { phase: 'signing' }
  | { phase: 'signed'; message: string }
  | { phase: 'declined' }
  | { phase: 'error'; message: string };

function extractTokenFromUrl(): string | null {
  const pathname = window.location.pathname;
  const parts = pathname.split('/');
  // URL pattern: /api/signatures/signer/:token
  const signerIdx = parts.indexOf('signer');
  if (signerIdx !== -1 && parts[signerIdx + 1]) {
    return parts[signerIdx + 1];
  }
  // Also check search params as fallback
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}

const SigningPage: React.FC = () => {
  const [state, setState] = useState<PageState>({ phase: 'loading' });
  const [activeTab, setActiveTab] = useState<SignatureMethodTab>('DRAWN');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = extractTokenFromUrl();

  // Load signer data
  useEffect(() => {
    if (!token) {
      setState({ phase: 'invalid', code: 'NO_TOKEN', message: 'No signing token found in this URL. Please use the link from your email.' });
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/signatures/signer/${token}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();

        if (!data.valid || data.status === 'error') {
          setState({ phase: 'invalid', code: data.code || 'INVALID', message: data.message || 'This signing link is invalid.' });
        } else {
          setState({ phase: 'ready', token, info: data.data });
        }
      } catch (err) {
        setState({ phase: 'error', message: 'Unable to load signing page. Please check your internet connection and try again.' });
      }
    })();
  }, [token]);

  const handleSign = useCallback(async () => {
    if (!signatureData) return;
    if (state.phase !== 'ready') return;

    setIsSubmitting(true);
    setState({ phase: 'signing' });
    try {
      const res = await fetch(`${API_BASE}/signatures/signer/${state.token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureType: activeTab,
          signatureData
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setState({ phase: 'signed', message: data.message || 'Your signature has been recorded successfully.' });
      } else {
        setState({ phase: 'error', message: data.message || 'Failed to submit signature.' });
      }
    } catch (err) {
      setState({ phase: 'error', message: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  }, [state, signatureData, activeTab]);

  const handleDecline = useCallback(async () => {
    if (state.phase !== 'ready') return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/signatures/signer/${state.token}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ declineReason: declineReason.trim() || 'Not specified' })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setState({ phase: 'declined' });
      } else {
        setState({ phase: 'error', message: data.message || 'Failed to record decline.' });
      }
    } catch {
      setState({ phase: 'error', message: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  }, [state, declineReason]);

  // ─── Render states ────────────────────────────────────────────────────────

  if (state.phase === 'loading') {
    return <PageShell><LoadingScreen /></PageShell>;
  }

  if (state.phase === 'invalid' || state.phase === 'error') {
    const msg = state.phase === 'invalid' ? state.message : (state as any).message;
    const code = state.phase === 'invalid' ? state.code : 'ERROR';
    return <PageShell><StatusScreen code={code} message={msg} /></PageShell>;
  }

  if (state.phase === 'signing') {
    return <PageShell><LoadingScreen message="Submitting your signature…" /></PageShell>;
  }

  if (state.phase === 'signed') {
    return (
      <PageShell>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '40px 32px' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '22px', color: '#1e293b', fontWeight: 700 }}>
              Signature Confirmed!
            </h2>
            <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '14px', lineHeight: 1.6 }}>
              {(state as any).message}
            </p>
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#166534'
            }}>
              📎 You will receive a copy of the fully-executed agreement by email once all signers have completed the process.
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>You may now close this window.</p>
          </div>
        </div>
      </PageShell>
    );
  }

  if (state.phase === 'declined') {
    return (
      <PageShell>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '40px 32px' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>📝</div>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '22px', color: '#1e293b', fontWeight: 700 }}>
              Decline Recorded
            </h2>
            <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '14px', lineHeight: 1.6 }}>
              Your decision has been noted. The assigning lawyer has been notified.
            </p>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>You may now close this window.</p>
          </div>
        </div>
      </PageShell>
    );
  }

  // Ready phase
  const { info } = state as { phase: 'ready'; token: string; info: SignerInfo };
  const expiryDate = new Date(info.expiresAt).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <PageShell>
      <div style={{ maxWidth: '720px', margin: '0 auto', width: '100%' }}>

        {/* Header card */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          borderRadius: '16px',
          padding: '28px 32px',
          marginBottom: '20px',
          color: '#fff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(99,102,241,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              ✍️
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8', letterSpacing: '0.5px' }}>SIGNATURE REQUEST</div>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>LexDraft Legal Workflow</div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Dear {info.signerName},</div>
            <div style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.5 }}>
              You are requested to digitally sign <strong style={{ color: '#fff' }}>"{info.documentTitle}"</strong>{' '}
              (v{info.documentVersionNumber}) in your capacity as <strong style={{ color: '#fff' }}>{info.signerRole}</strong>.
              You are signer <strong style={{ color: '#fff' }}>{info.currentOrder}</strong> of <strong style={{ color: '#fff' }}>{info.totalSigners}</strong>.
            </div>
          </div>

          <div style={{
            marginTop: '14px',
            padding: '10px 14px',
            background: '#fffbeb',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#92400e'
          }}>
            ⏰ This link expires on <strong>{expiryDate}</strong>. Do not share this link.
          </div>
        </div>

        {/* Signers progress */}
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '16px 20px',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
            Signing Order
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {info.signers.map((s, i) => {
              const isCurrent = s.signingOrder === info.currentOrder;
              const isSigned = s.status === 'SIGNED';
              return (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: isCurrent ? '#eff6ff' : isSigned ? '#f0fdf4' : '#f8fafc',
                  border: '1px solid',
                  borderColor: isCurrent ? '#bfdbfe' : isSigned ? '#bbf7d0' : '#e2e8f0'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: isSigned ? '#22c55e' : isCurrent ? '#3b82f6' : '#e2e8f0',
                    color: isSigned || isCurrent ? '#fff' : '#94a3b8',
                    fontSize: '10px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isSigned ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: isCurrent ? 600 : 400 }}>
                    {s.signerName}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>— {s.signerRole}</span>
                  {isCurrent && (
                    <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 700, color: '#3b82f6' }}>
                      ← You
                    </span>
                  )}
                  {isSigned && (
                    <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 600, color: '#22c55e' }}>
                      ✓ Signed
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Document preview */}
        <details style={{
          background: '#fff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          marginBottom: '20px',
          overflow: 'hidden'
        }}>
          <summary style={{
            padding: '14px 20px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            color: '#1e293b',
            listStyle: 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            📄 Preview Document Before Signing
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Click to expand</span>
          </summary>
          <div style={{
            borderTop: '1px solid #e2e8f0',
            padding: '20px',
            maxHeight: '400px',
            overflowY: 'auto',
            fontSize: '13px',
            color: '#1e293b',
            lineHeight: 1.6
          }}>
            <div dangerouslySetInnerHTML={{ __html: info.documentContent }} />
          </div>
        </details>

        {/* Signature panel */}
        {!showDeclineForm ? (
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            marginBottom: '20px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
          }}>
            <div style={{
              padding: '20px 24px 0',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              gap: '0'
            }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '16px', flex: 1 }}>
                Choose Signature Method
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
              {(['DRAWN', 'UPLOADED'] as SignatureMethodTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => { setActiveTab(tab); setSignatureData(null); }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: 'none',
                    background: 'none',
                    borderBottom: `2px solid ${activeTab === tab ? '#6366f1' : 'transparent'}`,
                    color: activeTab === tab ? '#6366f1' : '#64748b',
                    fontWeight: activeTab === tab ? 700 : 400,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {tab === 'DRAWN' ? '✏️ Draw Signature' : '📁 Upload Image'}
                </button>
              ))}
            </div>

            <div style={{ padding: '24px' }}>
              {activeTab === 'DRAWN' ? (
                <SignatureCanvas onSignatureChange={setSignatureData} width={600} height={150} />
              ) : (
                <SignatureUpload onSignatureChange={setSignatureData} />
              )}

              {/* Legal notice */}
              <div style={{
                marginTop: '16px',
                padding: '12px 14px',
                background: '#f8fafc',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#64748b',
                lineHeight: 1.5
              }}>
                🔒 By clicking "Sign Document", you agree that this electronic signature is the legal equivalent of your handwritten signature on this agreement.
                Your IP address, device information, and timestamp will be recorded as part of the audit trail.
              </div>

              <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowDeclineForm(true)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid #fecaca',
                    borderRadius: '10px',
                    background: '#fff',
                    color: '#dc2626',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  ✕ Decline to Sign
                </button>
                <button
                  type="button"
                  onClick={handleSign}
                  disabled={!signatureData || isSubmitting}
                  style={{
                    flex: 2,
                    padding: '12px',
                    border: 'none',
                    borderRadius: '10px',
                    background: !signatureData
                      ? '#e2e8f0'
                      : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: !signatureData ? '#94a3b8' : '#fff',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: !signatureData ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  ✍️ Sign Document
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Decline form */
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            border: '1px solid #fecaca',
            padding: '24px',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#dc2626', fontSize: '16px', fontWeight: 700 }}>
              ⚠️ Decline to Sign
            </h3>
            <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '13px' }}>
              Are you sure you want to decline? This will cancel the entire signing process and notify the responsible lawyer.
            </p>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
              Reason for declining (optional)
            </label>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. I require a clause modification before signing..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '13px',
                resize: 'vertical',
                boxSizing: 'border-box',
                marginBottom: '16px',
                color: '#1e293b'
              }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowDeclineForm(false)}
                style={{
                  flex: 1,
                  padding: '11px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  background: '#fff',
                  color: '#64748b',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ← Go Back
              </button>
              <button
                type="button"
                onClick={handleDecline}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  padding: '11px',
                  border: 'none',
                  borderRadius: '8px',
                  background: '#dc2626',
                  color: '#fff',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 700
                }}
              >
                {isSubmitting ? 'Declining…' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', marginTop: '20px' }}>
          LexDraft Legal Workflow · Confidential Document Signing Portal<br />
          This page is secured by a 256-bit cryptographic token. Do not share this URL.
        </p>
      </div>
    </PageShell>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const PageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
    padding: '24px 16px',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  }}>
    {/* Logo bar */}
    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 800,
          fontSize: '14px'
        }}>
          LD
        </div>
        <span style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', letterSpacing: '-0.3px' }}>
          LexDraft
        </span>
      </div>
    </div>
    {children}
  </div>
);

const LoadingScreen: React.FC<{ message?: string }> = ({ message = 'Loading signing page…' }) => (
  <div style={cardStyle}>
    <div style={{ textAlign: 'center', padding: '60px 32px' }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        border: '3px solid #e2e8f0',
        borderTopColor: '#6366f1',
        margin: '0 auto 16px',
        animation: 'spin 1s linear infinite'
      }} />
      <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>{message}</p>
    </div>
  </div>
);

const StatusScreen: React.FC<{ code: string; message: string }> = ({ code, message }) => {
  const icons: Record<string, string> = {
    INVALID: '🔗', EXPIRED: '⏰', ALREADY_SIGNED: '✅', NOT_YOUR_TURN: '⏳',
    CLOSED: '🔒', NO_TOKEN: '🔗', ERROR: '⚠️', UNAVAILABLE: '🔒'
  };
  return (
    <div style={{ ...cardStyle, maxWidth: '480px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', padding: '40px 32px' }}>
        <div style={{ fontSize: '52px', marginBottom: '16px' }}>{icons[code] || '⚠️'}</div>
        <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', color: '#1e293b', fontWeight: 700 }}>
          {code === 'ALREADY_SIGNED' ? 'Already Signed' : code === 'EXPIRED' ? 'Link Expired' : code === 'NOT_YOUR_TURN' ? 'Not Yet' : 'Link Unavailable'}
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px', lineHeight: 1.6 }}>{message}</p>
      </div>
    </div>
  );
};

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '16px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
  overflow: 'hidden'
};

export default SigningPage;
