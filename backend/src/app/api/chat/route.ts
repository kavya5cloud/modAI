import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createConversation, getCompanySettings, insertMessage } from '@/lib/repositories'
import { buildRagMessages } from '@/lib/rag'
import { visibilitiesForRole } from '@/lib/retrieval'
import { requireSession } from '@/lib/session'
import { streamOllamaChat } from '@/lib/ollama'
import { enforceRateLimit } from '@/lib/rateLimitMiddleware'
import { createRequestLogger } from '@/lib/polarisLogger'
import { db } from '@/lib/db'

// Rough token estimate (~4 chars/token) — good enough for hourly quota accounting.
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// Best-effort: returns true if the company is within its hourly token budget.
// Fails open (allows) if the usage table is unavailable so chat is never hard-broken by accounting.
async function withinTokenBudget(companyId: string, tokensPerHr: number): Promise<boolean> {
  try {
    const res = await db.query<{ tokens_used: number }>(
      `SELECT COALESCE(SUM(tokens_used), 0)::int AS tokens_used
       FROM token_usage
       WHERE company_id = $1 AND hour_bucket = date_trunc('hour', now())`,
      [companyId],
    )
    return (res.rows[0]?.tokens_used ?? 0) < tokensPerHr
  } catch (cause) {
    console.error('[chat][token_budget] check failed, allowing:', cause instanceof Error ? cause.message : 'unknown')
    return true
  }
}

async function recordTokenUsage(companyId: string, userId: string, tokens: number): Promise<void> {
  try {
    await db.query(
      `INSERT INTO token_usage (company_id, user_id, hour_bucket, tokens_used)
       VALUES ($1, $2, date_trunc('hour', now()), $3)
       ON CONFLICT (company_id, hour_bucket)
       DO UPDATE SET tokens_used = token_usage.tokens_used + EXCLUDED.tokens_used,
                     updated_at = now()`,
      [companyId, userId, tokens],
    )
  } catch (cause) {
    console.error('[chat][token_usage] record failed:', cause instanceof Error ? cause.message : 'unknown')
  }
}


const chatSchema = z.object({
  prompt: z.string().min(1).max(8000),
  conversationId: z.uuid().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string().max(32000),
      }),
    )
    .max(100)
    .default([]),
})

export async function POST(request: Request) {
  const rl = await enforceRateLimit({
    keyPrefix: 'chat',
    limit: 60,
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

  const parsed = chatSchema.safeParse(await request.json())
  if (!parsed.success) {
    log.error(400)
    return NextResponse.json({ error: z.flattenError(parsed.error) }, { status: 400 })
  }


  const payload = parsed.data
  const companyId = session.user.companyId

  // Enforce the company's hourly token budget (plan limit) before doing any work.
  if (!(await withinTokenBudget(companyId, session.user.tokensPerHr))) {
    log.error(429)
    return NextResponse.json(
      { error: 'Hourly token limit reached for your plan. Try again later or upgrade.' },
      { status: 429 },
    )
  }

  let settings
  try {
    settings = await getCompanySettings(companyId)
  } catch (cause) {
    log.error(500)
    console.error('[chat][step:company_lookup/settings] failed', cause)
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }

  let conversationId = payload.conversationId

  if (!conversationId) {
    conversationId = await createConversation(companyId, session.user.id, payload.prompt.slice(0, 80))
  }

  if (!conversationId) {
    return NextResponse.json({ error: 'Conversation creation failed' }, { status: 500 })
  }

  const resolvedConversationId = conversationId

  try {
    await insertMessage(companyId, resolvedConversationId, 'user', payload.prompt)
  } catch (cause) {
    log.error(500)
    console.error('[chat][step:insertMessage:user] failed', cause)
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
  }

  let rag
  try {
    rag = await buildRagMessages({
      companyId,
      userPrompt: payload.prompt,
      history: [...payload.history, { role: 'user', content: payload.prompt }],
      allowedVisibilities: visibilitiesForRole(session.user.role),
      tone: settings?.tone ?? undefined,
      responseLength: settings?.response_length ?? undefined,
    })
  } catch (cause) {
    log.error(500)
    console.error('[chat][step:buildRagMessages] failed', cause)
    return NextResponse.json({ error: 'Failed to retrieve context' }, { status: 500 })
  }


  console.info(
    '[chat] retrieval summary',
    JSON.stringify({
      companyId,
      conversationId: resolvedConversationId,
      retrievedChunkCount: rag.retrievedCount,
      filenamesUsed: rag.filenames,
      similarityScores: rag.similarityScores,
      hasRelevantKnowledge: rag.hasRelevantKnowledge,
      retrievalMetrics: rag.retrievalMetrics,
    }),
  )
  console.info('[chat] ollama prompt template', rag.systemPrompt)


  let answer
  try {
    answer = await streamOllamaChat({
      messages: rag.messages,
      onToken: () => undefined,
    })
  } catch (cause) {
    log.error(500)
    console.error('[chat][step:streamOllamaChat] failed', cause)
    return NextResponse.json({ error: 'AI completion failed' }, { status: 500 })
  }

  try {
    await insertMessage(companyId, resolvedConversationId, 'assistant', answer)
  } catch (cause) {
    log.error(500)
    console.error('[chat][step:insertMessage:assistant] failed', cause)
    return NextResponse.json({ error: 'Failed to save response' }, { status: 500 })
  }

  // Account for tokens consumed this hour (prompt + completion). Best-effort.
  await recordTokenUsage(companyId, session.user.id, estimateTokens(payload.prompt) + estimateTokens(answer))




  const sources = rag.sources.map((source) => ({
    documentId: source.documentId,
    filename: source.filename,
    pageNumber: source.pageNumber,
    similarityScore: source.similarityScore,
    fileUrl: source.fileUrl,
  }))

  log.domainEvent('chat_completed', { conversationId: resolvedConversationId })
  log.success(200)
  return NextResponse.json({
    answer,
    sources,
    conversationId: resolvedConversationId,
    retrievalMetrics: rag.retrievalMetrics,
  })
}


