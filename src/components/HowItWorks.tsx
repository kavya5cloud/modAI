import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import './how-it-works.css'

/* ─────────────────────────────────────────────
   Card 1 — ingestion. Click a file to run it
   through chunk → embed → ready.
   ───────────────────────────────────────────── */

type FileState = 'idle' | 'working' | 'ready'

const FILES = [
  { name: 'People-Handbook.pdf', size: '2.3 MB', chunks: 128 },
  { name: 'Onboarding-2026.docx', size: '640 KB', chunks: 41 },
  { name: 'Expense-Policy.txt', size: '18 KB', chunks: 6 },
]

function IngestVisual() {
  const [states, setStates] = useState<FileState[]>(['ready', 'idle', 'idle'])
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const run = (index: number) => {
    setStates((prev) => {
      if (prev[index] === 'working') return prev
      const next = [...prev]
      next[index] = next[index] === 'ready' ? 'idle' : 'working'
      return next
    })

    timers.current.push(
      window.setTimeout(() => {
        setStates((prev) => {
          const next = [...prev]
          if (next[index] === 'working') next[index] = 'ready'
          return next
        })
      }, 1500),
    )
  }

  const readyCount = states.filter((s) => s === 'ready').length
  const chunkTotal = FILES.reduce((sum, f, i) => (states[i] === 'ready' ? sum + f.chunks : sum), 0)

  return (
    <div className="hiw-visual hiw-ingest">
      <div className="hiw-file-list">
        {FILES.map((file, i) => (
          <button
            type="button"
            key={file.name}
            className={`hiw-file is-${states[i]}`}
            onClick={() => run(i)}
            aria-label={`Toggle ingestion for ${file.name}`}
          >
            <span className="hiw-file-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
            </span>
            <span className="hiw-file-body">
              <span className="hiw-file-name">{file.name}</span>
              <span className="hiw-file-meta">
                {states[i] === 'working' ? 'Chunking · embedding…' : states[i] === 'ready' ? `${file.chunks} chunks indexed` : file.size}
              </span>
              <span className="hiw-file-track"><span className="hiw-file-fill" /></span>
            </span>
            <span className="hiw-file-tag">
              {states[i] === 'ready' ? 'Ready' : states[i] === 'working' ? '···' : 'Ingest'}
            </span>
          </button>
        ))}
      </div>
      <div className="hiw-ingest-foot">
        <strong>{readyCount}</strong> of {FILES.length} indexed · <strong>{chunkTotal}</strong> vectors
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Card 2 — visibility. Pick a role, watch the
   retrievable set change.
   ───────────────────────────────────────────── */

const ROLES = [
  { id: 'employee', label: 'Employee', allows: ['open', 'internal'] },
  { id: 'vp', label: 'VP', allows: ['open', 'internal', 'confidential'] },
  { id: 'admin', label: 'Admin', allows: ['open', 'internal', 'confidential'] },
] as const

const DOCS = [
  { name: 'Company Handbook', level: 'open', label: 'Open' },
  { name: 'Q3 Roadmap', level: 'internal', label: 'Internal' },
  { name: 'Comp Bands 2026', level: 'confidential', label: 'Confidential' },
]

function AccessVisual() {
  const [role, setRole] = useState<(typeof ROLES)[number]['id']>('employee')
  const active = ROLES.find((r) => r.id === role) ?? ROLES[0]

  return (
    <div className="hiw-visual hiw-access">
      <div className="hiw-role-row" role="tablist" aria-label="Role">
        {ROLES.map((r) => (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={role === r.id}
            className={role === r.id ? 'hiw-role active' : 'hiw-role'}
            onClick={() => setRole(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="hiw-doc-list">
        {DOCS.map((doc) => {
          const allowed = active.allows.includes(doc.level as never)
          return (
            <div key={doc.name} className={allowed ? 'hiw-doc' : 'hiw-doc is-locked'}>
              <span className={`hiw-doc-dot lvl-${doc.level}`} />
              <span className="hiw-doc-name">{doc.name}</span>
              <span className="hiw-doc-level">{doc.label}</span>
              <span className="hiw-doc-state">
                {allowed ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                )}
              </span>
            </div>
          )
        })}
      </div>

      <p className="hiw-access-note">
        Enforced at retrieval — a locked document never reaches the model.
      </p>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Card 3 — the answer. Types itself out the
   first time it scrolls into view.
   ───────────────────────────────────────────── */

const QA = [
  {
    q: 'What is our leave policy?',
    a: 'Full-time staff accrue 1.75 days of paid leave per month, capped at 24 days a year. Requests go to your line manager at least five working days ahead.',
    src: 'People-Handbook.pdf · p.14',
  },
  {
    q: 'Who approves expenses?',
    a: 'Anything under £250 is approved by your line manager. Above that it routes to the department VP, and over £2,000 needs finance sign-off.',
    src: 'Expense-Policy.txt · p.2',
  },
]

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* Remounted per question via `key`, so the reset is a fresh mount
   rather than a setState inside an effect. */
function Typewriter({ text, src, enabled }: { text: string; src: string; enabled: boolean }) {
  // Reduced motion resolves at mount, so the full text is the initial state
  // and the effect never has to set it.
  const [count, setCount] = useState(() => (prefersReducedMotion() ? text.length : 0))

  useEffect(() => {
    if (!enabled || prefersReducedMotion()) return
    let raf = 0
    let last = 0
    let i = 0
    const step = (t: number) => {
      if (t - last > 16) {
        i = Math.min(i + 2, text.length)
        setCount(i)
        last = t
      }
      if (i < text.length) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [enabled, text])

  const done = count >= text.length

  return (
    <div className="hiw-bubble bot">
      {text.slice(0, count)}
      {!done ? <span className="hiw-caret" /> : null}
      {done ? (
        <span className="hiw-cite">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /></svg>
          {src}
        </span>
      ) : null}
    </div>
  )
}

function AnswerVisual() {
  const [index, setIndex] = useState(0)
  const [started, setStarted] = useState(false)
  const hostRef = useRef<HTMLDivElement | null>(null)

  const current = QA[index]

  // Start only once the card is actually on screen.
  useEffect(() => {
    const el = hostRef.current
    if (!el || started) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStarted(true)
          io.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [started])

  const ask = useCallback(() => {
    setIndex((i) => (i + 1) % QA.length)
    setStarted(true)
  }, [])

  return (
    <div className="hiw-visual hiw-answer" ref={hostRef}>
      <div className="hiw-chat">
        <div className="hiw-bubble user">{current.q}</div>
        <Typewriter key={index} text={current.a} src={current.src} enabled={started} />
      </div>
      <button type="button" className="hiw-ask-next" onClick={ask}>
        Ask another
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
      </button>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Card 4 — the boundary. Hover to send a
   request and watch it stay inside.
   ───────────────────────────────────────────── */

function BoundaryVisual() {
  return (
    <div className="hiw-visual hiw-boundary">
      <div className="hiw-ring">
        <span className="hiw-ring-label">Your boundary</span>
        <div className="hiw-core">
          <span className="hiw-core-glow" />
          <span className="hiw-core-label">Your private AI</span>
        </div>
        <span className="hiw-orbit o1" />
        <span className="hiw-orbit o2" />
        <span className="hiw-packet p1" />
        <span className="hiw-packet p2" />
        <span className="hiw-packet p3" />
      </div>
      <div className="hiw-boundary-foot">
        <span className="hiw-egress">
          <strong>0</strong> bytes leave
        </span>
        <span className="hiw-egress alt">
          <strong>1</strong> model per company
        </span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Section
   ───────────────────────────────────────────── */

const CARDS = [
  {
    kicker: 'No pipeline to build',
    title: 'Drop in what you already have',
    body: 'PDFs, DOCX, plain text. modAI chunks, embeds, and indexes them into pgvector in seconds.',
    visual: <IngestVisual />,
    tone: 'blue',
  },
  {
    kicker: 'No leaks by accident',
    title: 'Decide who sees what',
    body: 'Mark documents Open, Internal, or Confidential. Access is enforced during retrieval, not after.',
    visual: <AccessVisual />,
    tone: 'plain',
  },
  {
    kicker: 'No prompt engineering',
    title: 'Ask in plain English',
    body: 'Answers come back grounded in your documents, with the exact file and page it drew from.',
    visual: <AnswerVisual />,
    tone: 'plain',
  },
  {
    kicker: 'No shared tenancy',
    title: 'Your own private AI per company',
    body: 'A dedicated model instance per company. Run it offline or hosted — your data never crosses the boundary.',
    visual: <BoundaryVisual />,
    tone: 'dark',
  },
]

export function HowItWorks() {
  return (
    <section className="home-how" id="steps">
      <div className="home-how-wrap">
        <aside className="home-how-left">
          <span className="home-eyebrow">How it works</span>
          <h2>
            The fastest way
            <br />
            to answer anything.
          </h2>
          <p>
            On average it takes about four minutes to go from a folder of documents to
            your first grounded answer. Everything below is live — try it.
          </p>
          <Link to="/auth" className="home-btn-blue home-how-cta">
            Start free
          </Link>
        </aside>

        <div className="home-how-cards">
          {CARDS.map((card) => (
            <article className={`hiw-card tone-${card.tone}`} key={card.title}>
              <div className="hiw-card-visual">{card.visual}</div>
              <div className="hiw-card-copy">
                <span className="hiw-kicker">{card.kicker}</span>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
