import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { storage } from '@/lib/storage'

import { deleteDocument, getDocumentById, markDocumentStatus } from '@/lib/repositories'
import { requireSession } from '@/lib/session'
import { createRequestLogger } from '@/lib/polarisLogger'

const paramsSchema = z.object({
  id: z.uuid(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireSession()
  const log = createRequestLogger({ request, userId: session?.user.id ?? null, companyId: session?.user.companyId ?? null, eventType: 'request_start' })
  log.start()

  if (error) {
    log.error(401)
    return error
  }

  const { id } = paramsSchema.parse(await params)
  const body = await request.json().catch(() => ({} as Record<string, unknown>))

  // Frontend sends a status field, but the database schema expects lifecycle:
  // pending -> processing -> ready/failed
  // For this endpoint, we only allow transitioning to `pending`.
  const parsedStatus = typeof body.status === 'string' ? body.status : 'pending'

  if (parsedStatus !== 'pending') {
    log.error(400)
    return NextResponse.json({ error: 'Unsupported status update' }, { status: 400 })
  }


  const document = await getDocumentById(session.user.companyId, id)
  if (!document) {
    log.error(404)
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  try {
    await markDocumentStatus(session.user.companyId, id, 'pending')
    log.domainEvent('upload_completed', { documentId: id })
    log.success(200)
    return NextResponse.json({
      ok: true,
      document: {
        ...document,
        status: 'pending',
        fileUrl: storage.buildObjectUrl(document.storage_key),
      },
    })
  } catch (cause) {
    log.error(500)
    console.error('[files/patch] markDocumentStatus failed:', cause instanceof Error ? cause.message : 'unknown')
    return NextResponse.json({ error: 'Failed to update document status' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireSession()
  const log = createRequestLogger({ request, userId: session?.user.id ?? null, companyId: session?.user.companyId ?? null, eventType: 'request_start' })
  log.start()

  if (error) {
    log.error(401)
    return error
  }

  const { id } = paramsSchema.parse(await params)
  const document = await getDocumentById(session.user.companyId, id)
  if (!document) {
    log.error(404)
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  try {
    await storage.deleteObject({ key: document.storage_key })
    await deleteDocument(session.user.companyId, id)
    log.success(200)
    return NextResponse.json({ ok: true })
  } catch (cause) {
    log.error(500)
    console.error('[files/delete] failed:', cause instanceof Error ? cause.message : 'unknown')
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}

