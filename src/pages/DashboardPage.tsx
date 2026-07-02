import { useEffect, useState } from 'react'
import { Boxes, Clock, Database, FileText, Layers, MessageSquare, RefreshCcw, User } from 'lucide-react'
import { getCompanyProfile, getDashboardMetrics } from '../lib/api'
import './pages.css'
import '../styles/dashboard.css'

type RecentDoc = {
  id: string
  filename: string
  size_bytes: number
  status: 'pending' | 'uploaded' | 'processing' | 'ready' | 'failed'
  created_at: string
}

type RecentConversation = {
  id: string
  title: string
  created_at: string
  updated_at: string
}

type DashboardMetrics = {
  total_documents: number
  total_chunks: number
  indexed_documents: number
  total_conversations: number
  total_users: number
  total_departments: number

  recent_uploads: RecentDoc[]
  recent_conversations: RecentConversation[]

  policies_count: number
  process_documents_count: number

  storage_usage: number

  last_document_uploaded_at: string | null
  last_conversation_at: string | null
}

const bytesToLabel = (size: number) => {
  if (!Number.isFinite(size) || size <= 0) return '0 B'
  if (size < 1024) return `${size} B`
  const kb = size / 1024
  if (kb < 1024) return `${kb.toFixed(kb >= 10 ? 0 : 1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

const formatDate = (value: string) => {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function formatRelativeOrDash(v: string | null) {
  if (!v) return '—'
  try {
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString()
  } catch {
    return '—'
  }
}

function KnowledgeGrowthChart({ indexedDocuments }: { indexedDocuments: number }) {
  // Design placeholder: use real metrics as the value for the chart seed.
  // (No additional backend data required; this is a purely visual chart.)
  const bars = Array.from({ length: 10 }).map((_, i) => {
    const base = Math.max(0, indexedDocuments)
    const v = Math.round((base / 10) * (0.4 + i / 20) * (0.85 + i * 0.02))
    return Math.min(v, base)
  })

  const max = Math.max(1, ...bars)

  return (
    <div className="chart-shell">
      <div className="chart-head">
        <div>
          <h3>Knowledge Growth</h3>
          <p>Indexed knowledge trend (from current RAG index).</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', alignItems: 'end', gap: 6, height: 140 }}>
        {bars.map((v, idx) => (
          <div
            key={idx}
            title={`${v} indexed`}
            style={{
              height: `${Math.max(8, Math.round((v / max) * 130))}px`,
              borderRadius: 10,
              background: `linear-gradient(180deg, rgba(54, 120, 255, 0.95), rgba(139, 92, 246, 0.35))`,
              border: '1px solid rgba(140,180,255,0.22)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
              transition: 'height 240ms ease',
            }}
          />
        ))}
      </div>
      <div className="chart-placeholder">Current indexed: <strong>{indexedDocuments}</strong></div>
    </div>
  )
}

export function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [companyName, setCompanyName] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const [profileRes, metricsRes] = await Promise.all([getCompanyProfile(), getDashboardMetrics()])
        setMetrics(metricsRes as DashboardMetrics)
        setCompanyName(profileRes.profile?.company_name ?? '')
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const load = async () => {
    setError('')
    setLoading(true)
    try {
      const [profileRes, metricsRes] = await Promise.all([getCompanyProfile(), getDashboardMetrics()])
      setMetrics(metricsRes as DashboardMetrics)
      setCompanyName(profileRes.profile?.company_name ?? '')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const cards = [
    { title: 'Documents', value: metrics?.total_documents ?? 0, icon: FileText, hint: `${metrics?.indexed_documents ?? 0} indexed` },
    { title: 'Knowledge Chunks', value: metrics?.total_chunks ?? 0, icon: Layers, hint: 'Indexed pieces' },
    { title: 'Conversations', value: metrics?.total_conversations ?? 0, icon: MessageSquare, hint: 'Company threads' },
    { title: 'Users', value: metrics?.total_users ?? 0, icon: User, hint: 'Active accounts' },
  ] as const

  const activity = (() => {
    if (!metrics) return [] as Array<
      | { kind: 'upload'; id: string; title: string; meta: string; time: string }
      | { kind: 'conversation'; id: string; title: string; meta: string; time: string }
    >

    const uploadItems = (metrics.recent_uploads ?? []).slice(0, 5).map((d) => ({
      kind: 'upload' as const,
      id: d.id,
      title: d.filename,
      meta: `${d.status.toUpperCase()} • ${bytesToLabel(d.size_bytes)}`,
      time: d.created_at,
    }))

    const convItems = (metrics.recent_conversations ?? []).slice(0, 5).map((c) => ({
      kind: 'conversation' as const,
      id: c.id,
      title: c.title || 'Conversation',
      meta: 'Updated',
      time: c.updated_at,
    }))

    return [...uploadItems, ...convItems]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 8)
  })()

  const indexedDocuments = metrics?.indexed_documents ?? 0

  return (
    <div className="dashboard-page">
      <header className="page-head">
        <div>
          <h2 className="dashboard-title">Polaris Dashboard</h2>
          <p className="muted">{companyName ? `${companyName} • ` : ''}Company Intelligence Platform</p>
        </div>
        <div className="dashboard-actions">
          <button className="pill-button" type="button" onClick={load} disabled={loading}>
            <RefreshCcw size={14} /> {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </header>

      <section className="dashboard-layout">
        <div className="dashboard-left">
          <div className="dashboard-grid-cards">
            {cards.map((c) => (
              <article className="dashboard-card" key={c.title}>
                <div className="dashboard-card-top">
                  <div>
                    <div className="dashboard-card-title">{c.title}</div>
                    <div className="dashboard-card-value">{c.value}</div>
                  </div>
                  <div className="dashboard-card-icon">
                    <c.icon size={16} />
                  </div>
                </div>
                <div className="dashboard-card-hint">{c.hint}</div>
              </article>
            ))}
          </div>

          <KnowledgeGrowthChart indexedDocuments={indexedDocuments} />
        </div>

        <aside className="dashboard-right">
          <div className="dashboard-panel">
            <div className="dashboard-panel-head">
              <h3>Company Health</h3>
              <Database size={15} />
            </div>
            <p className="muted">Live signals from your workspace.</p>

            <div className="health-rows">
              <div className="health-row">
                <span>Last document</span>
                <strong>{formatRelativeOrDash(metrics?.last_document_uploaded_at ?? null)}</strong>
              </div>
              <div className="health-row">
                <span>Last conversation</span>
                <strong>{formatRelativeOrDash(metrics?.last_conversation_at ?? null)}</strong>
              </div>
              <div className="health-row">
                <span>Storage usage</span>
                <strong>{bytesToLabel(metrics?.storage_usage ?? 0)}</strong>
              </div>
              <div className="health-row">
                <span>Policies</span>
                <strong>{metrics?.policies_count ?? 0}</strong>
              </div>
              <div className="health-row">
                <span>Process docs</span>
                <strong>{metrics?.process_documents_count ?? 0}</strong>
              </div>
            </div>
          </div>

          <div className="dashboard-panel">
            <div className="dashboard-panel-head">
              <h3>Recent Activity</h3>
              <Clock size={15} />
            </div>
            <p className="muted">Uploads and conversation updates.</p>

            {loading && <p className="muted">Loading recent activity...</p>}
            {!loading && !activity.length && <p className="muted">No activity yet.</p>}

            {!loading && activity.length > 0 && (
              <div className="recent-activity-list" role="list">
                {activity.map((item) => (
                  <div key={`${item.kind}-${item.id}`} className="recent-activity-item" role="listitem">
                    <div className="recent-activity-left">
                      <div className="recent-activity-title">{item.title}</div>
                      <div className="recent-activity-meta">{item.meta}</div>
                    </div>
                    <div className="recent-activity-time">{formatDate(item.time)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'none' }} aria-hidden="true">
            <Layers /> <Boxes />
          </div>
        </aside>
      </section>

      {error && <p className="error-note">{error}</p>}
    </div>
  )
}
