import { useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Search, SendHorizontal, X, ExternalLink } from 'lucide-react'
import { getConversations, getConversation, streamChat } from '../lib/api'
import type { ChatMessage, ChatSource } from '../types'
import './ChatPage.css'


type ConversationRow = {
  id: string
  title: string
  created_at: string
  updated_at: string
}

type LoadedConversationRow = {
  id: string
  title: string
  created_at: string
  role: 'user' | 'assistant' | 'system'
  content: string
  position: number
}

const emptyAssistant = (sources: ChatSource[] = []): ChatMessage => ({
  id: crypto.randomUUID(),
  role: 'assistant',
  content: '',
  createdAt: new Date().toISOString(),
  sources,
})

const toHistoryForApi = (messages: ChatMessage[]) =>
  messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content }))

const formatTimestamp = (iso: string) => {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

const renderSimilarityScore = (score: number) => {
  const pct = (score * 100).toFixed(1)
  return `Similarity ${pct}%`
}

export function ChatPage() {
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(false)
  const [conversationsError, setConversationsError] = useState('')

  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined)
  const [activeTitle, setActiveTitle] = useState<string>('')

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sources, setSources] = useState<ChatSource[]>([])

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const [viewerModalOpen, setViewerModalOpen] = useState(false)
  const [selectedSource, setSelectedSource] = useState<ChatSource | null>(null)

  const [sidebarQuery, setSidebarQuery] = useState('')
  const [loadingConversation, setLoadingConversation] = useState(false)


  const filteredConversations = useMemo(() => {
    const q = sidebarQuery.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter((c) => c.title.toLowerCase().includes(q))
  }, [conversations, sidebarQuery])

  useEffect(() => {
    void (async () => {
      setConversationsLoading(true)
      setConversationsError('')
      try {
        const res = await getConversations()
        setConversations(res.conversations)
      } catch (cause) {
        setConversationsError(cause instanceof Error ? cause.message : 'Failed to load conversations')
      } finally {
        setConversationsLoading(false)
      }
    })()
  }, [])

  const loadConversation = async (conversationId: string) => {
    setLoadingConversation(true)
    setError('')
    setSources([])
    try {
      const res = await getConversation(conversationId)
      const rows = res.conversation as LoadedConversationRow[]
      if (!rows?.length) {
        setMessages([])
        setActiveConversationId(conversationId)
        setActiveTitle('Conversation')
        return
      }
      setActiveConversationId(conversationId)
      setActiveTitle(rows[0]?.title ?? 'Conversation')
      const mapped: ChatMessage[] = rows
        .filter((r) => r.role === 'user' || r.role === 'assistant')
        .sort((a, b) => a.position - b.position)
        .map((r) => ({
          id: `${r.id}-${r.position}-${r.role}`,
          role: r.role as 'user' | 'assistant',
          content: r.content,
          createdAt: new Date(r.created_at).toISOString(),
          sources: r.role === 'assistant' ? [] : undefined,
        }))
      setMessages(mapped)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load conversation')
    } finally {
      setLoadingConversation(false)
    }
  }

  const startNewConversation = () => {
    setActiveConversationId(undefined)
    setActiveTitle('New chat')
    setMessages([])
    setSources([])
    setError('')
    setInput('')
  }

  const updateLastAssistant = (updater: (m: ChatMessage) => ChatMessage) => {
    setMessages((prev) => {
      const next = [...prev]
      const last = next[next.length - 1]
      if (!last || last.role !== 'assistant') return prev
      next[next.length - 1] = updater(last)
      return next
    })
  }

  const sendMessage = async () => {
    const value = input.trim()
    if (!value || sending) return

    setError('')
    setSources([])

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: value,
      createdAt: new Date().toISOString(),
    }
    const assistantMessage = emptyAssistant([])
    const nextMessages = [...messages, userMessage, assistantMessage]

    setMessages(nextMessages)
    setInput('')
    setSending(true)

    try {
      const history = toHistoryForApi(messages)
      const result = await streamChat({
        prompt: value,
        conversationId: activeConversationId,
        history,
      })

      setActiveConversationId(result.conversationId)
      updateLastAssistant((last) => ({
        ...last,
        content: result.answer,
        sources: result.sources,
      }))
      setSources(result.sources)

      const updatedTitle = conversations.find((c) => c.id === result.conversationId)?.title
      if (!updatedTitle && !activeTitle) setActiveTitle('Conversation')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chat failed')
      setMessages((prev) => prev.filter((m) => m.role !== 'assistant' || m.content))
    } finally {
      setSending(false)
    }
  }

  const activeHasMessages = messages.length > 0

  const suggestionPills = [
    'What is our leave policy?',
    'How does onboarding work?',
    'Who approves expenses?',
    'Show me the sales process.',
  ]

  const assistantTyping = sending && messages[messages.length - 1]?.role === 'assistant'

  const openSources = (s: ChatSource) => {
    setSelectedSource(s)
    setViewerModalOpen(true)
  }

  const closeViewer = () => {
    setViewerModalOpen(false)
    setSelectedSource(null)
  }

  const renderViewer = () => {
    if (!selectedSource) return null

    const page = selectedSource.pageNumber
    const fileUrl = selectedSource.fileUrl
    const viewerSrc = typeof page === 'number' && page > 0 ? `${fileUrl}#page=${page}` : fileUrl

    return (
      <div className="chat-modal" role="dialog" aria-modal="true" aria-label="Source document viewer">
        <div className="chat-modal-card">
          <div className="chat-modal-head">
            <div className="chat-modal-title">
              <div className="chat-modal-filename">{selectedSource.filename}</div>
              <div className="chat-modal-page">Page {selectedSource.pageNumber ?? 'unknown'}</div>
            </div>

            <div className="chat-modal-actions">
              <a
                className="chat-modal-open-new"
                href={selectedSource.fileUrl}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={14} />
                Open in new tab
              </a>
              <button type="button" className="chat-modal-close" onClick={closeViewer}>
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="chat-modal-body">
            <iframe
              className="chat-modal-iframe"
              src={viewerSrc}
              title="Document viewer"
            />
            <div className="chat-modal-fallback">
              <button
                type="button"
                className="pill-button"
                onClick={() => window.open(selectedSource.fileUrl, '_blank', 'noreferrer')}
              >
                Open document in new tab
              </button>
            </div>

          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {viewerModalOpen ? renderViewer() : null}
      <div className="chat-app">
        <aside className="chat-left" aria-label="Conversation sidebar">
          <div className="chat-left-head">
            <div className="chat-left-title">
              <h3>AI Chat</h3>
              <span className="chat-center-head" style={{ borderBottom: 'none', padding: 0 }} />
            </div>
            <button type="button" className="chat-new-chat-btn" onClick={startNewConversation} disabled={sending}>
              <Plus size={16} /> New Chat
            </button>
          </div>

          <div className="chat-left-search">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Search size={16} style={{ opacity: 0.85 }} />
              <input
                value={sidebarQuery}
                onChange={(e) => setSidebarQuery(e.target.value)}
                placeholder="Search conversations"
              />
            </div>
          </div>

          <div className="chat-conv-list">
            {conversationsLoading ? (
              <div className="muted" style={{ padding: '0.5rem 0.2rem' }}>
                Loading...
              </div>
            ) : conversationsError ? (
              <div className="error-note">{conversationsError}</div>
            ) : filteredConversations.length === 0 ? (
              <div className="muted" style={{ padding: '0.4rem 0.2rem', fontSize: 13 }}>
                No conversations yet.
              </div>
            ) : (
              filteredConversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={['chat-conv-item', c.id === activeConversationId ? 'active' : ''].join(' ')}
                  onClick={() => {
                    void loadConversation(c.id)
                  }}
                >
                  <div className="chat-conv-title">{c.title}</div>
                  <div className="chat-conv-meta">{new Date(c.updated_at).toLocaleDateString()}</div>
                </button>
              ))
            )}
          </div>

          <div className="chat-left-foot">
            <div className="muted">Linear • Cursor • Claude</div>
          </div>
        </aside>

        <section className="chat-center" aria-label="Chat workspace">
          <div className="chat-center-head">
            <h2>{activeTitle || 'New chat'}</h2>
            <span className="chat-center-head" style={{ borderBottom: 'none', padding: 0 }}>
              {loadingConversation ? (
                <span className="chat-pill">
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
                </span>
              ) : null}
            </span>
          </div>

          <div className="chat-messages">
            {!activeHasMessages ? (
              <div className="chat-empty">
                <h3>Ask Polaris anything about your company.</h3>
                <p>
                  Try: {suggestionPills.slice(0, 2).join(' • ')}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
                  {suggestionPills.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="chat-pill"
                      onClick={() => {
                        setInput(s)
                      }}
                      disabled={sending}
                      style={{ cursor: 'pointer' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                {messages.map((m) => (
                  <div key={m.id} className={['chat-bubble-row', 'chat-message', m.role].join(' ')}>
                    <div className="content">{m.content}</div>
                    {m.role === 'assistant' && assistantTyping && m.content === '' ? (
                      <div className="chat-typing">
                        <span className="typing-dots" aria-label="Assistant typing">
                          <span />
                          <span />
                          <span />
                        </span>
                      </div>
                    ) : (
                      <div className="timestamp">{formatTimestamp(m.createdAt)}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="chat-input-bar">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Polaris..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void sendMessage()
                }
              }}
              disabled={sending || loadingConversation}
            />

            <button
              type="button"
              className="chat-send-btn"
              disabled={sending || loadingConversation}
              onClick={() => void sendMessage()}
            >
              <SendHorizontal size={16} />
            </button>
          </div>
        </section>

        <aside className="chat-right" aria-label="Retrieved sources">
          <div className="chat-right-head">
            <h2>Sources</h2>
            <span className="chat-pill">RAG</span>
          </div>

          <div className="chat-sources">
            {!sources?.length ? (
              <div className="source-empty">Sources will appear after each answer.</div>
            ) : (
              sources.map((s, idx) => (
                <div
                  key={`${s.filename}-${s.pageNumber ?? 'na'}-${idx}`}
                  className="source-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => openSources(s)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') openSources(s)
                  }}
                >
                  <div className="source-file">{s.filename}</div>
                  <div className="source-meta">
                    <div>Page {s.pageNumber === null ? 'unknown' : s.pageNumber}</div>
                  </div>
                  <div className="sim-score">{renderSimilarityScore(s.similarityScore)}</div>
                </div>
              ))
            )}
          </div>
        </aside>

        {error ? <div className="chat-error-note">{error}</div> : null}
      </div>
    </div>
  )
}


