import { NextResponse } from 'next/server'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { pool } from '@/lib/db'
import { env } from '@/lib/env'
import { r2 } from '@/lib/r2'
import { ListBucketsCommand } from '@aws-sdk/client-s3'
import { createRequestLogger } from '@/lib/polarisLogger'

// Liveness/health probe. The hosting platform hits this frequently, so it MUST
// be cheap and MUST NOT load heavy resources. Previously it called embedText(),
// which loads the ~130MB embedding model on every probe — that OOM-killed the
// service on small instances and caused a restart loop. Dependency states are
// reported for observability, but optional deps being down never fails the
// probe (which would restart-loop the whole app); only the process being alive
// and its primary datastore matter.

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms)
  })
  try {
    return await Promise.race([p, timeout])
  } finally {
    clearTimeout(timer!)
  }
}

export async function GET(request: Request) {
  const log = createRequestLogger({ request, eventType: 'request_start' })
  log.start()

  const timeoutMs = 2500

  const checks = {
    database: 'ok' as 'ok' | 'missing',
    ollama: 'ok' as 'ok' | 'missing',
    embeddings: 'ok' as 'ok' | 'missing',
    r2: 'missing' as 'ok' | 'missing',
    auth: 'ok' as 'ok' | 'missing',
  }

  // Database — the one dependency the process needs to serve auth.
  try {
    await withTimeout(pool.query('SELECT 1 AS ok'), timeoutMs)
  } catch {
    checks.database = 'missing'
  }

  // Ollama — cheap reachability probe (no chat generation), aborts on timeout.
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(`${env.OLLAMA_BASE_URL}/api/tags`, { signal: controller.signal })
      checks.ollama = res.ok ? 'ok' : 'missing'
    } finally {
      clearTimeout(timer)
    }
  } catch {
    checks.ollama = 'missing'
  }

  // Embeddings — verify the model cache exists WITHOUT loading it into memory.
  try {
    const cacheDir = path.join(process.cwd(), '.cache', 'transformers')
    checks.embeddings = existsSync(cacheDir) ? 'ok' : 'missing'
  } catch {
    checks.embeddings = 'missing'
  }

  // R2
  try {
    if (!env.R2_ACCOUNT_ID || !env.R2_BUCKET) throw new Error('r2_env_missing')
    await withTimeout(r2.send(new ListBucketsCommand({})), timeoutMs)
    checks.r2 = 'ok'
  } catch {
    checks.r2 = 'missing'
  }

  const allOk =
    checks.database === 'ok' &&
    checks.ollama === 'ok' &&
    checks.embeddings === 'ok' &&
    checks.r2 === 'ok'

  const payload = {
    status: checks.database === 'ok' ? (allOk ? 'healthy' : 'degraded') : 'unhealthy',
    ...checks,
  }

  // Liveness: as long as the process is responding, return 200 so the platform
  // does not restart-loop the service when an OPTIONAL dependency (ollama,
  // embeddings, r2) is unavailable. Only a dead primary datastore is fatal.
  const httpStatus = checks.database === 'ok' ? 200 : 503
  log.domainEvent('health_check_completed', { httpStatus })
  log.success(httpStatus)

  return NextResponse.json(payload, { status: httpStatus })
}
