import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { env } from '@/lib/env'
import { streamOllamaChat } from '@/lib/ollama'
import { embedText } from '@/lib/embeddings'
import { r2 } from '@/lib/r2'
import { ListBucketsCommand } from '@aws-sdk/client-s3'
import { createRequestLogger } from '@/lib/polarisLogger'

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

  // Database
  try {
    await Promise.race([pool.query('SELECT 1 AS ok'), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs))])
  } catch {
    checks.database = 'missing'
  }

  // Ollama
  try {
    await Promise.race([
      streamOllamaChat({
        messages: [
          { role: 'system', content: 'Health check' },
          { role: 'user', content: 'Ping' },
        ],
        onToken: () => undefined,
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs)),
    ])
  } catch {
    checks.ollama = 'missing'
  }

  // Embeddings
  try {
    await Promise.race([
      embedText('health-check'),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs)),
    ])
  } catch {
    checks.embeddings = 'missing'
  }

  // R2
  try {
    if (!env.R2_ACCOUNT_ID || !env.R2_BUCKET) throw new Error('r2_env_missing')
    await Promise.race([
      r2.send(new ListBucketsCommand({})),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs)),
    ])
    checks.r2 = 'ok'
  } catch {
    checks.r2 = 'missing'
  }

  const payload = {
    auth: checks.auth,
    database: checks.database,
    r2: checks.r2,
    ollama: checks.ollama,
    embeddings: checks.embeddings,
  }

  const httpStatus = checks.database === 'ok' && checks.embeddings === 'ok' && checks.ollama === 'ok' && checks.r2 === 'ok' ? 200 : 503
  log.domainEvent('health_check_completed', { httpStatus })
  log.success(httpStatus)

  return NextResponse.json(payload, { status: httpStatus })
}

