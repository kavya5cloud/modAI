import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { storage } from '@/lib/storage'
import { requireSession } from '@/lib/session'
import { createRequestLogger } from '@/lib/polarisLogger'

type KnowledgeDocumentRow = {
  id: string
  filename: string
  content_type: string
  created_at: Date
  status: string
  storage_key: string
  chunk_count: number
}

export async function GET(request: Request) {
  const { session, error } = await requireSession()
  const log = createRequestLogger({ request, userId: session?.user.id ?? null, companyId: session?.user.companyId ?? null, eventType: 'request_start' })
  log.start()
  if (error) {
    log.error(401)
    return error
  }


  const result = await db.query<KnowledgeDocumentRow>(
    `WITH document_counts AS (
       SELECT
         d.id,
         d.filename,
         d.content_type,
         d.created_at,
         d.status,
         d.storage_key,
         COUNT(dc.id)::int AS chunk_count
       FROM documents d
       LEFT JOIN document_chunks dc
         ON dc.document_id = d.id
        AND dc.company_id = d.company_id
       WHERE d.company_id = $1
       GROUP BY d.id, d.filename, d.content_type, d.created_at, d.status, d.storage_key
     )
     SELECT *
     FROM document_counts
     ORDER BY created_at DESC`,
    [session.user.companyId],
  )

  const documents = result.rows.map((row) => ({
    id: row.id,
    filename: row.filename,
    content_type: row.content_type,
    created_at: row.created_at.toISOString(),
    status: row.status,
    chunk_count: row.chunk_count,
    fileUrl: storage.buildObjectUrl(row.storage_key),
  }))

  const totalDocuments = documents.length
  const totalChunks = documents.reduce((sum, document) => sum + document.chunk_count, 0)
  const indexedDocuments = documents.filter((document) => document.chunk_count > 0).length
  const lastUpload = documents[0]?.created_at ?? null

  log.domainEvent('retrieval_executed', { documents: documents.length })
  log.success(200)
  return NextResponse.json({
    summary: {
      totalDocuments,
      totalChunks,
      indexedDocuments,
      lastUpload,
    },
    documents,
  })
}

