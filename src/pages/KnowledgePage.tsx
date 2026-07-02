import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, ExternalLink, Search, Trash2, RefreshCw } from 'lucide-react'
import { deleteDocument, getKnowledgeCenter, type KnowledgeDocument } from '../lib/api'
import './pages.css'
import './knowledge.css'

type KnowledgeSummary = {
  totalDocuments: number
  totalChunks: number
  indexedDocuments: number
  lastUpload: string | null
}

type Chunk = {
  id: string
  chunk_index: number
  chunk_text: string
  token_count: number
  page_number: number | null
}

const fileTypeLabel = (contentType: string) => {
  if (contentType.includes('pdf')) return 'PDF'
  if (contentType.includes('wordprocessingml')) return 'DOCX'
  if (contentType.includes('text/plain')) return 'TXT'
  return contentType.split('/').pop()?.toUpperCase() ?? 'FILE'
}

const formatDate = (value: string | null) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const fileTypeColor = (ct: string) => {
  if (ct.includes('pdf')) return { bg: 'rgba(239,68,68,0.12)', color: '#f87171' }
  if (ct.includes('wordprocessingml')) return { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa' }
  return { bg: 'rgba(52,211,153,0.12)', color: '#34d399' }
}

export function KnowledgePage() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([])
  const [summary, setSummary] = useState<KnowledgeSummary>({
    totalDocuments: 0, totalChunks: 0, indexedDocuments: 0, lastUpload: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [chunks, setChunks] = useState<Record<string, Chunk[]>>({})
  const [loadingChunks, setLoadingChunks] = useState<string | null>(null)

  const loadKnowledge = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await getKnowledgeCenter()
      setDocuments(response.documents)
      setSummary(response.summary)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load knowledge center')
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        const response = await getKnowledgeCenter()
        setDocuments(response.documents)
        setSummary(response.summary)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Failed to load knowledge center')
        setDocuments([])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filteredDocuments = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return documents
    return documents.filter((d) => d.filename.toLowerCase().includes(q))
  }, [documents, search])

  const handleDelete = async (doc: KnowledgeDocument) => {
    if (!confirm(`Delete "${doc.filename}"? This cannot be undone.`)) return
    setDeletingId(doc.id)
    try {
      await deleteDocument(doc.id)
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
      if (expandedId === doc.id) setExpandedId(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  const toggleExpand = async (doc: KnowledgeDocument) => {
    if (expandedId === doc.id) { setExpandedId(null); return }
    setExpandedId(doc.id)
    if (chunks[doc.id]) return   // already loaded

    if (doc.chunk_count === 0) return   // nothing to load

    setLoadingChunks(doc.id)
    try {
      const BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_BACKEND_BASE_URL ?? '')
      const res = await fetch(`${BASE}/api/knowledge/${doc.id}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load chunks')
      const data = await res.json() as { chunks: Chunk[] }
      setChunks((prev) => ({ ...prev, [doc.id]: data.chunks }))
    } catch { /* show empty */ }
    finally { setLoadingChunks(null) }
  }

  return (
    <div className="knowledge-page">
      {/* Header */}
      <header className="page-head knowledge-head">
        <div>
          <h2>Knowledge Center</h2>
          <p className="muted">Documents your AI intern has read and indexed.</p>
        </div>
        <div className="knowledge-head-right">
          <label className="knowledge-search glass-card">
            <Search size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents…"
              aria-label="Search"
            />
          </label>
          <button className="knowledge-refresh-btn" onClick={loadKnowledge} title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="knowledge-stats">
        {[
          { label: 'Documents', value: summary.totalDocuments },
          { label: 'Total chunks', value: summary.totalChunks },
          { label: 'Indexed', value: summary.indexedDocuments },
          { label: 'Last upload', value: formatDate(summary.lastUpload), small: true },
        ].map((s) => (
          <div key={s.label} className="stat-card glass-card">
            <span>{s.label}</span>
            <strong style={s.small ? { fontSize: '1rem' } : {}}>{s.value}</strong>
          </div>
        ))}
      </div>

      {/* Document list */}
      <div className="kn-list glass-card">
        <div className="kn-list-head">
          <h3>Indexed documents</h3>
          <p className="muted">Click a row to preview its chunks.</p>
        </div>

        {loading && (
          <div className="kn-empty"><div className="kn-spinner" /><span>Loading…</span></div>
        )}
        {!loading && filteredDocuments.length === 0 && (
          <div className="kn-empty">
            <span className="kn-empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
            </span>
            <p>No documents yet. Upload files in the <a href="/dashboard/documents">Documents</a> page.</p>
          </div>
        )}

        {filteredDocuments.map((doc) => {
          const isExpanded = expandedId === doc.id
          const ftColor = fileTypeColor(doc.content_type)
          const docChunks = chunks[doc.id] ?? []
          const isLoadingChunks = loadingChunks === doc.id

          return (
            <div key={doc.id} className="kn-doc">
              {/* Document row */}
              <div
                className={`kn-doc-row${isExpanded ? ' kn-doc-row-open' : ''}`}
                onClick={() => toggleExpand(doc)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && toggleExpand(doc)}
              >
                <div className="kn-doc-expand-icon">
                  {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </div>

                <div className="kn-doc-type-badge" style={{ background: ftColor.bg, color: ftColor.color }}>
                  {fileTypeLabel(doc.content_type)}
                </div>

                <div className="kn-doc-info">
                  <span className="kn-doc-name">{doc.filename}</span>
                  <span className="kn-doc-meta">{formatDate(doc.created_at)}</span>
                </div>

                <div className="kn-doc-right">
                  <span className={`kn-chunk-count${doc.chunk_count === 0 ? ' kn-chunk-zero' : ''}`}>
                    {doc.chunk_count === 0 ? 'Not indexed' : `${doc.chunk_count} chunks`}
                  </span>
                  <span className={`status-pill status-${doc.status}`}>{doc.status}</span>
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="kn-view-btn"
                    onClick={(e) => e.stopPropagation()}
                    title="View file"
                  >
                    <ExternalLink size={13} />
                  </a>
                  <button
                    className="danger-button kn-delete-btn"
                    onClick={(e) => { e.stopPropagation(); void handleDelete(doc) }}
                    disabled={deletingId === doc.id}
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Chunk preview panel */}
              {isExpanded && (
                <div className="kn-chunks-panel">
                  {isLoadingChunks && (
                    <div className="kn-chunks-loading"><div className="kn-spinner" /><span>Loading chunks…</span></div>
                  )}

                  {!isLoadingChunks && doc.chunk_count === 0 && (
                    <div className="kn-chunks-empty">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      <p>This document has no chunks. It may still be processing, or ingestion may have failed. Try re-uploading it.</p>
                    </div>
                  )}

                  {!isLoadingChunks && docChunks.length > 0 && (
                    <>
                      <div className="kn-chunks-meta">
                        Showing {docChunks.length} of {doc.chunk_count} chunks
                      </div>
                      <div className="kn-chunks-grid">
                        {docChunks.map((chunk) => (
                          <div key={chunk.id} className="kn-chunk-card">
                            <div className="kn-chunk-header">
                              <span className="kn-chunk-num">Chunk {chunk.chunk_index + 1}</span>
                              {chunk.page_number !== null && (
                                <span className="kn-chunk-page">p. {chunk.page_number}</span>
                              )}
                              <span className="kn-chunk-tokens">{chunk.token_count} tok</span>
                            </div>
                            <p className="kn-chunk-text">{chunk.chunk_text}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {error && <p className="error-note">{error}</p>}
    </div>
  )
}
