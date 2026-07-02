import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/session'

// GET /api/knowledge/[id] — return chunks for a document
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireSession()
  if (error) return error

  const { id } = await params

  const chunks = await db.query<{
    id: string
    chunk_index: number
    chunk_text: string
    token_count: number
    page_number: number | null
  }>(
    `SELECT id, chunk_index, chunk_text, token_count, page_number
     FROM document_chunks
     WHERE document_id = $1 AND company_id = $2
     ORDER BY chunk_index ASC
     LIMIT 50`,
    [id, session.user.companyId],
  )

  return NextResponse.json({ chunks: chunks.rows })
}
