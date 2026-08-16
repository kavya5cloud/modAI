import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HowItWorks } from '../components/HowItWorks'
import { LiquidBackground } from '../components/LiquidBackground'
import { HeroChat } from '../components/HeroChat'
import './home.css'

const PLANS = [
  {
    id: 'starter', name: 'Starter', price: 5,
    seats: '2 seats', tokens: '50k tokens/hr',
    features: ['2 seats', 'PDF / DOCX / TXT ingestion', 'RAG AI chat', 'Open + Internal docs', 'Private AI — offline'],
    highlight: false,
  },
  {
    id: 'team', name: 'Team', price: 20,
    seats: '10 seats', tokens: '150k tokens/hr',
    features: ['10 seats', 'All visibility levels', 'VP & role-based access', 'Employee invites', 'Private AI cloud add-on'],
    highlight: true,
  },
  {
    id: 'business', name: 'Business', price: 60,
    seats: '50 seats', tokens: '500k tokens/hr',
    features: ['50 seats', 'Dedicated Private AI instance', 'Confidential doc vault', '500k tokens/hr', 'Priority support'],
    highlight: false,
  },
  {
    id: 'enterprise', name: 'Enterprise', price: null,
    seats: 'Unlimited', tokens: 'Custom',
    features: ['Unlimited seats', 'Custom token limits', 'SSO / SAML', 'On-prem Private AI', 'Dedicated SLA'],
    highlight: false,
  },
]

const FEATURES = [
  { title: 'RAG-Powered Answers', desc: 'Polaris retrieves the most relevant chunks from your documents and feeds them to Private AI — grounded answers, every time.' },
  { title: 'Role-Based Access', desc: 'Open, Internal, Confidential. Access is enforced at retrieval — employees only see what their role allows.' },
  { title: 'Your Own Private AI', desc: 'Every company gets a dedicated Private AI instance. Run it offline or host it in the cloud — you own your model.' },
  { title: 'Document Ingestion', desc: 'Upload PDFs, DOCX, and TXT. Polaris chunks, embeds, and indexes them in seconds.' },
  { title: 'Team Management', desc: 'One admin per company. Invite employees, assign VP and Employee roles, control document access.' },
  { title: 'Token Quotas', desc: 'Hourly token budgets per plan. Upgrade instantly from the Billing page — no infra changes needed.' },
]

type ModeId = 'ask' | 'find'

const STACK = ['PDF', 'DOCX', 'TXT', 'Private AI', 'pgvector', 'Neon Postgres', 'RAG retrieval', 'Role-based access']

export function HomePage() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<ModeId>('ask')
  const navigate = useNavigate()


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
          <a href="#top" className="home-logo" aria-label="modAI home">
            <img src="/modai-logo.png" alt="modAI" className="home-logo-img" />
            <span className="home-logo-chip">Polaris</span>
            <span className="home-logo-chip accent">private preview</span>
          </a>

          <div className={`home-nav-links${mobileOpen ? ' open' : ''}`}>
            <a href="#product"  onClick={() => setMobileOpen(false)}>Product</a>
            <Link to="/solutions" onClick={() => setMobileOpen(false)}>Solutions</Link>
            <a href="#features" onClick={() => setMobileOpen(false)}>Features</a>
            <a href="#steps"    onClick={() => setMobileOpen(false)}>How it works</a>
            <a href="#pricing"  onClick={() => setMobileOpen(false)}>Pricing</a>
          </div>

          <div className="home-nav-actions">
            <a href="#contact" className="home-btn-white">Talk to sales</a>
            <Link to="/auth" className="home-btn-blue">Sign up for free</Link>
          </div>

          <button className="home-burger" onClick={() => setMobileOpen(v => !v)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="home-hero" id="top">
        <div className="home-hero-gradient" aria-hidden="true" />
        <LiquidBackground />
        <div className="home-hero-grid" aria-hidden="true" />
        <div className="home-hero-grain" aria-hidden="true" />

        <div className="home-hero-inner">
          <div className="home-hero-copy">
            <span className="home-hero-eyebrow">Private AI for your company</span>

            <h1 className="home-h1">
              Answer anything about your company with <em>Private AI</em>
            </h1>

            <p className="home-hero-sub">
              Polaris reads your documents and answers in context — grounded, cited,
              and running on a model your company owns.
            </p>
            <p className="home-hero-sub">
              Every capability stays inside your boundary: ingestion, retrieval,
              role-based access, and the model itself.
            </p>

            <div className="home-hero-actions">
              <Link to="/auth" className="home-pill home-pill-solid">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                Start free
              </Link>
              <a href="#steps" className="home-pill">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                How it works
              </a>
              <a href="#pricing" className="home-pill">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                Pricing
              </a>
              <a href="#contact" className="home-pill">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                Talk to sales
              </a>
            </div>
          </div>

          <div className="home-hero-panel">
            <HeroChat
              threadId={mode}
              onThreadChange={(id) => setMode(id as ModeId)}
              draft={query}
              onDraftChange={setQuery}
              onSubmit={handleAsk}
            />
          </div>
        </div>
      </section>

      {/* ── Supported stack strip ── */}
      <section className="home-strip" aria-label="Supported formats and stack">
        <div className="home-strip-track">
          {[...STACK, ...STACK].map((item, i) => (
            <span className="home-strip-item" key={`${item}-${i}`} aria-hidden={i >= STACK.length}>
              {item}
            </span>
          ))}
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
              <div className="home-stat"><strong>1</strong><span>Your own private AI per company</span></div>
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
              <div className="home-pillar-icon" style={{ '--c': '#1d3ec7' } as React.CSSProperties}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </div>
              <h3>Document Intelligence</h3>
              <p>Upload PDFs, DOCX, TXT. Polaris chunks, embeds, and indexes everything. Ask — it finds the answer inside your files.</p>
            </div>
            <div className="home-pillar">
              <div className="home-pillar-icon" style={{ '--c': '#2a56d8' } as React.CSSProperties}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h3>Role-Scoped Access</h3>
              <p>Mark documents Open, Internal, or Confidential. The AI enforces this at retrieval — no junior employee ever sees a confidential doc.</p>
            </div>
            <div className="home-pillar">
              <div className="home-pillar-icon" style={{ '--c': '#4479e8' } as React.CSSProperties}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M12 2v6M8 2h8"/><circle cx="9" cy="14" r="1" fill="currentColor"/><circle cx="15" cy="14" r="1" fill="currentColor"/></svg>
              </div>
              <h3>Your Own Private AI</h3>
              <p>Every company gets a dedicated model instance. Run it offline or hosted — your model, your data, your control.</p>
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

      <HowItWorks />

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
                <span className="home-plan-name">{p.name}</span>
                <div className="home-plan-price">
                  {p.price !== null
                    ? <><span className="home-plan-amt">${p.price}</span><span className="home-plan-per">/mo</span></>
                    : <span className="home-plan-amt">Custom</span>}
                </div>
                <p className="home-plan-meta">{p.seats} · {p.tokens}</p>
                <ul className="home-plan-list">
                  {p.features.map(f => (
                    <li key={f}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="home-plan-tick"><path d="M20 6L9 17l-5-5"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/auth" className={p.highlight ? 'home-plan-btn home-plan-btn-hi' : 'home-plan-btn'}>
                  {p.price === null ? 'Contact us' : 'Get started'}
                </Link>
              </div>
            ))}
          </div>

          <div className="home-billing-note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d3ec7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            <span><strong>Admin-only billing.</strong> The admin registers first and picks a plan. Employees are invited and never touch billing. Upgrade or switch Private AI mode from the Billing page inside the dashboard.</span>
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
            <img src="/modai-logo.png" alt="modAI" className="home-logo-img" />
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
