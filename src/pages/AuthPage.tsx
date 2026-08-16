import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authWithCredentials } from '../lib/api'
import { setAuth } from '../lib/storage'
import './auth.css'

export function AuthPage() {
  const [params] = useSearchParams()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const wasInvited = params.get('invited') === '1'

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      const sessionUser = await authWithCredentials({ email, password, mode, companyName: companyName.trim() })
      setAuth(sessionUser)
      navigate('/dashboard')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      {/* Left panel — brand */}
      <div className="auth-brand-panel">
        <div className="auth-brand-orb auth-brand-orb-1" aria-hidden="true" />
        <div className="auth-brand-orb auth-brand-orb-2" aria-hidden="true" />

        <div className="auth-brand-content">
          <Link to="/" className="auth-back-home">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to modAI.com
          </Link>

          <div className="auth-brand-logo">
            <img src="/modai-logo.png" alt="modAI" className="auth-brand-logo-img" />
            <span className="auth-brand-chip">Polaris</span>
          </div>

          <div className="auth-brand-headline">
            <h1>Your company's private AI,<br /><span>ready in 5 minutes.</span></h1>
            <p>
              Polaris ingests your documents, learns your team's structure,
              and answers questions in your company's context — privately,
              on a model your company owns.
            </p>
          </div>

          <ul className="auth-brand-features">
            {[
              {
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
                text: 'Your data stays private — never leaves your boundary',
              },
              {
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M12 2v6M8 2h8"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/></svg>,
                text: 'Your own private AI — a dedicated model per company',
              },
              {
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,
                text: 'Upload PDFs, DOCX, and TXT — indexed in seconds',
              },
              {
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
                text: 'Admin invites team, controls doc access by role',
              },
            ].map((f) => (
              <li key={f.text}>
                <span className="auth-feat-icon">{f.icon}</span>
                {f.text}
              </li>
            ))}
          </ul>

          <div className="auth-brand-plans">
            <span className="auth-plan-chip">Starter $5/mo</span>
            <span className="auth-plan-chip">Team $20/mo</span>
            <span className="auth-plan-chip">Business $60/mo</span>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="auth-form-panel">
        <div className="auth-form-wrap">
          {wasInvited && (
            <div className="auth-notice">
              Account created! Sign in with your new credentials below.
            </div>
          )}

          <div className="auth-form-header">
            <h2>{mode === 'login' ? 'Welcome back' : 'Create your workspace'}</h2>
            <p>{mode === 'login' ? 'Sign in to Polaris.' : 'Admin account — you\'ll invite your team after.'}</p>
          </div>

          {/* Tab switcher */}
          <div className="auth-tabs" role="tablist">
            <button
              role="tab" aria-selected={mode === 'login'}
              className={`auth-tab${mode === 'login' ? ' active' : ''}`}
              onClick={() => setMode('login')} type="button"
            >Sign In</button>
            <button
              role="tab" aria-selected={mode === 'signup'}
              className={`auth-tab${mode === 'signup' ? ' active' : ''}`}
              onClick={() => setMode('signup')} type="button"
            >Sign Up</button>
          </div>

          <form className="auth-form-fields" onSubmit={onSubmit} noValidate>
            {mode === 'signup' && (
              <div className="auth-field">
                <label htmlFor="company">Company name</label>
                <input
                  id="company" type="text" required autoComplete="organization"
                  value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Corp"
                />
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="email">Work email</label>
              <input
                id="email" type="email" required autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <input
                id="password" type="password" required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
              />
            </div>

            {error && <p className="auth-error" role="alert">{error}</p>}

            <button className="auth-submit-btn" type="submit" disabled={loading}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in to Polaris' : 'Create company workspace'}
            </button>
          </form>

          {mode === 'signup' && (
            <p className="auth-signup-note">
              By signing up you agree to our{' '}
              <Link to="/terms">Terms of Use</Link> and{' '}
              <Link to="/privacy">Privacy Policy</Link>.
              <br />
              <strong>You'll be the admin.</strong> After setup, go to <em>Team</em> to invite colleagues.
            </p>
          )}

          <div className="auth-legal-links">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/cookies">Cookies</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
