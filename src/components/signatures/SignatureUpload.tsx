import React, { useRef, useState } from 'react';

interface SignatureUploadProps {
  onSignatureChange: (dataUrl: string | null) => void;
}

export const SignatureUpload: React.FC<SignatureUploadProps> = ({ onSignatureChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, SVG).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('File too large. Please upload an image smaller than 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
      onSignatureChange(result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clear = () => {
    setPreview(null);
    onSignatureChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      {!preview ? (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          style={{
            border: '2px dashed #cbd5e1',
            borderRadius: '8px',
            padding: '32px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: '#f8fafc',
            transition: 'border-color 0.2s, background 0.2s'
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = '#6366f1';
            (e.currentTarget as HTMLDivElement).style.background = '#f0f0ff';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = '#cbd5e1';
            (e.currentTarget as HTMLDivElement).style.background = '#f8fafc';
          }}
        >
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📁</div>
          <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
            Click or drag to upload your signature
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>PNG, JPG, or SVG · Max 2 MB</p>
        </div>
      ) : (
        <div style={{ border: '2px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#fff' }}>
          <img
            src={preview}
            alt="Uploaded signature"
            style={{ maxHeight: '120px', maxWidth: '100%', display: 'block', margin: '0 auto' }}
          />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleInput}
      />
      {error && (
        <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#dc2626' }}>{error}</p>
      )}
      {preview && (
        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#22c55e' }}>✓ Signature uploaded</span>
          <button
            type="button"
            onClick={clear}
            style={{
              background: 'none',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '12px',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
};
