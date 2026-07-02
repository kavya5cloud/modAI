import { NextResponse } from 'next/server'
import { requireSession } from './session'
import { rateLimitFixedWindow } from './rateLimiter'

export type EndpointRateLimitConfig = {
  keyPrefix: string
  limit: number
  windowMs: number
  // If provided, limiter key is derived from the session.
  deriveKey?: (params: {
    session: {
      user: { id: string; companyId: string }
    }
  }) => string
}

export async function enforceRateLimit(config: EndpointRateLimitConfig) {
  const { session, error } = await requireSession()
  if (error) return error

  const key = config.deriveKey
    ? config.deriveKey({ session })
    : `${config.keyPrefix}:${session!.user.id}`

  const result = await rateLimitFixedWindow({
    key,
    limit: config.limit,
    windowMs: config.windowMs,
  })

  if (!result.allowed) {
    const retryAfterSeconds = Math.max(
      0,
      Math.ceil(result.resetAt.getTime() / 1000) - Math.ceil(Date.now() / 1000),
    )

    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        limit: config.limit,
        windowMs: config.windowMs,
        remaining: result.remaining,
        resetAt: result.resetAt.toISOString(),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
        },
      },
    )
  }

  return null
}

