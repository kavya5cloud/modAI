import { useEffect, useMemo, useState } from 'react'
import { FileText, Trash2, Upload } from 'lucide-react'
import { deleteDocument, getFiles, uploadDocument } from '../lib/api'
import { getAuth } from '../lib/storage'
import type { UserAuth } from '../types'
import './pages.css'

type Visibility = 'open' | 'internal' | 'confidential'

type DocumentRow = {
  id: string
  filename: string
  content_type: string
  size_bytes: number
  status: 'pending' | 'processing' | 'ready' | 'failed'
  visibility: Visibility
  created_at: string
}

const VISIBILITY_CONFIG: Record<Visibility, { label: string; color: string; desc: string }> = {
  open:         { label: 'Open',         color: '#34d399', desc: 'All employees' },
  internal:     { label: 'Internal',     color: '#60a5fa', desc: 'Employees + VP' },
  confidential: { label: 'Confidential', color: '#f472b6', desc: 'VP only' },
}

const allowedExtensions = ['PDF', 'DOCX', 'TXT']

const bytesToLabel = (size: number) => {
  if (size < 1024) return `${size} B`
  const kb = size / 1024
  if (kb < 1024) return `${kb.toFixed(kb >= 10 ? 0 : 1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

const statusLabel: Record<DocumentRow['status'], string> = {
  pending: 'Pending',
  processing: 'Processing',
  ready: 'Ready',
  failed: 'Failed',
}

export function DocumentsPage() {
  const auth = getAuth() as UserAuth | null
  const userRole = auth?.role ?? 'employee'
  const canUpload = userRole === 'admin' || userRole === 'vp'

  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadVisibility, setUploadVisibility] = useState<Visibility>('open')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const documentCount = documents.length
  const uploadedCount = useMemo(
    () => documents.filter((document) => document.status === 'pending' || document.status === 'ready').length,
    [documents],
  )

  useEffect(() => {
    void (async () => {
      try {
        const response = await getFiles()
        setDocuments(response.files as DocumentRow[])
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Failed to load documents')
        setDocuments([])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const loadDocuments = async () => {
    setLoading(true)
    try {
      const response = await getFiles()
      setDocuments(response.files as DocumentRow[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load documents')
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async () => {
    if (!selectedFiles.length || uploading) return
    setUploading(true)
    setError('')

    try {
      for (const file of selectedFiles) {
        await uploadDocument(file, uploadVisibility)
      }
      setSelectedFiles([])
      await loadDocuments()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (documentId: string) => {
    const confirmed = window.confirm('Delete this document? This cannot be undone.')
    if (!confirmed) return

    setError('')
    try {
      await deleteDocument(documentId)
      setDocuments((current) => current.filter((document) => document.id !== documentId))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Delete failed')
    }
  }

  return (
    <div className="list-page documents-page">
      <header className="page-head">
        <div>
          <h2>Documents</h2>
          <p className="muted">Upload PDF, DOCX, and TXT files. Metadata is stored in Neon.</p>
        </div>
        <div className="documents-stats">
          <div className="doc-stat">
            <strong>{documentCount}</strong>
            <span>Total</span>
          </div>
          <div className="doc-stat">
            <strong>{uploadedCount}</strong>
            <span>Uploaded</span>
          </div>
        </div>
      </header>

      {canUpload && (
        <section className="glass-card documents-upload">
          <div className="documents-upload-copy">
            <div className="documents-icon">
              <Upload size={18} />
            </div>
            <div>
              <h3>Upload a document</h3>
              <p className="muted">
                Supported formats are PDF, DOCX, and TXT. Set visibility to control who can access this document.
              </p>
            </div>
          </div>

          <div className="doc-visibility-selector">
            <span className="doc-visibility-label">Visibility</span>
            <div className="doc-visibility-options">
              {(Object.keys(VISIBILITY_CONFIG) as Visibility[]).map((v) => {
                const cfg = VISIBILITY_CONFIG[v]
                return (
                  <button
                    key={v}
                    type="button"
                    className={`doc-visibility-btn${uploadVisibility === v ? ' active' : ''}`}
                    style={uploadVisibility === v ? { borderColor: cfg.color, color: cfg.color, background: `${cfg.color}18` } : {}}
                    onClick={() => setUploadVisibility(v)}
                  >
                    <span className="doc-vis-dot" style={{ background: cfg.color }} />
                    {cfg.label}
                    <span className="doc-vis-who">{cfg.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="documents-upload-actions">
            <label className="documents-picker">
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
              />
              <span>Select files</span>
            </label>
            <button
              type="button"
              className="pill-button"
              onClick={handleUpload}
              disabled={!selectedFiles.length || uploading}
            >
              {uploading ? 'Uploading...' : 'Upload now'}
            </button>
          </div>

          <div className="documents-badges">
            {allowedExtensions.map((extension) => (
              <span key={extension} className="doc-chip">
                {extension}
              </span>
            ))}
            <span className="doc-chip subtle">{selectedFiles.length ? `${selectedFiles.length} selected` : 'No files selected'}</span>
          </div>
        </section>
      )}

      <section className="list-wrap glass-card">
        <div className="documents-list-head">
          <h3>Uploaded documents</h3>
          <p className="muted">Manage document metadata and remove files when they are no longer needed.</p>
        </div>

        {loading && <p className="muted">Loading documents...</p>}
        {!loading && !documents.length && <p className="muted">No documents uploaded yet.</p>}

        {documents.map((document) => (
          <article className="list-item document-item" key={document.id}>
            <div className="document-row">
              <div className="document-leading">
                <div className="documents-icon small">
                  <FileText size={16} />
                </div>
                <div>
                  <h3>{document.filename}</h3>
                  <p className="muted document-meta">
                    {document.content_type} • {bytesToLabel(Number(document.size_bytes))} •{' '}
                    {new Date(document.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="document-actions">
                {(() => {
                  const vis = document.visibility ?? 'open'
                  const cfg = VISIBILITY_CONFIG[vis]
                  return (
                    <span className="doc-visibility-tag" style={{ color: cfg.color, borderColor: `${cfg.color}44`, background: `${cfg.color}14` }}>
                      <span className="doc-vis-dot" style={{ background: cfg.color }} />
                      {cfg.label}
                    </span>
                  )
                })()}
                <span className={`status-pill status-${document.status}`}>{statusLabel[document.status]}</span>
                {canUpload && (
                  <button type="button" className="danger-button" onClick={() => handleDelete(document.id)}>
                    <Trash2 size={15} />
                    Delete
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>

      {error && <p className="error-note">{error}</p>}
    </div>
  )
}
