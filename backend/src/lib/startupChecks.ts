import { env } from '@/lib/env'

export type StartupCheck = {
  key: string
  present: boolean
  valuePreview?: string
  help?: string
}

export type StartupChecksReport = {
  ok: boolean
  checks: StartupCheck[]
}

function preview(v: string) {
  if (!v) return ''
  const s = String(v)
  if (s.length <= 4) return '****'
  return `${s.slice(0, 2)}****${s.slice(-2)}`
}

export function getStartupChecksReport(): StartupChecksReport {
  const checks: StartupCheck[] = [
    {
      key: 'DATABASE_URL',
      present: !!env.DATABASE_URL,
      valuePreview: preview(env.DATABASE_URL),
      help: 'Set DATABASE_URL to a Neon/Postgres connection string.',
    },
    {
      key: 'NEXTAUTH_SECRET (AUTH_SECRET)',
      present: !!env.AUTH_SECRET,
      valuePreview: preview(env.AUTH_SECRET),
      help: 'Set AUTH_SECRET for NextAuth sessions.',
    },
    {
      key: 'R2_ACCOUNT_ID',
      present: !!env.R2_ACCOUNT_ID,
      valuePreview: preview(env.R2_ACCOUNT_ID),
      help: 'Cloudflare R2 Account ID (required for /api/upload-url).',
    },
    {
      key: 'R2_BUCKET',
      present: !!env.R2_BUCKET,
      valuePreview: preview(env.R2_BUCKET),
      help: 'Cloudflare R2 bucket name (required for /api/upload-url).',
    },
    {
      key: 'R2_ACCESS_KEY_ID',
      present: !!env.R2_ACCESS_KEY_ID,
      valuePreview: preview(env.R2_ACCESS_KEY_ID),
      help: 'Cloudflare R2 S3 access key id.',
    },
    {
      key: 'R2_SECRET_ACCESS_KEY',
      present: !!env.R2_SECRET_ACCESS_KEY,
      valuePreview: preview(env.R2_SECRET_ACCESS_KEY),
      help: 'Cloudflare R2 S3 secret access key.',
    },
    {
      key: 'OLLAMA_BASE_URL',
      present: !!env.OLLAMA_BASE_URL,
      valuePreview: preview(env.OLLAMA_BASE_URL),
      help: 'Ollama base URL (default provided).',
    },
  ]

  const ok = checks.every((c) => c.present)
  return { ok, checks }
}

export function logStartupChecks(): void {
  const report = getStartupChecksReport()

  console.log('[startup-checks] report', {
    ok: report.ok,
    missing: report.checks.filter((c) => !c.present).map((c) => c.key),
  })

  for (const c of report.checks) {
    if (c.present) continue
    console.warn(`[startup-checks][missing] ${c.key}${c.help ? ` — ${c.help}` : ''}`)
  }
}
