import { BookOpen, CreditCard, Files, History, LogOut, MessageSquare, Settings, Building2, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { getConversations, getSessionUser, signOutSession } from '../lib/api'
import { clearAuth, getAuth } from '../lib/storage'
import type { UserAuth } from '../types'
import './dashboard.css'

const ROLE_BADGE_CLASS: Record<string, string> = {
  admin: 'role-badge-admin',
  vp: 'role-badge-vp',
  employee: 'role-badge-employee',
}

export function DashboardLayout() {
  const navigate = useNavigate()
  const [auth, setAuthState] = useState<UserAuth | null>(getAuth())
  const [chatLogsCount, setChatLogsCount] = useState(0)

  const role = auth?.role ?? null   // null = not yet loaded from session
  const plan = auth?.plan ?? 'starter'
  const tokensPerHr = auth?.tokensPerHr ?? 50000
  // Show admin items if role is admin OR if role hasn't loaded yet
  // (pre-migration: first registered user is always the admin)
  const isAdmin = role === 'admin' || role === null

  useEffect(() => {
    void (async () => {
      try {
        const [session, conversations] = await Promise.all([getSessionUser(), getConversations()])
        if (session) {
          setAuthState(session)
        }
        setChatLogsCount(conversations.conversations.length)
      } catch {
        setChatLogsCount(0)
      }
    })()
  }, [])

  const logout = async () => {
    await signOutSession()
    clearAuth()
    navigate('/', { replace: true })
  }

  const links = [
    { to: '/dashboard/chat',      label: 'AI Chat',    icon: MessageSquare, show: true },
    { to: '/dashboard/company',   label: 'Company',    icon: Building2,     show: true },
    { to: '/dashboard/documents', label: 'Documents',  icon: Files,         show: true },
    { to: '/dashboard/knowledge', label: 'Knowledge',  icon: BookOpen,      show: true },
    { to: '/dashboard/history',   label: 'History',    icon: History,       show: true },
    { to: '/dashboard/team',      label: 'Team',       icon: Users,         show: isAdmin },
    { to: '/dashboard/billing',   label: 'Billing',    icon: CreditCard,    show: isAdmin },
    { to: '/dashboard/settings',  label: 'Settings',   icon: Settings,      show: true },
  ].filter((l) => l.show)

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : `${n}`

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-side glass-card">
        <div className="brand">
          <span className="brand-dot" />
          <div>
            <h1>modAI</h1>
            <p>{auth?.companyName ?? 'Company Manager'}</p>
          </div>
        </div>

        <nav className="dashboard-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/dashboard'}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              <link.icon size={16} />
              <span className="nav-text">{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="side-footer">
          <div className="flowy-accent" aria-hidden="true" />

          {/* Role + plan chip */}
          <div className="side-user-meta">
            <span className={`side-role-badge ${ROLE_BADGE_CLASS[role ?? 'admin'] ?? 'role-badge-admin'}`}>
              {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Admin'}
            </span>
            <span className="side-plan-badge">{plan}</span>
          </div>

          <div className="side-meter">
            <span>Token limit / hr</span>
            <strong>{fmt(tokensPerHr)}</strong>
          </div>
          <div className="side-meter">
            <span>Conversations</span>
            <strong>{chatLogsCount}</strong>
          </div>

          <button type="button" className="logout-button" onClick={logout}>
            <LogOut size={16} />
            <span className="logout-text">Log out</span>
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  )
}
