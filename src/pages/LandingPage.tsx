import { useNavigate } from 'react-router-dom'
import './landing.css'

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="lp">
      {/* Orbs */}
      <div className="lp-orb lp-orb-purple" aria-hidden="true" />
      <div className="lp-orb lp-orb-magenta" aria-hidden="true" />
      <div className="lp-orb lp-orb-blue"   aria-hidden="true" />

      {/* ── Nav ── */}
      <nav className="lp-nav">
        <span className="lp-nav-left">POLARIS PLATFORM</span>
        <span className="lp-nav-center">B — 01</span>
        <a href="/auth" className="lp-nav-cta">ACCESS / JOIN IN</a>
      </nav>

      {/* ── Hero headline ── */}
      <main className="lp-hero">
        <div className="lp-head-wrap">
          {/* Row 1 — THE [arrow] NEXT */}
          <div className="lp-row-1">
            <span className="lp-display">THE</span>
            <button
              className="lp-arrow"
              onClick={() => navigate('/auth')}
              aria-label="Enter Polaris"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
            <span className="lp-display">NEXT</span>
          </div>
          {/* Row 2 — PHASE */}
          <div className="lp-row-2">
            <span className="lp-display lp-display-indent">PHASE</span>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <span className="lp-star" aria-hidden="true">*</span>
        <div className="lp-footer-mid">
          <span className="lp-footer-label">Genesis</span>
          <span className="lp-footer-dash" aria-hidden="true" />
        </div>
        <p className="lp-footer-desc">
          Discover a curated ecosystem of intelligence and context, engineered for
          those who seek more than just a fleeting glimpse. We bridge the gap between
          private data and decision — every answer is an invitation to explore deeper
          layers of your company's knowledge.
        </p>
      </footer>

      {/* Expand icon — decorative */}
      <button className="lp-expand" aria-label="Expand" tabIndex={-1}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        </svg>
      </button>
    </div>
  )
}
