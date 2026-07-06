import { db } from './db'

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: Date
}

function toSeconds(windowMs: number) {
  if (windowMs % 1000 !== 0) {
    // MVP: keep it simple and store integer seconds in DB.
    throw new Error('windowMs must be a multiple of 1000')
  }
  return Math.floor(windowMs / 1000)
}

/**
 * Fixed-window rate limit using Postgres.
 *
 * Implementation strategy (MVP):
 * - Bucket time into window_start.
 * - Use INSERT ... ON CONFLICT DO UPDATE to increment count atomically.
 */
export async function rateLimitFixedWindow(params: {
  key: string
  limit: number
  windowMs: number
}): Promise<RateLimitResult> {
  const { key, limit, windowMs } = params
  const windowSeconds = toSeconds(windowMs)
  const now = Date.now()
  const windowStartMs = Math.floor(now / windowMs) * windowMs
  const windowStart = new Date(windowStartMs)
  const resetAt = new Date(windowStartMs + windowMs)

  // Best-effort prune. This is pure maintenance, so we DON'T run it on every
  // call — doing so added a full DB round-trip to every login. Run it on a
  // small fraction of calls (~3%); over many requests the cleanup still happens
  // regularly, but the hot path (e.g. sign-in) skips the extra round-trip.
  if (Math.random() < 0.03) {
    try {
      await db.query(
        'SELECT prune_rate_limit_counters($1)',
        // Keep last ~30 windows per key (~30 * windowSeconds of retention)
        [30],
      )
    } catch {
      // ignore
    }
  }

  // Atomically upsert
  // Note: updated_at is updated in trigger-free manner via setting it.
  const result = await db.query<{ count: number }>(
    `INSERT INTO rate_limit_counters (key, window_start, window_seconds, count)
     VALUES ($1, $2, $3, 1)
     ON CONFLICT (key, window_start)
     DO UPDATE SET
       count = rate_limit_counters.count + 1,
       updated_at = now()
     RETURNING count;`,
    [key, windowStart.toISOString(), windowSeconds],
  )
  const count = result.rows[0].count
  const remaining = Math.max(0, limit - count)
  const allowed = count <= limit

  return { allowed, remaining, resetAt }
}
