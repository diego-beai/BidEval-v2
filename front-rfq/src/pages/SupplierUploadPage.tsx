import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { API_CONFIG } from '../config/constants';
import './SupplierResponsePage.css';

interface TokenData {
  id: string;
  project_id: string;
  provider_name: string;
  token: string;
  expires_at: string;
  status: 'pending' | 'accessed' | 'uploaded' | 'expired';
  files_uploaded: number;
}

interface ProjectData {
  id: string;
  display_name: string;
}

type PageState = 'loading' | 'valid' | 'expired' | 'used' | 'invalid' | 'uploading' | 'submitted' | 'error';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      if (base64) resolve(base64);
      else reject(new Error('Failed to convert file'));
    };
    reader.onerror = reject;
  });
}

export function SupplierUploadPage() {
  const { token } = useParams<{ token: string }>();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    if (!token || !supabase) {
      setPageState('invalid');
      return;
    }

    try {
      const db = supabase as any;

      const { data: tokenResult, error: tokenError } = await db
        .from('supplier_upload_tokens')
        .select('*')
        .eq('token', token)
        .single();

      if (tokenError || !tokenResult) {
        setPageState('invalid');
        return;
      }

      const tokenInfo = tokenResult as unknown as TokenData;
      setTokenData(tokenInfo);

      if (new Date(tokenInfo.expires_at) < new Date()) {
        setPageState('expired');
        return;
      }

      if (tokenInfo.status === 'pending') {
        await db
          .from('supplier_upload_tokens')
          .update({ status: 'accessed', accessed_at: new Date().toISOString() })
          .eq('token', token);
      }

      const { data: projectResult } = await db
        .from('projects')
        .select('id, display_name')
        .eq('id', tokenInfo.project_id)
        .single();

      if (projectResult) {
        setProjectData(projectResult as ProjectData);
      }

      setPageState('valid');
    } catch (err) {
      console.error('Error loading data:', err);
      setErrorMessage('An unexpected error occurred');
      setPageState('error');
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const pdfFiles = files.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    setSelectedFiles(prev => [...prev, ...pdfFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const pdfFiles = files.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    setSelectedFiles(prev => [...prev, ...pdfFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!tokenData || !projectData || selectedFiles.length === 0) return;

    setPageState('uploading');
    setUploadProgress(0);
    setUploadedCount(0);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const base64Content = await fileToBase64(file);

        const payload = {
          project_id: tokenData.project_id,
          proveedor: tokenData.provider_name,
          proyecto: projectData.display_name,
          tipoEvaluacion: [],
          fileName: file.name,
          fileContent: base64Content,
          source: 'supplier_portal',
          upload_token: token,
        };

        const response = await fetch(API_CONFIG.N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Upload failed for ${file.name} (${response.status})`);
        }

        setUploadedCount(i + 1);
        setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
      }

      // Update token status
      if (supabase) {
        await (supabase as any)
          .from('supplier_upload_tokens')
          .update({
            status: 'uploaded',
            files_uploaded: selectedFiles.length,
            uploaded_at: new Date().toISOString(),
          })
          .eq('token', token);
      }

      setPageState('submitted');
    } catch (err) {
      console.error('Upload error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed');
      setPageState('error');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Loading
  if (pageState === 'loading') {
    return (
      <div className="supplier-page">
        <div className="supplier-container">
          <div className="supplier-loading">
            <div className="spinner-large" />
            <p>Loading upload portal...</p>
          </div>
        </div>
      </div>
    );
  }

  // Invalid
  if (pageState === 'invalid') {
    return (
      <div className="supplier-page">
        <div className="supplier-container">
          <div className="supplier-message error">
            <div className="message-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h2>Invalid Link</h2>
            <p>This upload link is not valid. Please check the link in your email or contact the evaluation team.</p>
          </div>
        </div>
      </div>
    );
  }

  // Expired
  if (pageState === 'expired') {
    return (
      <div className="supplier-page">
        <div className="supplier-container">
          <div className="supplier-message error">
            <div className="message-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h2>Link Expired</h2>
            <p>This upload link has expired. Please contact the evaluation team to request a new link.</p>
          </div>
        </div>
      </div>
    );
  }

  // Submitted
  if (pageState === 'submitted') {
    return (
      <div className="supplier-page">
        <div className="supplier-container">
          <div className="supplier-message success">
            <div className="message-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2>Upload Complete</h2>
            <p>Your proposal documents have been submitted successfully. The evaluation team will process them shortly.</p>
            <div className="success-detail">
              {uploadedCount} file{uploadedCount !== 1 ? 's' : ''} uploaded
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (pageState === 'error') {
    return (
      <div className="supplier-page">
        <div className="supplier-container">
          <div className="supplier-message error">
            <div className="message-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2>Error</h2>
            <p>{errorMessage || 'An unexpected error occurred. Please try again later.'}</p>
            <button
              onClick={() => { setPageState('valid'); setErrorMessage(''); }}
              style={{
                marginTop: 20, padding: '12px 32px', background: '#12b5b0', color: 'white',
                border: 'none', borderRadius: 10, fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Uploading
  if (pageState === 'uploading') {
    return (
      <div className="supplier-page">
        <div className="supplier-container">
          <div className="supplier-message info" style={{ minHeight: 300 }}>
            <div className="spinner-large" style={{ marginBottom: 24 }} />
            <h2>Uploading Documents...</h2>
            <p>Uploading {uploadedCount} of {selectedFiles.length} files</p>
            <div style={{ width: '100%', maxWidth: 400, marginTop: 24 }}>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
              <div style={{ textAlign: 'center', marginTop: 8, fontSize: '0.9rem', color: '#64748b' }}>
                {uploadProgress}%
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Valid - Upload Form
  return (
    <div className="supplier-page">
      <div className="supplier-container">
        {/* Header */}
        <header className="supplier-header">
          <div className="header-logo">
            <span className="logo-bid">Bid</span>
            <span className="logo-eval">Eval</span>
          </div>
          <h1>Proposal Upload Portal</h1>
          <p className="project-name">Project: {projectData?.display_name || 'Evaluation'}</p>
          <div className="provider-badge">
            Uploading as: <strong>{tokenData?.provider_name}</strong>
          </div>
        </header>

        {/* Instructions */}
        <div className="instructions">
          <h3>Instructions</h3>
          <p>
            Please upload your proposal documents in PDF format. You can upload multiple files
            at once (technical evaluation, economic evaluation, deliverables, etc.).
            All files will be associated with your provider profile and processed by the evaluation team.
          </p>
        </div>

        {/* Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: 'white',
            border: '2px dashed #cbd5e1',
            borderRadius: 16,
            padding: '48px 32px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: 24,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLDivElement).style.borderColor = '#12b5b0';
            (e.currentTarget as HTMLDivElement).style.background = '#f0fdfa';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLDivElement).style.borderColor = '#cbd5e1';
            (e.currentTarget as HTMLDivElement).style.background = 'white';
          }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ marginBottom: 16 }}>
            <path d="M21.2 15c.7-1.2 1-2.5.7-3.9-.6-2-2.4-3.5-4.4-3.5h-1.2c-.7-3-3.2-5.2-6.2-5.6-3-.3-5.9 1.3-7.3 4-1.2 2.5-1 6.5.5 8.8m8.7-1.6V21" />
            <path d="M16 16l-4-4-4 4" />
          </svg>
          <p style={{ margin: 0, fontSize: '1rem', color: '#1e293b', fontWeight: 600 }}>
            Drop PDF files here or click to browse
          </p>
          <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
            PDF files only, max 50MB each
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {/* File List */}
        {selectedFiles.length > 0 && (
          <div style={{
            background: 'white', borderRadius: 12, padding: 20,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 24,
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
              Selected Files ({selectedFiles.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedFiles.map((file, i) => (
                <div key={`${file.name}-${i}`} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', background: '#f8fafc', borderRadius: 10,
                  border: '1px solid #e2e8f0',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    style={{
                      background: 'transparent', border: 'none', color: '#94a3b8',
                      cursor: 'pointer', padding: 4,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="submit-section">
          <button
            className="submit-button"
            onClick={handleUpload}
            disabled={selectedFiles.length === 0}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.2 15c.7-1.2 1-2.5.7-3.9-.6-2-2.4-3.5-4.4-3.5h-1.2c-.7-3-3.2-5.2-6.2-5.6-3-.3-5.9 1.3-7.3 4-1.2 2.5-1 6.5.5 8.8m8.7-1.6V21" />
              <path d="M16 16l-4-4-4 4" />
            </svg>
            Upload {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}
          </button>
          {selectedFiles.length === 0 && (
            <p className="submit-warning">Select at least one PDF file to upload</p>
          )}
        </div>

        {/* Footer */}
        <footer className="supplier-footer">
          <p>Powered by BidEval - Technical Evaluation Platform</p>
          <p className="footer-note">
            Link expires: {tokenData?.expires_at ? new Date(tokenData.expires_at).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric'
            }) : 'N/A'}
          </p>
        </footer>
      </div>
    </div>
  );
}
