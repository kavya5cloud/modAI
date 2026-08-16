import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { LogoMark } from './Logo'
import { HERO_THREADS, type HeroTurn } from './heroThreads'
import './hero-chat.css'

/**
 * Live chatbot in the hero. Plays a scripted exchange — question, thinking,
 * streamed answer, citation — then loops. The composer is real: whatever the
 * visitor types is carried into signup.
 */

type Phase = 'asking' | 'thinking' | 'answering' | 'resting'

const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** One scripted exchange. Remounted per turn, so its initial state is the reset. */
function ChatTurn({ turn, live, onDone }: { turn: HeroTurn; live: boolean; onDone: () => void }) {
  const reduced = prefersReduced()
  const [phase, setPhase] = useState<Phase>(reduced ? 'resting' : 'asking')
  const [typed, setTyped] = useState(reduced ? turn.a : '')

  useEffect(() => {
    if (!live || reduced) return
    let raf = 0
    const timers: number[] = []

    timers.push(
      window.setTimeout(() => setPhase('thinking'), 620),
      window.setTimeout(() => {
        setPhase('answering')
        let i = 0
        let last = 0
        const step = (t: number) => {
          if (t - last > 16) {
            i = Math.min(i + 2, turn.a.length)
            setTyped(turn.a.slice(0, i))
            last = t
          }
          if (i < turn.a.length) raf = requestAnimationFrame(step)
          else {
            setPhase('resting')
            timers.push(window.setTimeout(onDone, 4200))
          }
        }
        raf = requestAnimationFrame(step)
      }, 1700),
    )

    return () => {
      timers.forEach(clearTimeout)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [live, reduced, turn, onDone])

  const done = phase === 'resting'

  return (
    <div className="hc-thread">
      <div className="hc-msg user">{turn.q}</div>

      <div className="hc-msg bot">
        {phase === 'asking' || phase === 'thinking' ? (
          <span className="hc-dots" aria-label="Thinking">
            <i /><i /><i />
          </span>
        ) : (
          <>
            <span className="hc-text">{typed}</span>
            {!done ? <span className="hc-caret" /> : null}
            {done ? <span className="hc-cite">{turn.src}</span> : null}
          </>
        )}
      </div>
    </div>
  )
}

export function HeroChat({
  threadId,
  onThreadChange,
  draft,
  onDraftChange,
  onSubmit,
}: {
  threadId: string
  onThreadChange: (id: string) => void
  draft: string
  onDraftChange: (value: string) => void
  onSubmit: (event: React.FormEvent) => void
}) {
  const thread = useMemo(
    () => HERO_THREADS.find((t) => t.id === threadId) ?? HERO_THREADS[0],
    [threadId],
  )

  const [turnIndex, setTurnIndex] = useState(0)
  const [live, setLive] = useState(false)
  const hostRef = useRef<HTMLDivElement | null>(null)

  const turn = thread.turns[turnIndex % thread.turns.length]

  // Only run while the hero is actually on screen.
  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const io = new IntersectionObserver((entries) => setLive(entries.some((e) => e.isIntersecting)), {
      threshold: 0.25,
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const nextTurn = useCallback(() => setTurnIndex((n) => n + 1), [])

  return (
    <div className="hc" ref={hostRef}>
      <div className="hc-tabs" role="tablist" aria-label="Demo">
        {HERO_THREADS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === threadId}
            className={t.id === threadId ? 'hc-tab active' : 'hc-tab'}
            onClick={() => onThreadChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="hc-card">
        <div className="hc-head">
          <span className="hc-avatar" aria-hidden="true">
            <LogoMark size={16} />
          </span>
          <div className="hc-id">
            <strong>Polaris</strong>
            <span>
              <i className="hc-status" /> reading your documents
            </span>
          </div>
          <span className="hc-badge">live demo</span>
        </div>

        {/* Keyed so each turn is a fresh mount rather than a state reset */}
        <ChatTurn key={`${threadId}-${turnIndex}`} turn={turn} live={live} onDone={nextTurn} />

        <form className="hc-composer" onSubmit={onSubmit}>
          <input
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder="Ask your own question…"
            aria-label="Ask your own question"
          />
          <button type="submit" aria-label="Continue">
            <ArrowUp size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}
