import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './home.css'

const PLANS = [
  {
    id: 'starter', name: 'Starter', price: 5, color: '#60a5fa',
    seats: '2 seats', tokens: '50k tokens/hr',
    features: ['2 seats', 'PDF / DOCX / TXT ingestion', 'RAG AI chat', 'Open + Internal docs', 'Offline Ollama'],
    highlight: false,
  },
  {
    id: 'team', name: 'Team', price: 20, color: '#a78bfa',
    seats: '10 seats', tokens: '150k tokens/hr',
    features: ['10 seats', 'All visibility levels', 'VP & role-based access', 'Employee invites', 'Cloud Ollama add-on'],
    highlight: true,
  },
  {
    id: 'business', name: 'Business', price: 60, color: '#f472b6',
    seats: '50 seats', tokens: '500k tokens/hr',
    features: ['50 seats', 'Dedicated Ollama instance', 'Confidential doc vault', '500k tokens/hr', 'Priority support'],
    highlight: false,
  },
  {
    id: 'enterprise', name: 'Enterprise', price: null, color: '#34d399',
    seats: 'Unlimited', tokens: 'Custom',
    features: ['Unlimited seats', 'Custom token limits', 'SSO / SAML', 'On-prem Ollama', 'Dedicated SLA'],
    highlight: false,
  },
]

const FEATURES = [
  { title: 'RAG-Powered Answers', desc: 'Polaris retrieves the most relevant chunks from your documents and feeds them to Ollama — grounded answers, every time.' },
  { title: 'Role-Based Access', desc: 'Open, Internal, Confidential. Access is enforced at retrieval — employees only see what their role allows.' },
  { title: 'Your Own Ollama', desc: 'Every company gets a dedicated Ollama instance. Run it offline or host it in the cloud — you own your model.' },
  { title: 'Document Ingestion', desc: 'Upload PDFs, DOCX, and TXT. Polaris chunks, embeds, and indexes them in seconds.' },
  { title: 'Team Management', desc: 'One admin per company. Invite employees, assign VP and Employee roles, control document access.' },
  { title: 'Token Quotas', desc: 'Hourly token budgets per plan. Upgrade instantly from the Billing page — no infra changes needed.' },
]

const STEPS = [
  { n: '01', title: 'Admin registers', desc: 'Sign up with your work email and company name. You become the billing admin.' },
  { n: '02', title: 'Pick a plan', desc: 'Choose based on your team size. Payment is per company — not per seat.' },
  { n: '03', title: 'Upload knowledge', desc: 'Drag in PDFs, DOCX, or text files. Polaris indexes everything automatically.' },
  { n: '04', title: 'Invite your team', desc: 'Send invite links. Employees set their role and department, which determines what they can access.' },
]

const CHIPS = [
  { label: 'Summarize a document', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>) },
  { label: 'Find a policy', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>) },
  { label: 'Draft from sources', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg>) },
]

/* Deterministic indigo pixel-mosaic — brighter toward the focal point, subtle per-cell jitter */
function buildMosaic(cols: number, rows: number) {
  const fx = 0.5, fy = 0.5
  const fract = (n: number) => n - Math.floor(n)
  const hash = (x: number, y: number) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453)
  const cells: string[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const nx = cols === 1 ? 0 : c / (cols - 1)
      const ny = rows === 1 ? 0 : r / (rows - 1)
      const dist = Math.min(1, Math.hypot(nx - fx, ny - fy) / 0.62)
      const jitter = (hash(c, r) - 0.5) * 0.26
      const t = Math.max(0, Math.min(1, 1 - dist + jitter))
      const light = 11 + t * 44
      const sat = 56 + t * 22
      const hue = 255 + (hash(r, c) - 0.5) * 12
      cells.push(`hsl(${hue.toFixed(0)} ${sat.toFixed(0)}% ${light.toFixed(0)}%)`)
    }
  }
  return cells
}

export function HomePage() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const mosaic = useMemo(() => buildMosaic(40, 24), [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault()
    navigate('/auth', { state: { intent: query.trim() || undefined } })
  }

  return (
    <div className="home">

      {/* ── Nav ── */}
      <header className={`home-nav-bar${scrolled ? ' scrolled' : ''}`}>
        <nav className="home-nav-inner">
          <a href="#top" className="home-logo">
            <span className="home-logo-dot" />
            modAI
          </a>

          <div className={`home-nav-links${mobileOpen ? ' open' : ''}`}>
            <a href="#product"  onClick={() => setMobileOpen(false)}>Product</a>
            <a href="#features" onClick={() => setMobileOpen(false)}>Features</a>
            <a href="#pricing"  onClick={() => setMobileOpen(false)}>Pricing</a>
            <a href="#steps"    onClick={() => setMobileOpen(false)}>How it works</a>
          </div>

          <div className="home-nav-actions">
            <Link to="/auth" className="home-signin-dark">Sign in</Link>
          </div>

          <button className="home-burger" onClick={() => setMobileOpen(v => !v)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="home-hero" id="top">
        <div
          className="home-mosaic"
          aria-hidden="true"
          style={{ gridTemplateColumns: 'repeat(40, 1fr)', gridTemplateRows: 'repeat(24, 1fr)' }}
        >
          {mosaic.map((bg, i) => (
            <span key={i} style={{ background: bg }} />
          ))}
        </div>
        <div className="home-hero-veil" aria-hidden="true" />

        <div className="home-hero-inner">
          <h1 className="home-h1">
            The future of private AI,<br />
            built for your company.
          </h1>

          <form className="home-ask" onSubmit={handleAsk}>
            <input
              className="home-ask-input"
              placeholder="Ask anything across your company's knowledge"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Ask Polaris"
            />
            <button type="submit" className="home-ask-btn" aria-label="Ask Polaris">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </form>

          <div className="home-ask-chips">
            {CHIPS.map((chip) => (
              <button key={chip.label} className="home-chip" onClick={() => navigate('/auth')}>
                {chip.icon}
                {chip.label}
              </button>
            ))}
            <Link to="/auth" className="home-chip home-chip-more">More</Link>
          </div>
        </div>
      </section>

      {/* ── About modAI ── */}
      <section className="home-section" id="product">
        <div className="home-section-wrap home-split">
          <div className="home-split-copy">
            <span className="home-eyebrow">The company</span>
            <h2>modAI builds private AI infrastructure for teams.</h2>
            <p>
              Every company deserves the power of a large AI lab — without giving
              away their data. modAI products run on open-source models your company
              controls. Nothing leaves your boundary.
            </p>
          </div>
          <div className="home-stat-card">
            <div className="home-stats">
              <div className="home-stat"><strong>100%</strong><span>Private data</span></div>
              <div className="home-stat"><strong>0</strong><span>Data shared externally</span></div>
              <div className="home-stat"><strong>1</strong><span>Ollama per company</span></div>
            </div>
            <p className="home-stat-quote">"Every byte of your company's knowledge stays inside your boundary."</p>
          </div>
        </div>
      </section>

      {/* ── Polaris intro ── */}
      <section className="home-section home-section-alt" id="polaris">
        <div className="home-section-wrap">
          <span className="home-eyebrow">The product</span>
          <h2 className="home-product-title">
            Meet Polaris — the intelligence layer<br />built for your whole company.
          </h2>
          <p className="home-product-sub">
            Polaris is a RAG-powered AI workspace. It reads your documents, learns your
            team's structure, and answers questions in context — always citing its source,
            never going off-script.
          </p>

          <div className="home-pillars">
            <div className="home-pillar">
              <div className="home-pillar-icon" style={{ '--c': '#60a5fa' } as React.CSSProperties}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </div>
              <h3>Document Intelligence</h3>
              <p>Upload PDFs, DOCX, TXT. Polaris chunks, embeds, and indexes everything. Ask — it finds the answer inside your files.</p>
            </div>
            <div className="home-pillar">
              <div className="home-pillar-icon" style={{ '--c': '#a78bfa' } as React.CSSProperties}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h3>Role-Scoped Access</h3>
              <p>Mark documents Open, Internal, or Confidential. The AI enforces this at retrieval — no junior employee ever sees a confidential doc.</p>
            </div>
            <div className="home-pillar">
              <div className="home-pillar-icon" style={{ '--c': '#f472b6' } as React.CSSProperties}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M12 2v6M8 2h8"/><circle cx="9" cy="14" r="1" fill="currentColor"/><circle cx="15" cy="14" r="1" fill="currentColor"/></svg>
              </div>
              <h3>Your Private Ollama</h3>
              <p>Every company gets a dedicated Ollama. Run offline on your device or host a cloud instance. Your model, your data, your control.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="home-section" id="features">
        <div className="home-section-wrap">
          <span className="home-eyebrow home-eyebrow-center">Everything included</span>
          <h2 className="home-section-title">All the features your team needs.</h2>
          <div className="home-feat-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="home-feat-card">
                <div className="home-feat-line" />
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="home-section home-section-alt" id="steps">
        <div className="home-section-wrap">
          <span className="home-eyebrow home-eyebrow-center">Setup in minutes</span>
          <h2 className="home-section-title">From signup to AI-powered team.</h2>
          <div className="home-steps">
            {STEPS.map((s, i) => (
              <div key={s.n} className="home-step">
                <div className="home-step-num">{s.n}</div>
                {i < STEPS.length - 1 && <div className="home-step-connector" aria-hidden="true" />}
                <div className="home-step-body">
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="home-section" id="pricing">
        <div className="home-section-wrap">
          <span className="home-eyebrow home-eyebrow-center">Simple pricing</span>
          <h2 className="home-section-title">One price per company, not per seat.</h2>
          <p className="home-section-sub">The admin pays. Employees join free. Upgrade anytime from inside the dashboard.</p>

          <div className="home-plans">
            {PLANS.map(p => (
              <div key={p.id} className={`home-plan${p.highlight ? ' home-plan-hi' : ''}`}>
                {p.highlight && <div className="home-plan-badge">Most popular</div>}
                <span className="home-plan-name" style={{ color: p.color }}>{p.name}</span>
                <div className="home-plan-price">
                  {p.price !== null
                    ? <><span className="home-plan-amt">${p.price}</span><span className="home-plan-per">/mo</span></>
                    : <span className="home-plan-amt">Custom</span>}
                </div>
                <p className="home-plan-meta">{p.seats} · {p.tokens}</p>
                <ul className="home-plan-list">
                  {p.features.map(f => (
                    <li key={f}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={p.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/auth" className="home-plan-btn" style={p.highlight ? { background: `linear-gradient(135deg,${p.color}cc,${p.color}66)`, border: 'none' } : {}}>
                  {p.price === null ? 'Contact us' : 'Get started'}
                </Link>
              </div>
            ))}
          </div>

          <div className="home-billing-note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            <span><strong>Admin-only billing.</strong> The admin registers first and picks a plan. Employees are invited and never touch billing. Upgrade or switch Ollama mode from the Billing page inside the dashboard.</span>
          </div>
        </div>
      </section>

      {/* ── Get in touch ── */}
      <section className="home-contact" id="contact">
        <div className="home-contact-glow" aria-hidden="true" />
        <div className="home-contact-inner">
          <h2 className="home-contact-title">
            Get in <span className="home-h1-grad">touch</span>
          </h2>
          <p className="home-contact-sub">
            Got questions or ready to give your team a private AI? Reach out and
            we'll get back to you as soon as possible.
          </p>

          <form className="home-contact-form" onSubmit={(e) => e.preventDefault()}>
            <div className="home-contact-fields">
              <input type="text" placeholder="Name" aria-label="Name" required />
              <input type="email" placeholder="Email" aria-label="Email" required />
            </div>
            <button type="submit" className="home-btn-primary home-contact-btn">
              Contact us
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </form>

          <p className="home-contact-or">
            Or just <Link to="/auth">create your workspace</Link> — free setup, no credit card.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="home-footer">
        <div className="home-footer-inner">
          <div className="home-footer-brand">
            <span className="home-logo-dot" />
            <span className="home-footer-name">modAI</span>
            <span className="home-footer-tag">Private AI for teams.</span>
          </div>
          <div className="home-footer-cols">
            <div className="home-footer-col">
              <span>Product</span>
              <a href="#product">About modAI</a>
              <a href="#polaris">Polaris</a>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div className="home-footer-col">
              <span>Account</span>
              <Link to="/auth">Sign in</Link>
              <Link to="/auth">Sign up</Link>
              <Link to="/dashboard/billing">Billing</Link>
            </div>
            <div className="home-footer-col">
              <span>Legal</span>
              <Link to="/terms">Terms of Use</Link>
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/cookies">Cookies</Link>
            </div>
          </div>
        </div>
        <div className="home-footer-bottom">
          <p>© 2026 modAI. All rights reserved. Polaris is a product of modAI.</p>
        </div>
      </footer>

    </div>
  )
}
