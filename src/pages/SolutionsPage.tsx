import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './solutions.css'

const PROBLEMS = [
  {
    n: '01',
    title: 'The answer exists. Nobody can find it.',
    body: 'It is in a PDF, a handbook, a policy doc someone wrote two years ago. So people ask a colleague instead, and that colleague guesses.',
  },
  {
    n: '02',
    title: 'Generic AI does not know your company.',
    body: 'A public model has never read your handbook. Ask it about your leave policy and it invents a plausible one.',
  },
  {
    n: '03',
    title: 'Uploading your documents is the risk.',
    body: 'Sending internal files to someone else’s model means your policies, salaries, and roadmaps now live outside your boundary.',
  },
]

const PIPELINE = [
  { step: 'Ingest', body: 'PDFs, DOCX and text are chunked, embedded, and indexed into pgvector.' },
  { step: 'Scope', body: 'Every chunk inherits a visibility level: Open, Internal, or Confidential.' },
  { step: 'Retrieve', body: 'A question runs hybrid search — vector plus keyword — filtered by the asker’s role.' },
  { step: 'Answer', body: 'Only the chunks that survived that filter reach the model. The reply cites file and page.' },
]

const AUDIENCE = [
  { role: 'Employees', body: 'Ask in plain English. See Open and Internal material only.' },
  { role: 'VPs', body: 'Everything employees see, plus Confidential documents.' },
  { role: 'Admins', body: 'Own billing, invite the team, and set what each document is worth protecting.' },
]

export function SolutionsPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="sol">
      <header className={`sol-nav${scrolled ? ' scrolled' : ''}`}>
        <nav className="sol-nav-inner">
          <Link to="/" className="sol-logo" aria-label="modAI home">
            <img src="/modai-logo.png" alt="modAI" />
            <span className="sol-chip">Solutions</span>
          </Link>
          <div className="sol-nav-actions">
            <Link to="/" className="sol-btn-ghost">Home</Link>
            <Link to="/auth" className="sol-btn-solid">Start free</Link>
          </div>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="sol-hero">
        <div className="sol-hero-glow" aria-hidden="true" />
        <div className="sol-hero-grid" aria-hidden="true" />
        <div className="sol-wrap sol-hero-inner">
          <span className="sol-eyebrow">The solution, briefly</span>
          <h1>
            Your company already wrote the answers.
            <br />
            <em>Polaris just finds them.</em>
          </h1>
          <p className="sol-lede">
            modAI turns the documents you already have into an assistant your whole team can ask —
            grounded in your files, scoped to each person&apos;s role, and running on a model your
            company owns.
          </p>
          <div className="sol-hero-actions">
            <Link to="/auth" className="sol-btn-solid lg">Start free</Link>
            <a href="#how" className="sol-btn-ghost lg">See how it works</a>
          </div>
        </div>
      </section>

      {/* ── Problem ── */}
      <section className="sol-section">
        <div className="sol-wrap">
          <span className="sol-label">The problem</span>
          <h2>Three things go wrong in every company.</h2>
          <div className="sol-problem-grid">
            {PROBLEMS.map((p) => (
              <article className="sol-problem" key={p.n}>
                <span className="sol-num">{p.n}</span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── How ── */}
      <section className="sol-section alt" id="how">
        <div className="sol-wrap">
          <span className="sol-label">How it works</span>
          <h2>Four steps, and the last one is the only one your team sees.</h2>

          <ol className="sol-pipeline">
            {PIPELINE.map((s, i) => (
              <li className="sol-step" key={s.step}>
                <div className="sol-step-head">
                  <span className="sol-step-index">{i + 1}</span>
                  <h3>{s.step}</h3>
                </div>
                <p>{s.body}</p>
                {i < PIPELINE.length - 1 ? <span className="sol-step-line" aria-hidden="true" /> : null}
              </li>
            ))}
          </ol>

          <p className="sol-note">
            The filtering happens <strong>before</strong> the model is called. A document an employee
            may not read is never placed in the prompt — so it cannot leak through an answer.
          </p>
        </div>
      </section>

      {/* ── Boundary ── */}
      <section className="sol-section">
        <div className="sol-wrap sol-split">
          <div>
            <span className="sol-label">Why private matters</span>
            <h2>Nothing crosses your boundary.</h2>
            <p className="sol-body">
              Each company gets a dedicated Private AI instance — offline on your own hardware, or
              hosted for you. Your documents are embedded and stored in your database, and the model
              that reads them is yours. There is no shared tenancy and no training on your content.
            </p>
          </div>
          <ul className="sol-facts">
            <li><strong>0</strong><span>bytes sent to a third-party model</span></li>
            <li><strong>1</strong><span>Private AI instance per company</span></li>
            <li><strong>3</strong><span>visibility levels enforced at retrieval</span></li>
          </ul>
        </div>
      </section>

      {/* ── Audience ── */}
      <section className="sol-section alt">
        <div className="sol-wrap">
          <span className="sol-label">Who it is for</span>
          <h2>One workspace, three levels of access.</h2>
          <div className="sol-audience">
            {AUDIENCE.map((a) => (
              <article className="sol-aud-card" key={a.role}>
                <h3>{a.role}</h3>
                <p>{a.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="sol-cta">
        <div className="sol-wrap">
          <h2>Point it at your documents and ask something.</h2>
          <p>Free to set up. No credit card. Your first grounded answer takes about four minutes.</p>
          <div className="sol-hero-actions">
            <Link to="/auth" className="sol-btn-solid lg">Create your workspace</Link>
            <Link to="/" className="sol-btn-ghost lg">Back to home</Link>
          </div>
        </div>
      </section>

      <footer className="sol-footer">
        <div className="sol-wrap">
          <span>© 2026 modAI. Polaris is a product of modAI.</span>
          <div className="sol-footer-links">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/cookies">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
