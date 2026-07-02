import { useState } from 'react'
import { getAuth } from '../lib/storage'
import './team.css'

type Member = {
  id: string
  email: string
  role: 'admin' | 'vp' | 'employee'
  jobTitle: string | null
  department: string | null
  isActive: boolean
  joinedAt: string
}

type TeamAuth = {
  role?: 'admin' | 'vp' | 'employee'
  seatLimit?: number
  plan?: 'starter' | 'team' | 'business' | 'enterprise'
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  vp: 'VP',
  employee: 'Employee',
}

const ROLE_DESC: Record<string, string> = {
  admin: 'Full access — billing, users, all documents',
  vp: 'Confidential + all documents, no billing',
  employee: 'Open + internal documents only',
}

const MOCK_MEMBERS: Member[] = [
  { id: '1', email: 'you@company.com', role: 'admin', jobTitle: 'CEO', department: 'Leadership', isActive: true, joinedAt: '2026-01-15' },
  { id: '2', email: 'cto@company.com', role: 'vp', jobTitle: 'CTO', department: 'Engineering', isActive: true, joinedAt: '2026-02-01' },
]

export function TeamPage() {
  const auth = getAuth() as (TeamAuth | null)
  const currentRole = auth?.role ?? 'employee'
  const seatLimit = auth?.seatLimit ?? 2
  const plan = auth?.plan ?? 'starter'

  const [members, setMembers] = useState<Member[]>(MOCK_MEMBERS)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'vp' | 'employee'>('employee')
  const [inviting, setInviting] = useState(false)
  const [inviteSent, setInviteSent] = useState('')
  const [inviteError, setInviteError] = useState('')

  const isAdmin = currentRole === 'admin'
  const seatsUsed = members.filter((m) => m.isActive).length
  const seatsLeft = seatLimit - seatsUsed

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteError('')
    if (!inviteEmail.includes('@')) {
      setInviteError('Enter a valid email address.')
      return
    }
    if (seatsLeft <= 0) {
      setInviteError(`Seat limit reached (${seatLimit}). Upgrade your plan to invite more.`)
      return
    }
    setInviting(true)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(
          typeof (body as { error?: unknown }).error === 'string'
            ? (body as { error: string }).error
            : 'Invite failed.',
        )
      }
      setInviteSent(inviteEmail)
      setInviteEmail('')
      setShowInvite(false)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Could not send invite.')
    } finally {
      setInviting(false)
    }
  }

  const handleRoleChange = async (memberId: string, newRole: 'vp' | 'employee') => {
    try {
      await fetch(`/api/team/${memberId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)),
      )
    } catch { /* ignore — UI stays optimistic */ }
  }

  const handleDeactivate = async (memberId: string) => {
    if (!confirm('Remove this member? They will lose access immediately.')) return
    try {
      await fetch(`/api/team/${memberId}`, { method: 'DELETE' })
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, isActive: false } : m))
    } catch { /* ignore */ }
  }

  return (
    <div className="team-page">
      {/* Header */}
      <div className="page-head">
        <div>
          <h2>Team</h2>
          <p>{seatsUsed} of {seatLimit} seats used · {plan} plan</p>
        </div>
        {isAdmin && (
          <button
            className="pill-button"
            onClick={() => setShowInvite(true)}
            disabled={seatsLeft <= 0}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
            Invite member
          </button>
        )}
      </div>

      {inviteSent && (
        <div className="team-banner team-banner-success">
          Invite sent to <strong>{inviteSent}</strong> — they'll get a link to join.
          <button onClick={() => setInviteSent('')} className="team-banner-close">✕</button>
        </div>
      )}

      {seatsLeft <= 0 && isAdmin && (
        <div className="team-banner team-banner-warn">
          Seat limit reached. <a href="/dashboard/billing">Upgrade your plan</a> to add more members.
        </div>
      )}

      {/* Role legend */}
      <div className="team-roles-legend glass-card">
        {Object.entries(ROLE_LABELS).map(([key, label]) => (
          <div key={key} className="team-role-item">
            <span className={`team-role-badge team-role-${key}`}>{label}</span>
            <span className="team-role-desc">{ROLE_DESC[key]}</span>
          </div>
        ))}
      </div>

      {/* Members list */}
      <div className="team-list glass-card">
        <div className="team-list-head">
          <h3>Members</h3>
          <span className="team-seat-pill">{seatsUsed} / {seatLimit} seats</span>
        </div>

        {members.map((member) => (
          <div key={member.id} className={`team-member${!member.isActive ? ' team-member-inactive' : ''}`}>
            <div className="team-member-avatar">
              {member.email[0].toUpperCase()}
            </div>
            <div className="team-member-info">
              <div className="team-member-email">{member.email}</div>
              <div className="team-member-meta">
                {member.jobTitle && <span>{member.jobTitle}</span>}
                {member.department && <span>· {member.department}</span>}
                {!member.isActive && <span className="team-member-removed">Removed</span>}
              </div>
            </div>
            <div className="team-member-actions">
              {isAdmin && member.id !== '1' && member.isActive ? (
                <>
                  <select
                    className="team-role-select"
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value as 'vp' | 'employee')}
                  >
                    <option value="vp">VP</option>
                    <option value="employee">Employee</option>
                  </select>
                  <button
                    className="danger-button"
                    onClick={() => handleDeactivate(member.id)}
                  >
                    Remove
                  </button>
                </>
              ) : (
                <span className={`team-role-badge team-role-${member.role}`}>
                  {ROLE_LABELS[member.role]}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="team-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowInvite(false)}>
          <div className="team-modal glass-card">
            <div className="team-modal-head">
              <h3>Invite a team member</h3>
              <button className="team-modal-close" onClick={() => setShowInvite(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <p className="team-modal-desc">
              They'll receive an email with a link to set up their account and job title.
              You have <strong>{seatsLeft}</strong> seat{seatsLeft !== 1 ? 's' : ''} remaining.
            </p>

            <form className="team-invite-form" onSubmit={handleInvite}>
              <label>
                Work email
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  required
                  autoFocus
                />
              </label>

              <label>
                Role
                <div className="team-role-options">
                  {(['vp', 'employee'] as const).map((r) => (
                    <label key={r} className={`team-role-option${inviteRole === r ? ' selected' : ''}`}>
                      <input
                        type="radio"
                        name="role"
                        value={r}
                        checked={inviteRole === r}
                        onChange={() => setInviteRole(r)}
                      />
                      <span className={`team-role-badge team-role-${r}`}>{ROLE_LABELS[r]}</span>
                      <span className="team-role-option-desc">{ROLE_DESC[r]}</span>
                    </label>
                  ))}
                </div>
              </label>

              {inviteError && <p className="error-note">{inviteError}</p>}

              <div className="team-modal-footer">
                <button type="button" className="team-cancel-btn" onClick={() => setShowInvite(false)}>
                  Cancel
                </button>
                <button type="submit" className="pill-button" disabled={inviting}>
                  {inviting ? 'Sending…' : 'Send invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
