import { Pool, type QueryResultRow } from 'pg'
import { env } from './env'

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

// Neon serverless Postgres auto-suspends after inactivity. The first query
// after idle can fail while the compute wakes up (connection timeout / reset).
// These errors happen before any SQL is sent, so retrying is safe even for
// writes. Retry only transient connection failures — never SQL/logic errors.
const RETRYABLE_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'EPIPE',
  '57P01', // admin_shutdown
  '57P03', // cannot_connect_now (server starting up)
  '08006', // connection_failure
  '08001', // sqlclient_unable_to_establish_sqlconnection
  '08004', // sqlserver_rejected_establishment_of_sqlconnection
])

function isTransientConnectionError(cause: unknown): boolean {
  if (!cause || typeof cause !== 'object') return false
  const code = (cause as { code?: string }).code
  if (code && RETRYABLE_CODES.has(code)) return true
  const message = (cause as { message?: string }).message ?? ''
  return (
    /Connection terminated/i.test(message) ||
    /timeout expired/i.test(message) ||
    /connection timeout/i.test(message) ||
    /ECONNRESET/i.test(message)
  )
}

const MAX_ATTEMPTS = 3
const BASE_DELAY_MS = 300

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const db = {
  query: async <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ) => {
    let lastError: unknown
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await pool.query<T>(text, params)
      } catch (cause) {
        lastError = cause
        if (attempt === MAX_ATTEMPTS || !isTransientConnectionError(cause)) {
          throw cause
        }
        // Exponential backoff to give Neon compute time to wake up.
        await sleep(BASE_DELAY_MS * 2 ** (attempt - 1))
      }
    }
    throw lastError
  },
}
