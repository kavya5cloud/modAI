import { randomUUID } from 'crypto'

import { NextResponse } from 'next/server'
import { storage } from '@/lib/storage'
import { requireSession } from '@/lib/session'
import { enforceRateLimit } from '@/lib/rateLimitMiddleware'
import { createRequestLogger } from '@/lib/polarisLogger'

const MAX_LOGO_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED = new Map<string, string>([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
  ['image/svg+xml', 'svg'],
])

/** Accepts a company logo as multipart form-data and returns its public URL. */
export async function POST(request: Request) {
  const rl = await enforceRateLimit({ keyPrefix: 'company_logo', limit: 20, windowMs: 60 * 60 * 1000 })
  if (rl) return rl

  const { session, error } = await requireSession()
  const log = createRequestLogger({
    request,
    userId: session?.user.id ?? null,
    companyId: session?.user.companyId ?? null,
    eventType: 'request_start',
  })
  log.start()

  if (error) {
    log.error(401)
    return error
  }

  // Only an admin should be able to change how the company presents itself.
  if (session.user.role !== 'admin') {
    log.error(403)
    return NextResponse.json({ error: 'Only an admin can change the company logo' }, { status: 403 })
  }

  let file: File | null = null
  try {
    const form = await request.formData()
    const candidate = form.get('file')
    if (candidate instanceof File) file = candidate
  } catch {
    log.error(400)
    return NextResponse.json({ error: 'Expected multipart form-data' }, { status: 400 })
  }

  if (!file) {
    log.error(400)
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const ext = ALLOWED.get(file.type)
  if (!ext) {
    log.error(400)
    return NextResponse.json({ error: 'Logo must be PNG, JPG, WEBP, or SVG' }, { status: 400 })
  }

  if (file.size > MAX_LOGO_BYTES) {
    log.error(400)
    return NextResponse.json({ error: 'Logo must be 2 MB or smaller' }, { status: 400 })
  }

  try {
    const key = `logos/${session.user.companyId}/${randomUUID()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())
    await storage.putObject({ key, body: buffer, contentType: file.type })

    log.domainEvent('company_logo_updated', { companyId: session.user.companyId })
    log.success(200)
    return NextResponse.json({ logoUrl: storage.buildObjectUrl(key), key })
  } catch (cause) {
    log.error(500)
    console.error('[company/logo] upload failed:', cause instanceof Error ? cause.message : 'unknown')
    return NextResponse.json({ error: 'Logo upload failed' }, { status: 500 })
  }
}
