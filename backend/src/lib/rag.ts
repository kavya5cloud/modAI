import type { ChatTurn } from '@/types/domain'
import { buildCompanyContextPrompt } from './companyContext'
import {
  retrieveRelevantChunks,
  type RetrievedChunk,
  type RetrievalMetrics,
  type Visibility,
} from './retrieval'

export type RetrievedSource = {
  documentId: string
  filename: string
  pageNumber: number | null
  similarityScore: number
  fileUrl: string
}


export type RagBuildResult = {
  messages: ChatTurn[]
  retrievedCount: number
  filenames: string[]
  similarityScores: number[]
  sources: RetrievedSource[]
  hasRelevantKnowledge: boolean
  systemPrompt: string
  retrievalMetrics: RetrievalMetrics
}

function optimizeContext(chunks: RetrievedChunk[]): RetrievedChunk[] {
  // Reduce redundancy by keeping top-N chunks per document.
  // This is token-efficient and avoids repeating same document sections.
  const perDocLimit = 2

  const byDoc = new Map<string, RetrievedChunk[]>()
  for (const c of chunks) {
    const key = c.document_id
    const arr = byDoc.get(key) ?? []
    arr.push(c)
    byDoc.set(key, arr)
  }

  for (const [docId, arr] of byDoc.entries()) {
    arr.sort((a, b) => b.similarity_score - a.similarity_score)
    byDoc.set(docId, arr)
  }

  const orderedDocIds: string[] = []
  const seen = new Set<string>()

  const sortedGlobal = [...chunks].sort((a, b) => b.similarity_score - a.similarity_score)
  for (const c of sortedGlobal) {
    if (!seen.has(c.document_id)) {
      orderedDocIds.push(c.document_id)
      seen.add(c.document_id)
    }
  }

  const result: RetrievedChunk[] = []
  for (const docId of orderedDocIds) {
    const arr = byDoc.get(docId) ?? []
    result.push(...arr.slice(0, perDocLimit))
  }

  return result
}

function buildDocumentContext(chunks: RetrievedChunk[]) {
  const optimized = optimizeContext(chunks)

  return optimized
    .map((chunk) => {
      const pageLabel = chunk.page_number === null ? 'unknown' : String(chunk.page_number)
      return `[Document: ${chunk.filename}]\n[Page: ${pageLabel}]\n${chunk.chunk_text}`
    })
    .join('\n\n')
}

function buildSystemPrompt(args: {
  tone?: string
  responseLength?: string
  companyContextPrompt?: string
  retrievedContext?: string
}) {
  const polarisInstructions = `You are Polaris Chat, an AI assistant for company knowledge.
Use retrieved company documents as the primary source of truth whenever they are relevant.
If the documents do not contain the answer, clearly say so and fall back to general reasoning only when needed.
Preferred tone: ${args.tone ?? 'confident and concise'}.
Preferred response length: ${args.responseLength ?? 'balanced'}.`

  const companyBlock = args.companyContextPrompt
    ? `\n\nCompany Context (company intelligence):\n${args.companyContextPrompt}`
    : ''

  const retrievedBlock = args.retrievedContext
    ? `\n\nRetrieved Company Knowledge:\n${args.retrievedContext}`
    : `\n\nRetrieved Company Knowledge:\nNo relevant company documents were retrieved.\nAnswer normally, but do not claim document support that does not exist.`

  const rules = `\n\nRules:\n- Use company context when relevant (goals, products, departments).\n- Prioritize company goals and products when they help interpret the question.\n- Use company documents as source of truth for factual claims about internal knowledge.`

  return `${polarisInstructions}${companyBlock}${retrievedBlock}${rules}`
}

export async function buildRagMessages(args: {
  companyId: string
  userPrompt: string
  history: ChatTurn[]
  allowedVisibilities: Visibility[]
  tone?: string
  responseLength?: string
}): Promise<RagBuildResult> {
  const [{ chunks: retrieved, metrics: retrievalMetrics }, companyContextPrompt] = await Promise.all([
    retrieveRelevantChunks(args.companyId, args.userPrompt, args.allowedVisibilities),
    buildCompanyContextPrompt(args.companyId),
  ])

  const retrievedContext = retrieved.length > 0 ? buildDocumentContext(retrieved) : ''

  const systemPrompt = buildSystemPrompt({
    tone: args.tone,
    responseLength: args.responseLength,
    companyContextPrompt,
    retrievedContext,
  })

  const messages: ChatTurn[] = [{ role: 'system', content: systemPrompt }, ...args.history]

  return {
    messages,
    retrievedCount: retrieved.length,
    filenames: retrieved.map((chunk) => chunk.filename),
    similarityScores: retrieved.map((chunk) => chunk.similarity_score),
    sources: await (async () => {
      const documentIds = Array.from(new Set(retrieved.map((c) => c.document_id)))

      // Resolve fileUrl from documents.storage_key via active storage provider
      const { storage } = await import('@/lib/storage')


      // Note: rag.ts runs in the chat request path; we do a best-effort metadata join here.
      const { db } = await import('@/lib/db')

      const result = documentIds.length
        ? await db.query<{ document_id: string; storage_key: string }>(
            `SELECT d.id AS document_id, d.storage_key
             FROM documents d
             WHERE d.id = ANY($1::uuid[])`,
            [documentIds],
          )
        : { rows: [] as Array<{ document_id: string; storage_key: string }> }

      // pg returns { rows }, so treat anything else as empty.
      const rows: Array<{ document_id: string; storage_key: string }> =
        'rows' in result && Array.isArray(result.rows) ? result.rows : []

      const fileUrlByDocId = new Map<string, string>(
        rows.map((r) => [r.document_id, storage.buildObjectUrl(r.storage_key)]),
      )


      return retrieved.map((chunk) => ({
        documentId: chunk.document_id,
        filename: chunk.filename,
        pageNumber: chunk.page_number,
        similarityScore: chunk.similarity_score,
        // Never throw if metadata join fails.
        fileUrl: fileUrlByDocId.get(chunk.document_id) ?? storage.buildObjectUrl(''),
      }))

    })(),



    hasRelevantKnowledge: retrieved.length > 0,
    systemPrompt,
    retrievalMetrics,
  }
}
