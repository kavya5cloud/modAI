import { useEffect, useState } from 'react'
import { getConversations } from '../lib/api'
import './pages.css'

export function HistoryPage() {
  const [conversations, setConversations] = useState<
    Array<{ id: string; title: string; created_at: string; updated_at: string }>
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError('')
      try {
        const response = await getConversations()
        setConversations(response.conversations)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Failed to load conversation history')
        setConversations([])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="list-page">
      <header className="page-head">
        <div>
          <h2>Conversation History</h2>
          <p className="muted">Review previous decisions and AI outputs.</p>
        </div>
      </header>

      <section className="list-wrap glass-card">
        {loading && <p className="muted">Loading history...</p>}
        {!loading && error && <p className="error-note">{error}</p>}
        {!loading && !error && !conversations.length && (
          <p className="muted">No conversation history yet.</p>
        )}
        {!loading && conversations.map((item) => (
          <article className="list-item" key={item.id}>
            <h3>{item.title || 'Conversation'}</h3>
            <p className="muted">
              {new Date(item.updated_at).toLocaleString()}
            </p>
          </article>
        ))}
      </section>
    </div>
  )
}
