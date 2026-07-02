import { randomUUID } from 'crypto'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { storage } from '@/lib/storage'

import { requireSession } from '@/lib/session'
import { enforceRateLimit } from '@/lib/rateLimitMiddleware'
import { createRequestLogger } from '@/lib/polarisLogger'

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB
const MAX_FILENAME_LENGTH = 255

const schema = z.object({
  filename: z.string().min(1).max(MAX_FILENAME_LENGTH),
  contentType: z.string().min(1).max(200),
  sizeBytes: z.number().int().positive().max(MAX_FILE_SIZE_BYTES, `File size must not exceed ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`),
})

const allowedExtensions = new Set(['pdf', 'docx', 'txt'])

function getFileExtension(filename: string) {
  const parts = filename.toLowerCase().split('.')
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

function sanitizeFilename(filename: string): string {
  // Remove path traversal characters and null bytes, keep only safe characters
  return filename
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\0/g, '')
    .replace(/\.{2,}/g, '_')
    .slice(0, MAX_FILENAME_LENGTH)
}

export async function POST(request: Request) {
  const rl = await enforceRateLimit({
    keyPrefix: 'upload_url',
    limit: 20,
    windowMs: 60 * 60 * 1000,
  })
  if (rl) return rl

  const { session, error } = await requireSession()
  const log = createRequestLogger({ request, userId: session?.user.id ?? null, companyId: session?.user.companyId ?? null, eventType: 'request_start' })
  log.start()

  if (error) {
    log.error(401)
    return error
  }

  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) {
    log.error(400)
    return NextResponse.json({ error: z.flattenError(parsed.error) }, { status: 400 })
  }

  const extension = getFileExtension(parsed.data.filename)
  if (!allowedExtensions.has(extension)) {
    return NextResponse.json(
      { error: 'Only PDF, DOCX, and TXT files are allowed' },
      { status: 400 },
    )
  }

  const safeFilename = sanitizeFilename(parsed.data.filename)

  log.domainEvent('upload_started')
  const key = `${session.user.companyId}/${randomUUID()}-${safeFilename}`

  let uploadUrlResponse: { documentId: string; key: string; uploadUrl: string; fileUrl: string }

  try {
    uploadUrlResponse = await storage.getUploadUrl({
      companyId: session.user.companyId,
      userId: session.user.id,
      key,
      filename: safeFilename,
      contentType: parsed.data.contentType,
      sizeBytes: parsed.data.sizeBytes,
    })
  } catch (cause) {
    log.error(500)
    console.error('[upload-url] storage.getUploadUrl failed:', cause instanceof Error ? cause.message : 'unknown')
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 })
  }

  log.domainEvent('upload_completed', { documentId: uploadUrlResponse.documentId })
  log.success(200)

  return NextResponse.json(uploadUrlResponse)
}
