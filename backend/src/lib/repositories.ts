import { db } from './db'

export async function createConversation(companyId: string, userId: string, title: string) {
  const result = await db.query<{ id: string }>(
    'INSERT INTO conversations (company_id, user_id, title) VALUES ($1, $2, $3) RETURNING id',
    [companyId, userId, title],
  )
  return result.rows[0].id
}

export async function listConversations(companyId: string) {
  const result = await db.query<{
    id: string
    title: string
    created_at: Date
    updated_at: Date
  }>(
    `SELECT id, title, created_at, updated_at
     FROM conversations
     WHERE company_id = $1
     ORDER BY updated_at DESC`,
    [companyId],
  )
  return result.rows
}

export async function loadConversation(companyId: string, conversationId: string) {
  const result = await db.query<{
    id: string
    title: string
    created_at: Date
    role: 'user' | 'assistant' | 'system'
    content: string
    position: number
  }>(
    `SELECT c.id, c.title, c.created_at, m.role, m.content, m.position
     FROM conversations c
     LEFT JOIN messages m ON m.conversation_id = c.id
     WHERE c.company_id = $1 AND c.id = $2
     ORDER BY m.position ASC`,
    [companyId, conversationId],
  )
  return result.rows
}

export async function insertMessage(
  companyId: string,
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
) {
  await db.query(
    `INSERT INTO messages (company_id, conversation_id, role, content, position)
     VALUES (
       $1,
       $2,
       $3,
       $4,
       COALESCE((SELECT MAX(position) + 1 FROM messages WHERE conversation_id = $2), 0)
     )`,
    [companyId, conversationId, role, content],
  )
  await db.query('UPDATE conversations SET updated_at = now() WHERE id = $1', [conversationId])
}

export async function createDocument(
  companyId: string,
  userId: string,
  file: { key: string; filename: string; contentType: string; sizeBytes: number },
) {
  const result = await db.query<{ id: string }>(
    `INSERT INTO documents (company_id, uploaded_by, storage_key, filename, content_type, size_bytes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [companyId, userId, file.key, file.filename, file.contentType, file.sizeBytes],
  )
  return result.rows[0].id
}

export async function markDocumentStatus(
  companyId: string,
  documentId: string,
  status: 'pending' | 'uploaded' | 'processing' | 'ready' | 'failed',
) {
  await db.query('UPDATE documents SET status = $1 WHERE company_id = $2 AND id = $3', [
    status,
    companyId,
    documentId,
  ])
}

export async function markDocumentExtraction(
  _companyId: string,
  _documentId: string,
  _payload: {
    extractedText: string
    extractedAt: Date
    extractionStatus: 'pending' | 'extracting' | 'extracted' | 'failed'
    extractionError?: string | null
  },
) {
  // In some deployments the `documents` table does not include extraction_* columns.
  // The ingestion pipeline should not depend on these optional metadata fields.
  // No-op by design.
  void _companyId
  void _documentId
  void _payload
}



export async function clearDocumentChunks(companyId: string, documentId: string) {
  await db.query('DELETE FROM document_chunks WHERE company_id = $1 AND document_id = $2', [
    companyId,
    documentId,
  ])
}

export async function listDocuments(companyId: string) {
  const result = await db.query<{
    id: string
    filename: string
    content_type: string
    size_bytes: number
    status: string
    created_at: Date
  }>(
    `SELECT id, filename, content_type, size_bytes, status, created_at
     FROM documents
     WHERE company_id = $1
     ORDER BY created_at DESC`,
    [companyId],
  )
  return result.rows
}

export async function getDocumentById(companyId: string, documentId: string) {
  const result = await db.query<{
    id: string
    storage_key: string
    filename: string
    content_type: string
    size_bytes: number
    status: string
    created_at: Date
  }>(
    `SELECT id, storage_key, filename, content_type, size_bytes, status, created_at
     FROM documents
     WHERE company_id = $1 AND id = $2
     LIMIT 1`,
    [companyId, documentId],
  )
  return result.rows[0] ?? null
}

export async function deleteDocument(companyId: string, documentId: string) {
  await db.query('DELETE FROM documents WHERE company_id = $1 AND id = $2', [companyId, documentId])
}

export async function insertChunks(
  companyId: string,
  documentId: string,
  chunks: Array<{
    chunkIndex: number
    chunkText: string
    tokenCount: number
    pageNumber: number | null
    embedding: number[]
  }>,
) {
  for (const chunk of chunks) {
    await db.query(
      `INSERT INTO document_chunks (
         company_id,
         document_id,
         chunk_index,
         page_number,
         chunk_text,
         token_count,
         embedding
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7::vector)`,
      [
        companyId,
        documentId,
        chunk.chunkIndex,
        chunk.pageNumber,
        chunk.chunkText,
        chunk.tokenCount,
        `[${chunk.embedding.join(',')}]`,
      ],
    )
  }
}

export async function similaritySearch(companyId: string, queryEmbedding: number[], limit = 6) {
  const result = await db.query<{
    id: string
    chunk_text: string
    score: number
    filename: string
  }>(
    `SELECT dc.id, dc.chunk_text, (1 - (dc.embedding <=> $2::vector)) AS score, d.filename
     FROM document_chunks dc
     JOIN documents d ON d.id = dc.document_id
     WHERE dc.company_id = $1
     ORDER BY dc.embedding <=> $2::vector
     LIMIT $3`,
    [companyId, `[${queryEmbedding.join(',')}]`, limit],
  )
  return result.rows
}

export async function getCompanySettings(companyId: string) {
  const result = await db.query<{
    company_name: string
    industry: string | null
    tone: string | null
    response_length: string | null
  }>(
    'SELECT company_name, industry, tone, response_length FROM company_settings WHERE company_id = $1 LIMIT 1',
    [companyId],
  )
  return result.rows[0] ?? null
}

export async function upsertCompanySettings(
  companyId: string,
  payload: { companyName: string; industry: string; tone: string; responseLength: string },
) {
  await db.query(
    `INSERT INTO company_settings (company_id, company_name, industry, tone, response_length)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (company_id)
     DO UPDATE SET
       company_name = EXCLUDED.company_name,
       industry = EXCLUDED.industry,
       tone = EXCLUDED.tone,
       response_length = EXCLUDED.response_length,
       updated_at = now()`,
    [companyId, payload.companyName, payload.industry, payload.tone, payload.responseLength],
  )
}

export async function getCompanyProfile(companyId: string) {
  const result = await db.query<{
    company_id: string
    company_name: string
    industry: string | null
    employee_count: number | null
    description: string | null
    departments: unknown
    products: unknown
    goals: unknown
    created_at: Date
    updated_at: Date
  }>(
    `SELECT company_id, company_name, industry, employee_count, description,
            departments, products, goals, created_at, updated_at
     FROM company_profile
     WHERE company_id = $1
     LIMIT 1`,
    [companyId],
  )
  return result.rows[0] ?? null
}

export async function upsertCompanyProfile(
  companyId: string,
  payload: {
    companyName: string
    industry: string | null
    employeeCount: number | null
    description: string | null
    departments: unknown
    products: unknown
    goals: unknown
    logoUrl?: string | null
  },
) {
  await db.query(
    `INSERT INTO company_profile (
       company_id,
       company_name,
       industry,
       employee_count,
       description,
       departments,
       products,
       goals,
       logo_url
     )
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9)
     ON CONFLICT (company_id)
     DO UPDATE SET
       company_name = EXCLUDED.company_name,
       industry = EXCLUDED.industry,
       employee_count = EXCLUDED.employee_count,
       description = EXCLUDED.description,
       logo_url = EXCLUDED.logo_url,
       departments = EXCLUDED.departments,
       products = EXCLUDED.products,
       goals = EXCLUDED.goals,
       updated_at = now()`,
    [
      companyId,
      payload.companyName,
      payload.industry,
      payload.employeeCount,
      payload.description,
      JSON.stringify(payload.departments ?? []),
      JSON.stringify(payload.products ?? []),
      JSON.stringify(payload.goals ?? []),
      payload.logoUrl ?? null,
    ],
  )
}
