import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from './auth'
import { logEvent } from './polarisLogger'

export async function requireSession() {
  const session = await getServerSession(authOptions)


  if (!session?.user?.id || !session.user.companyId) {
    // Logging must fail safely and never block requests.
    try {
      // NextAuth doesn't expose the incoming Request here; emit a minimal auth failure log.
      logEvent({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        request: { url: 'unknown://auth', method: 'UNKNOWN' } as any,
        userId: null,
        companyId: null,
        endpoint: '/api/auth/*',
        method: 'UNKNOWN',
        eventType: 'auth_failure',
        statusCode: 401,
        latencyMs: 0,
        extra: {
          reason: 'unauthorized',
        },
      })
    } catch {
      // swallow
    }

    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      session: null,
    }
  }

  return { session, error: null }
}



