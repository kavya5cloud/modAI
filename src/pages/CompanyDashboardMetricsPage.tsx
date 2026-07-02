import { useEffect, useState } from 'react'
import {
  Building2,
  Clock,
  Database,
  FileText,
  Layers,
  MessageSquare,
  RefreshCcw,
  User,
  Boxes,
} from 'lucide-react'
import { getCompanyProfile, getDashboardMetrics } from '../lib/api'
import './pages.css'

type RecentDoc = {
  id: string
  filename: string
  size_bytes: number
  status: 'pending' | 'processing' | 'ready' | 'failed'
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

export function CompanyDashboardMetricsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [companyName, setCompanyName] = useState<string>('')

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
    {
      title: 'Documents',
      value: metrics?.total_documents ?? 0,
      icon: FileText,
      hint: `${metrics?.indexed_documents ?? 0} indexed`,
    },
    {
      title: 'Chunks',
      value: metrics?.total_chunks ?? 0,
      icon: Layers,
      hint: 'Indexed pieces',
    },
    {
      title: 'Conversations',
      value: metrics?.total_conversations ?? 0,
      icon: MessageSquare,
      hint: 'Company threads',
    },
    {
      title: 'Users',
      value: metrics?.total_users ?? 0,
      icon: User,
      hint: 'Active accounts',
    },
    {
      title: 'Departments',
      value: metrics?.total_departments ?? 0,
      icon: Boxes,
      hint: 'Configured teams',
    },
    {
      title: 'Knowledge Sources',
      value: metrics?.indexed_documents ?? 0,
      icon: Database,
      hint: 'RAG-ready docs',
    },
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

    return [...uploadItems, ...convItems].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8)
  })()

  return (
    <div className="company-dashboard list-page">
      <header className="page-head">
        <div>
          <h2 className="dashboard-title">Polaris Dashboard</h2>
          <p className="muted">
            {companyName ? (
              <>
                {companyName} • Company Intelligence Platform
              </>
            ) : (
              'Company Intelligence Platform'
            )}
          </p>
        </div>

        <div className="dashboard-actions">
          <button className="pill-button" type="button" onClick={load} disabled={loading}>
            <RefreshCcw size={14} /> {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </header>

      <section className="dashboard-cards">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <article className="stat-card glass-card" key={c.title}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem' }}>
                <div>
                  <span>{c.title}</span>
                  <strong>{c.value}</strong>
                </div>
                <div style={{ opacity: 0.95 }}>
                  <Icon size={20} />
                </div>
              </div>
              <span style={{ fontSize: '0.74rem', textTransform: 'none', letterSpacing: '0', color: 'var(--text-tertiary)' }}>
                {c.hint}
              </span>
            </article>
          )
        })}
      </section>

      <section className="glass-card dashboard-recent">
        <div className="documents-list-head" style={{ marginBottom: '0.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={14} /> Recent Activity
          </h3>
          <p className="muted">Recent uploads and the most updated conversations.</p>
        </div>

        {loading && <p className="muted">Loading recent activity...</p>}
        {!loading && !activity.length && <p className="muted">No activity yet.</p>}

        {!loading && activity.length > 0 && (
          <div className="dashboard-activity-list" role="list">
            {activity.map((item) => (
              <div key={`${item.kind}-${item.id}`} className="dashboard-activity-item" role="listitem">
                <div className="dashboard-activity-left">
                  {item.kind === 'upload' ? (
                    <span
                      className="status-pill"
                      style={{ marginRight: '0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <FileText size={14} />
                      Upload
                    </span>
                  ) : (
                    <span className="status-pill status-ready" style={{ marginRight: '0.6rem' }}>
                      <MessageSquare size={14} />
                      Chat
                    </span>
                  )}

                  <div>
                    <div style={{ fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '520px' }}>
                      {item.title}
                    </div>
                    <div className="muted" style={{ fontSize: '0.86rem' }}>
                      {item.meta}
                    </div>
                  </div>
                </div>

                <div className="muted" style={{ fontSize: '0.86rem', whiteSpace: 'nowrap' }}>
                  {formatDate(item.time)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-quick-actions glass-card">
        <div className="documents-list-head" style={{ marginBottom: '0.4rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={14} /> Quick Actions
          </h3>
          <p className="muted">Jump to common workflows.</p>
        </div>

        <div className="dashboard-quick-action-grid">
          <a className="pill-button" href="/dashboard/chat">
            Open Chat
          </a>
          <a className="pill-button" href="/dashboard/documents">
            Upload Document
          </a>
          <a className="pill-button" href="/dashboard/knowledge">
            Open Knowledge Center
          </a>
          <a className="pill-button" href="/dashboard/company">
            Edit Company Profile
          </a>
        </div>
      </section>

      {error && <p className="error-note">{error}</p>}
    </div>
  )
}
