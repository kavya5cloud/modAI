
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { embedText } from '@/lib/embeddings'


import {
  clearDocumentChunks,
  getDocumentById,
  insertChunks,
  markDocumentExtraction,
  markDocumentStatus,
} from '@/lib/repositories'
import { storage } from '@/lib/storage'


import { requireSession } from '@/lib/session'
import { enforceRateLimit } from '@/lib/rateLimitMiddleware'
import { createRequestLogger } from '@/lib/polarisLogger'

import { chunkDocumentText, extractTextFromBuffer } from '@/lib/text'

const schema = z.object({
  documentId: z.uuid(),
  filename: z.string().min(1),
})

export async function POST(request: Request) {
  const rl = await enforceRateLimit({
    keyPrefix: 'ingest',
    limit: 10,
    windowMs: 60 * 60 * 1000,
    deriveKey: ({ session }) => `ingest:${session.user.companyId}`,
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


  const { companyId } = session.user
  const { documentId, filename } = parsed.data

  // Load the document from DB to get the authoritative storage key — never trust client-supplied key.
  const doc = await getDocumentById(companyId, documentId)
  if (!doc) {
    log.error(404)
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }
  const key = doc.storage_key

  let lastStep: string | undefined
  const logStep = (step: string, extra?: Record<string, unknown>) => {
    lastStep = step
    const payload = { step, documentId, companyId, ...(extra ?? {}) }
    console.error('[ingest][step]', JSON.stringify(payload))
    log.domainEvent('ingest_step', payload)
  }


  logStep('markDocumentStatus:processing')
  await markDocumentStatus(companyId, documentId, 'processing')

  try {
    logStep('storage.readObject:start')
    const { body } = await storage.readObject({ key })
    const buffer = body
    logStep('storage.readObject:done', { bytes: Buffer.isBuffer(buffer) ? buffer.length : undefined })

    logStep('extractTextFromBuffer:start')
    const extracted = await extractTextFromBuffer(filename, buffer)
    logStep('extractTextFromBuffer:done', { extractedChars: extracted.text.length, pages: extracted.pages.length })

    logStep('markDocumentExtraction:extracted')
    await markDocumentExtraction(companyId, documentId, {
      extractedText: extracted.text,
      extractedAt: new Date(),
      extractionStatus: 'extracted',
      extractionError: null,
    })

    logStep('chunkDocumentText:start')
    const chunkDrafts = chunkDocumentText(extracted)
    logStep('chunkDocumentText:done', { chunkDrafts: chunkDrafts.length })

    logStep('embedText:start')
    const EMBED_BATCH_SIZE = 5
    const embedded: Array<{ chunkIndex: number; chunkText: string; tokenCount: number; pageNumber: number | null; embedding: number[] }> = []
    for (let i = 0; i < chunkDrafts.length; i += EMBED_BATCH_SIZE) {
      const batch = chunkDrafts.slice(i, i + EMBED_BATCH_SIZE)
      const results = await Promise.all(
        batch.map(async (chunk, batchIdx) => ({
          chunkIndex: i + batchIdx,
          chunkText: chunk.chunkText,
          tokenCount: chunk.tokenCount,
          pageNumber: chunk.pageNumber,
          embedding: await embedText(chunk.chunkText),
        })),
      )
      embedded.push(...results)
    }
    logStep('embedText:done', { embeddedChunks: embedded.length })

    logStep('deleteExistingChunks:start')
    await clearDocumentChunks(companyId, documentId)
    logStep('deleteExistingChunks:done')

    logStep('insertChunks:start')
    await insertChunks(companyId, documentId, embedded)
    logStep('insertChunks:done')

    logStep('markDocumentStatus:ready')
    await markDocumentStatus(companyId, documentId, 'ready')

    log.domainEvent('ingestion_completed', { documentId, chunks: embedded.length })
    log.success(200)
    return NextResponse.json({
      ok: true,
      chunks: embedded.length,
      extractedCharacters: extracted.text.length,
    })
  } catch (cause) {
    const error = cause instanceof Error ? cause : new Error(String(cause))
    logStep('FAILED', { error: error.message, stack: error.stack })

    await markDocumentExtraction(companyId, documentId, {
      extractedText: '',
      extractedAt: new Date(),
      extractionStatus: 'failed',
      extractionError: error.message,
    })
    await markDocumentStatus(companyId, documentId, 'failed')
    log.error(500)
    return NextResponse.json(
      {
        error: 'Ingestion failed',
        step: lastStep ?? undefined,
      },
      { status: 500 },
    )
  }
}
