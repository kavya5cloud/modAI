import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { createRequestLogger } from '@/lib/polarisLogger'

const schema = z.object({
  // no query params for now
})

function toIsoOrNull(d: Date | null) {
  if (!d) return null
  return d.toISOString()
}

type RecentUploadRow = {
  id: string
  filename: string
  size_bytes: number | string
  status: string
  created_at: Date | string
}

type RecentConversationRow = {
  id: string
  title: string
  created_at: Date | string
  updated_at: Date | string
}

type MetricsRow = {
  total_documents: number
  total_chunks: number
  indexed_documents: number
  total_conversations: number
  total_users: number
  total_departments: number
  policies_count: number
  process_documents_count: number
  storage_usage: string | number
  last_document_uploaded_at: Date | null
  last_conversation_at: Date | null
  recent_uploads: unknown
  recent_conversations: unknown
}

function asRecentUploadRows(value: unknown): RecentUploadRow[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is RecentUploadRow => {
    return Boolean(item) && typeof item === 'object'
  })
}

function asRecentConversationRows(value: unknown): RecentConversationRow[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is RecentConversationRow => {
    return Boolean(item) && typeof item === 'object'
  })
}

export async function GET(request: Request) {
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

  // parse (for forward compat if query params are added later)
  schema.safeParse(new URL(request.url).searchParams)

  const companyId = session.user.companyId

  const q = `
    WITH doc_stats AS (
      SELECT
        COUNT(*)::int AS total_documents,
        COUNT(CASE WHEN status IN ('ready','uploaded') THEN 1 END)::int AS indexed_documents,
        MAX(created_at) AS last_document_uploaded_at,
        COALESCE(SUM(size_bytes),0)::bigint AS storage_usage
      FROM documents
      WHERE company_id = $1
    ),
    chunk_stats AS (
      SELECT
        COUNT(*)::int AS total_chunks
      FROM document_chunks dc
      JOIN documents d ON d.id = dc.document_id AND d.company_id = dc.company_id
      WHERE dc.company_id = $1
    ),
    conv_stats AS (
      SELECT
        COUNT(*)::int AS total_conversations,
        MAX(updated_at) AS last_conversation_at
      FROM conversations
      WHERE company_id = $1
    ),
    user_stats AS (
      SELECT
        COUNT(*)::int AS total_users
      FROM users
      WHERE company_id = $1
    ),
    dept_stats AS (
      SELECT
        COALESCE(jsonb_array_length(company_profile.departments), 0)::int AS total_departments
      FROM company_profile
      WHERE company_id = $1
    ),
    policy_process AS (
      SELECT
        COUNT(CASE WHEN d.filename ~* '(policy|sop)' THEN 1 END)::int AS policies_count,
        COUNT(CASE WHEN d.filename ~* '(process|policy|sop|guideline)' THEN 1 END)::int AS process_documents_count
      FROM documents d
      WHERE d.company_id = $1
    ),
    recent_uploads AS (
      SELECT
        id,
        filename,
        size_bytes,
        status,
        created_at
      FROM documents
      WHERE company_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    ),
    recent_conversations AS (
      SELECT
        id,
        title,
        created_at,
        updated_at
      FROM conversations
      WHERE company_id = $1
      ORDER BY updated_at DESC
      LIMIT 5
    )
    SELECT
      ds.total_documents,
      cs.total_chunks,
      ds.indexed_documents,
      cns.total_conversations,
      us.total_users,
      dept.total_departments,
      pp.policies_count,
      pp.process_documents_count,
      ds.storage_usage,
      ds.last_document_uploaded_at,
      cns.last_conversation_at,
      (SELECT COALESCE(jsonb_agg(ru.*), '[]'::jsonb) FROM recent_uploads ru) AS recent_uploads,
      (SELECT COALESCE(jsonb_agg(rc.*), '[]'::jsonb) FROM recent_conversations rc) AS recent_conversations
    FROM doc_stats ds
    CROSS JOIN chunk_stats cs
    CROSS JOIN conv_stats cns
    CROSS JOIN user_stats us
    CROSS JOIN dept_stats dept
    CROSS JOIN policy_process pp
  `

  try {
    const result = await db.query<MetricsRow>(q, [companyId])

    const row = result.rows[0]

    // Resilience for brand-new companies (no rows returned)
    if (!row) {
      const payload = {
        total_documents: 0,
        total_chunks: 0,
        indexed_documents: 0,
        total_conversations: 0,
        total_users: 0,
        total_departments: 0,
        recent_uploads: [],
        recent_conversations: [],
        policies_count: 0,
        process_documents_count: 0,
        storage_usage: 0,
        last_document_uploaded_at: null,
        last_conversation_at: null,
      }

      log.success(200)
      return NextResponse.json(payload)
    }

    const payload = {
      total_documents: row.total_documents,
      total_chunks: row.total_chunks,
      indexed_documents: row.indexed_documents,
      total_conversations: row.total_conversations,
      total_users: row.total_users,
      total_departments: row.total_departments,

      recent_uploads: asRecentUploadRows(row.recent_uploads).map((r) => ({
        id: String(r.id),
        filename: String(r.filename),
        size_bytes: Number(r.size_bytes),
        status: r.status,
        created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      })),

      recent_conversations: asRecentConversationRows(row.recent_conversations).map((r) => ({
        id: String(r.id),
        title: String(r.title),
        created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
        updated_at: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
      })),

      policies_count: row.policies_count,
      process_documents_count: row.process_documents_count,

      storage_usage: Number(row.storage_usage),

      last_document_uploaded_at: toIsoOrNull(row.last_document_uploaded_at),
      last_conversation_at: toIsoOrNull(row.last_conversation_at),
    }


    log.success(200)
    return NextResponse.json(payload)
  } catch (cause) {
    console.error('[dashboard/metrics] error:', cause instanceof Error ? cause.message : 'unknown')
    log.error(500)
    return NextResponse.json({ error: 'Failed to load metrics' }, { status: 500 })
  }
}
