import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getSessionUser } from '../lib/api'
import { getAuth } from '../lib/storage'

type ProtectedRouteProps = {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [ready, setReady] = useState(false)
  const [isAuthed, setIsAuthed] = useState(Boolean(getAuth()))

  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        const user = await getSessionUser()
        if (!mounted) return
        setIsAuthed(Boolean(user))
      } catch {
        if (!mounted) return
        setIsAuthed(false)
      } finally {
        if (mounted) setReady(true)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  if (!ready) return <div className="auth-check">Authenticating...</div>
  if (!isAuthed) return <Navigate to="/auth" replace />
  return <>{children}</>
}
