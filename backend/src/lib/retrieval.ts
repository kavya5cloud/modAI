import { embedText } from './embeddings'
import { db } from './db'

export type Visibility = 'open' | 'internal' | 'confidential'

/**
 * Document visibility a given role is allowed to retrieve.
 * - employee: open + internal company knowledge
 * - vp / admin: everything, including confidential
 * Confidential documents must never reach an employee through retrieval.
 */
export function visibilitiesForRole(role: 'admin' | 'vp' | 'employee'): Visibility[] {
  if (role === 'admin' || role === 'vp') return ['open', 'internal', 'confidential']
  return ['open', 'internal']
}

export type RetrievedChunk = {
  chunk_id: string
  document_id: string
  filename: string
  page_number: number | null
  similarity_score: number
  chunk_text: string
  retrieval_method: 'vector' | 'keyword' | 'hybrid'
}

type ChunkCandidate = Omit<RetrievedChunk, 'retrieval_method'> & { retrieval_method: RetrievedChunk['retrieval_method'] }

type KeywordRow = {
  chunk_id: string
  document_id: string
  filename: string
  page_number: number | null
  chunk_text: string
  similarity_score: number
  retrieval_method: 'keyword'
}

export type RetrievalMetrics = {
  retrieval_method: 'hybrid'
  chunks_considered: number
  chunks_returned: number
  average_similarity: number
  threshold_used: number
}


export type RetrievalResult = {
  chunks: RetrievedChunk[]
  metrics: RetrievalMetrics
}

function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

function tokenize(text: string) {
  return normalizeText(text)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
}

function jaccardSimilarity(left: string, right: string) {
  const leftTokens = new Set(tokenize(left))
  const rightTokens = new Set(tokenize(right))

  if (leftTokens.size === 0 && rightTokens.size === 0) return 1
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0

  let intersection = 0
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1
  }

  const union = new Set([...leftTokens, ...rightTokens]).size
  return union === 0 ? 0 : intersection / union
}

function isDuplicate(candidate: ChunkCandidate, accepted: ChunkCandidate[]) {
  const candidateNormalized = normalizeText(candidate.chunk_text)

  return accepted.some((other) => {
    const otherNormalized = normalizeText(other.chunk_text)
    if (candidateNormalized === otherNormalized) return true
    if (candidateNormalized.includes(otherNormalized) || otherNormalized.includes(candidateNormalized)) {
      return jaccardSimilarity(candidate.chunk_text, other.chunk_text) >= 0.8
    }
    return jaccardSimilarity(candidate.chunk_text, other.chunk_text) >= 0.85
  })
}

export async function embedQuery(query: string) {
  return embedText(query)
}

async function searchDocumentChunksVector(
  companyId: string,
  queryEmbedding: number[],
  limit: number,
  allowedVisibilities: Visibility[],
): Promise<RetrievedChunk[]> {
  const result = await db.query<RetrievedChunk>(

    `SELECT
       dc.id AS chunk_id,
       dc.document_id,
       d.filename,
       dc.page_number,
       dc.chunk_text,
       (1 - (dc.embedding <=> $2::vector)) AS similarity_score,
       'vector'::text AS retrieval_method
     FROM document_chunks dc
     JOIN documents d ON d.id = dc.document_id
     WHERE dc.company_id = $1
       AND d.visibility = ANY($4::text[])
     ORDER BY dc.embedding <=> $2::vector
     LIMIT $3`,
    [companyId, `[${queryEmbedding.join(',')}]`, limit, allowedVisibilities],
  )

  return result.rows.map((r) => ({ ...r, retrieval_method: 'vector' }))
}

async function searchDocumentChunksKeyword(
  companyId: string,
  query: string,
  limit: number,
  allowedVisibilities: Visibility[],
): Promise<RetrievedChunk[]> {
  // Use full-text search ranking. ts_rank_cd is unbounded; normalize by the max rank inside the same result set.
  const result = await db.query<KeywordRow>(
    `WITH ranked AS (
       SELECT
         dc.id AS chunk_id,
         dc.document_id,
         d.filename,
         dc.page_number,
         dc.chunk_text,

         ts_rank_cd(
           setweight(to_tsvector('english', COALESCE(dc.chunk_text, '')), 'A'),
           plainto_tsquery('english', $2)
         ) AS keyword_rank
       FROM document_chunks dc
       JOIN documents d ON d.id = dc.document_id
       WHERE dc.company_id = $1
         AND d.visibility = ANY($4::text[])
         AND to_tsvector('english', COALESCE(dc.chunk_text, '')) @@ plainto_tsquery('english', $2)
       ORDER BY keyword_rank DESC
       LIMIT $3
     )
     SELECT
       chunk_id,
       document_id,
       filename,
       page_number,
       chunk_text,
       CASE
         WHEN MAX(keyword_rank) OVER () = 0 THEN 0
         ELSE keyword_rank / MAX(keyword_rank) OVER ()
       END AS similarity_score,
       'keyword'::text AS retrieval_method
     FROM ranked`,
    [companyId, query, limit, allowedVisibilities],
  )

  return result.rows.map((r) => ({
    chunk_id: r.chunk_id,
    document_id: r.document_id,
    filename: r.filename,
    page_number: r.page_number,
    chunk_text: r.chunk_text,
    similarity_score: r.similarity_score,
    retrieval_method: 'keyword',
  }))
}

export function dedupeChunks(chunks: ChunkCandidate[]) {
  const accepted: ChunkCandidate[] = []

  // Keep best scoring versions first.
  const sorted = [...chunks].sort((a, b) => b.similarity_score - a.similarity_score)

  for (const chunk of sorted) {
    if (!isDuplicate(chunk, accepted)) {
      accepted.push(chunk)
    }
  }

  return accepted
}

export type RetrievalConfig = {
  similarity_threshold: number
  vector_candidate_count: number
  keyword_candidate_count: number
  final_chunk_limit: number
}

const defaultConfig: RetrievalConfig = {
  similarity_threshold: 0.35,
  vector_candidate_count: 40,
  keyword_candidate_count: 40,
  final_chunk_limit: 5,
}

export async function retrieveRelevantChunks(
  companyId: string,
  query: string,
  allowedVisibilities: Visibility[],
  config: Partial<RetrievalConfig> = {},
): Promise<RetrievalResult> {
  const cfg: RetrievalConfig = { ...defaultConfig, ...config }

  const [vectorCandidates, keywordCandidates] = await Promise.all([
    (async () => {
      const embedding = await embedQuery(query)
      return searchDocumentChunksVector(companyId, embedding, cfg.vector_candidate_count, allowedVisibilities)
    })(),
    searchDocumentChunksKeyword(companyId, query, cfg.keyword_candidate_count, allowedVisibilities),
  ])


  // Normalize merged set: both methods use a 0..1 score scale.
  const merged: ChunkCandidate[] = [...vectorCandidates, ...keywordCandidates].map((c) => ({
    ...c,
    retrieval_method: 'hybrid' as const,
  }))


  // If same chunk_id appears multiple times, keep max similarity.
  const byId = new Map<string, ChunkCandidate>()
  for (const cand of merged) {
    const existing = byId.get(cand.chunk_id)
    if (!existing || cand.similarity_score > existing.similarity_score) {
      byId.set(cand.chunk_id, cand)
    }
  }

  const deduped = dedupeChunks([...byId.values()])

  const chunksConsidered = deduped.length

  const thresholded = deduped
    .filter((c) => c.similarity_score >= cfg.similarity_threshold)
    .sort((a, b) => b.similarity_score - a.similarity_score)

  const finalChunks = thresholded.slice(0, cfg.final_chunk_limit)

  const avg =
    finalChunks.length === 0
      ? 0
      : finalChunks.reduce((sum, c) => sum + c.similarity_score, 0) / finalChunks.length

  const retrievedChunks: RetrievedChunk[] = finalChunks.map((c) => ({
    chunk_id: c.chunk_id,
    document_id: c.document_id,
    filename: c.filename,
    page_number: c.page_number,
    similarity_score: c.similarity_score,
    chunk_text: c.chunk_text,
    retrieval_method: 'hybrid',
  }))

  return {
    chunks: retrievedChunks,
    metrics: {
      retrieval_method: 'hybrid',
      chunks_considered: chunksConsidered,
      chunks_returned: retrievedChunks.length,
      average_similarity: avg,
      threshold_used: cfg.similarity_threshold,
    },
  }
}

