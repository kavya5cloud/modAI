import {
  BookOpen,
  Building2,
  ChevronsLeft,
  CreditCard,
  Files,
  History,
  LogOut,
  Menu,
  MessageSquare,
  PanelLeft,
  Search,
  Settings,
  Users,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getConversations, getSessionUser, signOutSession } from '../lib/api'
import { clearAuth, getAuth } from '../lib/storage'
import type { UserAuth } from '../types'
import './dashboard.css'

const ROLE_BADGE_CLASS: Record<string, string> = {
  admin: 'role-badge-admin',
  vp: 'role-badge-vp',
  employee: 'role-badge-employee',
}

const COLLAPSE_KEY = 'modai.sidebar.collapsed'

const useMediaQuery = (query: string) => {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onStoreChange)
      return () => mql.removeEventListener('change', onStoreChange)
    },
    [query],
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useMediaQuery('(max-width: 900px)')

  const [auth, setAuthState] = useState<UserAuth | null>(getAuth())
  const [chatLogsCount, setChatLogsCount] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(COLLAPSE_KEY) === '1',
  )
  const [navQuery, setNavQuery] = useState('')

  const role = auth?.role ?? null // null = not yet loaded from session
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

  // Escape closes the drawer; body scroll is locked while it is open.
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [drawerOpen])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      return next
    })
  }, [])

  const logout = async () => {
    await signOutSession()
    clearAuth()
    navigate('/', { replace: true })
  }

  const primaryLinks = useMemo(
    () =>
      [
        { to: '/dashboard/chat', label: 'AI Chat', icon: MessageSquare, show: true },
        { to: '/dashboard/company', label: 'Company', icon: Building2, show: true },
        { to: '/dashboard/documents', label: 'Documents', icon: Files, show: true },
        { to: '/dashboard/knowledge', label: 'Knowledge', icon: BookOpen, show: true },
        { to: '/dashboard/history', label: 'History', icon: History, show: true },
        { to: '/dashboard/team', label: 'Team', icon: Users, show: isAdmin },
      ].filter((link) => link.show),
    [isAdmin],
  )

  const secondaryLinks = useMemo(
    () =>
      [
        { to: '/dashboard/billing', label: 'Billing', icon: CreditCard, show: isAdmin },
        { to: '/dashboard/settings', label: 'Settings', icon: Settings, show: true },
      ].filter((link) => link.show),
    [isAdmin],
  )

  const query = navQuery.trim().toLowerCase()
  const matches = (label: string) => !query || label.toLowerCase().includes(query)
  const visiblePrimary = primaryLinks.filter((link) => matches(link.label))
  const visibleSecondary = secondaryLinks.filter((link) => matches(link.label))

  const pageTitle =
    [...primaryLinks, ...secondaryLinks].find((link) => location.pathname.startsWith(link.to))
      ?.label ?? 'Dashboard'

  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(0)}k` : `${n}`)

  const email = auth?.email ?? ''
  const initials = (email.split('@')[0] || 'U').slice(0, 2).toUpperCase()

  // Collapsed rail only applies on desktop; the drawer always shows full labels.
  const railCollapsed = collapsed && !isMobile

  const renderLink = (link: { to: string; label: string; icon: typeof MessageSquare }) => (
    <NavLink
      key={link.to}
      to={link.to}
      className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
      title={railCollapsed ? link.label : undefined}
      onClick={() => setDrawerOpen(false)}
    >
      <link.icon size={18} aria-hidden="true" />
      <span className="nav-text">{link.label}</span>
    </NavLink>
  )

  return (
    <div
      className={[
        'dashboard-shell',
        railCollapsed ? 'is-collapsed' : '',
        drawerOpen ? 'is-drawer-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className="dashboard-scrim"
        role="presentation"
        onClick={() => setDrawerOpen(false)}
      />

      <aside className="dashboard-side" aria-label="Main navigation">
        <div className="brand">
          <img
            src={railCollapsed ? '/modai-mark.png' : '/modai-logo.png'}
            alt="modAI"
            className={railCollapsed ? 'brand-logo-img is-mark' : 'brand-logo-img'}
          />
          <div className="brand-text">
            <p>{auth?.companyName ?? 'Company Manager'}</p>
          </div>
          <button
            type="button"
            className="side-collapse-btn desktop-only"
            onClick={toggleCollapsed}
            aria-label={railCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {railCollapsed ? <PanelLeft size={16} /> : <ChevronsLeft size={16} />}
          </button>
          <button
            type="button"
            className="side-collapse-btn mobile-only"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        </div>

        <div className="side-search">
          <Search size={15} aria-hidden="true" />
          <input
            value={navQuery}
            onChange={(event) => setNavQuery(event.target.value)}
            placeholder="Search"
            aria-label="Filter navigation"
          />
        </div>

        <nav className="dashboard-nav">
          {visiblePrimary.map(renderLink)}

          {visibleSecondary.length > 0 ? (
            <>
              <div className="nav-section-label">Settings &amp; Help</div>
              {visibleSecondary.map(renderLink)}
            </>
          ) : null}

          {visiblePrimary.length === 0 && visibleSecondary.length === 0 ? (
            <p className="nav-empty">No matches for “{navQuery}”.</p>
          ) : null}
        </nav>

        <div className="side-footer">
          <div className="side-meters">
            <div className="side-meter">
              <span>Tokens / hr</span>
              <strong>{fmt(tokensPerHr)}</strong>
            </div>
            <div className="side-meter">
              <span>Conversations</span>
              <strong>{chatLogsCount}</strong>
            </div>
          </div>

          <div className="side-user">
            <span className="side-avatar" aria-hidden="true">
              {initials}
            </span>
            <div className="side-user-text">
              <strong>{email || 'Signed in'}</strong>
              <div className="side-user-meta">
                <span
                  className={`side-role-badge ${ROLE_BADGE_CLASS[role ?? 'admin'] ?? 'role-badge-admin'}`}
                >
                  {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Admin'}
                </span>
                <span className="side-plan-badge">{plan}</span>
              </div>
            </div>
            <button
              type="button"
              className="logout-button"
              onClick={logout}
              aria-label="Log out"
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="dashboard-column">
        <header className="dashboard-topbar">
          <button
            type="button"
            className="topbar-menu-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
          >
            <Menu size={18} />
          </button>
          <h2 className="topbar-title">{pageTitle}</h2>
          <div className="topbar-actions">
            <span className="topbar-pill">{plan}</span>
            <span className="topbar-pill topbar-pill-muted">{fmt(tokensPerHr)} tok/hr</span>
          </div>
        </header>

        <main className="dashboard-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
