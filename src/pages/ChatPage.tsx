import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  ExternalLink,
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
  PanelRight,
  Plus,
  Search,
  SendHorizontal,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
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

const MAX_INPUT = 3000
const LONG_ANSWER = 520

const SUGGESTIONS = [
  { icon: BookOpen, label: 'Leave policy', prompt: 'What is our leave policy?' },
  { icon: Users, label: 'Onboarding', prompt: 'How does onboarding work for a new hire?' },
  { icon: FileText, label: 'Expenses', prompt: 'Who approves expenses and what is the limit?' },
  { icon: Sparkles, label: 'Sales process', prompt: 'Walk me through our sales process.' },
]

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

const renderSimilarityScore = (score: number) => `Similarity ${(score * 100).toFixed(1)}%`

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

  const [railTab, setRailTab] = useState<'chats' | 'sources'>('chats')
  const [railOpen, setRailOpen] = useState(false)
  // Focus mode hides the rail and lets the thread use the full width.
  const [expanded, setExpanded] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem('modai.chat.expanded') === '1',
  )

  const toggleExpanded = () =>
    setExpanded((current) => {
      const next = !current
      localStorage.setItem('modai.chat.expanded', next ? '1' : '0')
      return next
    })

  const [openMessages, setOpenMessages] = useState<Set<string>>(new Set())

  const toggleMessage = (id: string) =>
    setOpenMessages((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

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

  // Keep the newest message in view as the thread grows.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [messages])

  // Auto-grow the composer up to its max height.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }, [input])

  // Escape closes the mobile rail, then leaves focus mode.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (railOpen) setRailOpen(false)
      else if (expanded) {
        setExpanded(false)
        localStorage.setItem('modai.chat.expanded', '0')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [railOpen, expanded])

  const loadConversation = async (conversationId: string) => {
    setLoadingConversation(true)
    setError('')
    setSources([])
    setRailOpen(false)
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
    setRailOpen(false)
    textareaRef.current?.focus()
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

  const sendMessage = async (override?: string) => {
    const value = (override ?? input).trim()
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
      if (result.sources?.length) setRailTab('sources')

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
  const assistantTyping = sending && messages[messages.length - 1]?.role === 'assistant'
  const inputDisabled = sending || loadingConversation

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
                <span>Open in new tab</span>
              </a>
              <button type="button" className="chat-modal-close" onClick={closeViewer} aria-label="Close">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="chat-modal-body">
            <iframe className="chat-modal-iframe" src={viewerSrc} title="Document viewer" />
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
    <>
      {viewerModalOpen ? renderViewer() : null}

      <div
        className={['chat-app', railOpen ? 'is-rail-open' : '', expanded ? 'is-expanded' : '']
          .filter(Boolean)
          .join(' ')}
      >
        <section className="chat-center" aria-label="Chat workspace">
          <div className="chat-center-head">
            <div className="chat-head-text">
              <h2>{activeTitle || 'New chat'}</h2>
              {loadingConversation ? (
                <span className="chat-pill">
                  <Loader2 size={13} className="spin" /> Loading
                </span>
              ) : null}
            </div>

            <div className="chat-head-actions">
              <button
                type="button"
                className="chat-ghost-btn"
                onClick={startNewConversation}
                disabled={sending}
              >
                <Plus size={16} />
                <span>New chat</span>
              </button>
              <button
                type="button"
                className="chat-ghost-btn chat-expand-btn"
                onClick={toggleExpanded}
                aria-label={expanded ? 'Exit focus mode' : 'Expand chat to full width'}
                title={expanded ? 'Exit focus mode' : 'Focus mode'}
              >
                {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                type="button"
                className="chat-ghost-btn chat-rail-toggle"
                onClick={() => setRailOpen((open) => !open)}
                aria-label="Toggle conversations panel"
              >
                <PanelRight size={16} />
              </button>
            </div>
          </div>

          <div className="chat-messages">
            {!activeHasMessages ? (
              <div className="chat-hero">
                <h3>
                  Ask your company.
                  <br />
                  <em>Instantly.</em>
                </h3>
                <p>Ask anything about your company — policies, processes, documents. Not sure where to start?</p>

                <div className="chat-suggestion-grid">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.prompt}
                      type="button"
                      className="chat-suggestion-card"
                      onClick={() => void sendMessage(s.prompt)}
                      disabled={inputDisabled}
                    >
                      <span className="chat-suggestion-icon">
                        <s.icon size={17} />
                      </span>
                      <span className="chat-suggestion-text">
                        <strong>{s.label}</strong>
                        <small>{s.prompt}</small>
                      </span>
                      <Plus size={15} className="chat-suggestion-plus" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="chat-thread">
                {messages.map((m) => (
                  <div key={m.id} className={['chat-bubble-row', m.role].join(' ')}>
                    <div
                      className={[
                        'chat-message',
                        m.role,
                        m.content.length > LONG_ANSWER && !openMessages.has(m.id) ? 'is-clamped' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <div className="content">{m.content}</div>
                      {m.content.length > LONG_ANSWER ? (
                        <button
                          type="button"
                          className="chat-expand-msg"
                          onClick={() => toggleMessage(m.id)}
                        >
                          {openMessages.has(m.id) ? 'Show less' : 'Show more'}
                        </button>
                      ) : null}
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
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="chat-composer-wrap">
            <div className="chat-composer">
              <textarea
                ref={textareaRef}
                value={input}
                maxLength={MAX_INPUT}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask modAI anything…"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void sendMessage()
                  }
                }}
                disabled={inputDisabled}
              />

              <div className="chat-composer-foot">
                <div className="chat-composer-tools">
                  <span className="chat-composer-hint">Enter to send · Shift+Enter for a new line</span>
                </div>

                <div className="chat-composer-right">
                  <span className="chat-counter">
                    {input.length} / {MAX_INPUT}
                  </span>
                  <button
                    type="button"
                    className="chat-send-btn"
                    disabled={inputDisabled || !input.trim()}
                    onClick={() => void sendMessage()}
                    aria-label="Send message"
                  >
                    {sending ? <Loader2 size={16} className="spin" /> : <SendHorizontal size={16} />}
                  </button>
                </div>
              </div>
            </div>
            <p className="chat-disclaimer">
              modAI answers from your company documents and may be inaccurate. Verify important details.
            </p>
          </div>
        </section>

        <div className="chat-rail-scrim" role="presentation" onClick={() => setRailOpen(false)} />

        <aside className="chat-right" aria-label="Conversations and sources">
          <div className="chat-right-head">
            <div className="chat-rail-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={railTab === 'chats'}
                className={railTab === 'chats' ? 'chat-rail-tab active' : 'chat-rail-tab'}
                onClick={() => setRailTab('chats')}
              >
                Chats <span className="chat-rail-count">{conversations.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={railTab === 'sources'}
                className={railTab === 'sources' ? 'chat-rail-tab active' : 'chat-rail-tab'}
                onClick={() => setRailTab('sources')}
              >
                Sources <span className="chat-rail-count">{sources.length}</span>
              </button>
            </div>
            <button
              type="button"
              className="chat-rail-close"
              onClick={() => setRailOpen(false)}
              aria-label="Close panel"
            >
              <X size={16} />
            </button>
          </div>

          {railTab === 'chats' ? (
            <div className="chat-rail-body">
              <div className="chat-left-search">
                <Search size={15} aria-hidden="true" />
                <input
                  value={sidebarQuery}
                  onChange={(e) => setSidebarQuery(e.target.value)}
                  placeholder="Search conversations"
                  aria-label="Search conversations"
                />
              </div>

              <div className="chat-conv-list">
                {conversationsLoading ? (
                  <div className="rail-note">Loading…</div>
                ) : conversationsError ? (
                  <div className="rail-note rail-note-error">{conversationsError}</div>
                ) : filteredConversations.length === 0 ? (
                  <div className="rail-note">No conversations yet.</div>
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
            </div>
          ) : (
            <div className="chat-rail-body">
              <div className="chat-sources">
                {!sources?.length ? (
                  <div className="rail-note">Sources appear here after each answer.</div>
                ) : (
                  sources.map((s, idx) => (
                    <div
                      key={`${s.filename}-${s.pageNumber ?? 'na'}-${idx}`}
                      className="source-item"
                      role="button"
                      tabIndex={0}
                      onClick={() => openSources(s)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openSources(s)
                        }
                      }}
                    >
                      <div className="source-file">{s.filename}</div>
                      <div className="source-meta">Page {s.pageNumber === null ? 'unknown' : s.pageNumber}</div>
                      <div className="sim-score">{renderSimilarityScore(s.similarityScore)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </aside>

        {error ? <div className="chat-error-note">{error}</div> : null}
      </div>
    </>
  )
}
