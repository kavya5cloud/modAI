import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import './invite.css'

type InviteInfo = {
  email: string
  companyName: string
  role: 'vp' | 'employee'
  invitedBy: string
}

export function InviteAcceptPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''

  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(Boolean(token))
  const [error, setError] = useState(token ? '' : 'Invalid or missing invite link.')

  const [password, setPassword] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) return
    fetch(`/api/invitations/${token}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('Invite not found or expired.')
        return r.json() as Promise<InviteInfo>
      })
      .then(setInfo)
      .catch((e) => setError(e instanceof Error ? e.message : 'Invalid invite.'))
      .finally(() => setLoading(false))
  }, [token])

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!jobTitle.trim()) {
      setError('Please enter your job title.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, jobTitle: jobTitle.trim(), department: department.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const errorMessage =
          typeof (body as { error?: unknown }).error === 'string'
            ? (body as { error: string }).error
            : 'Failed to accept invite.'
        throw new Error(errorMessage)
      }
      navigate('/auth?invited=1')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="invite-screen">
        <div className="invite-loading">Verifying invite link…</div>
      </div>
    )
  }

  if (error && !info) {
    return (
      <div className="invite-screen">
        <div className="invite-error-card glass-card">
          <div className="invite-error-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          </div>
          <h2>Invite invalid</h2>
          <p>{error}</p>
          <Link to="/auth" className="pill-button" style={{ justifyContent: 'center', display: 'inline-flex' }}>
            Go to sign in
          </Link>
        </div>
      </div>
    )
  }

  const ROLE_LABELS = { vp: 'VP', employee: 'Employee' }

  return (
    <div className="invite-screen">
      {/* Ambient orbs */}
      <div className="invite-orb invite-orb-1" aria-hidden="true" />
      <div className="invite-orb invite-orb-2" aria-hidden="true" />

      <div className="invite-card glass-card">
        <div className="invite-logo">
          <div className="auth-logo-mark" aria-hidden="true" />
          <span className="auth-logo-name">Polaris</span>
        </div>

        <div className="invite-header">
          <h1 className="invite-title">You're invited</h1>
          <p className="invite-subtitle">
            <strong>{info?.invitedBy}</strong> has invited you to join{' '}
            <strong>{info?.companyName}</strong> on Polaris as{' '}
            <span className="invite-role-pill">{ROLE_LABELS[info?.role ?? 'employee']}</span>.
          </p>
        </div>

        <div className="invite-email-display">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          {info?.email}
        </div>

        <form className="invite-form" onSubmit={handleAccept} noValidate>
          <label>
            Create password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
            />
          </label>

          <div className="invite-form-row">
            <label>
              Job title <span className="invite-required">*</span>
              <input
                type="text"
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Software Engineer"
              />
            </label>
            <label>
              Department
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Engineering"
              />
            </label>
          </div>

          <div className="invite-why-note">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            Your job title and department determine which company documents Polaris can show you.
          </div>

          {error && <p className="error-note">{error}</p>}

          <button className="pill-button invite-submit" type="submit" disabled={submitting}>
            {submitting ? 'Setting up your account…' : 'Accept invite & join'}
          </button>
        </form>

        <p className="invite-terms">
          By joining you agree to our{' '}
          <Link to="/terms">Terms of Use</Link> and{' '}
          <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  )
}
