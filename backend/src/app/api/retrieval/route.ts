import { NextResponse } from 'next/server'
import { z } from 'zod'
import { retrieveRelevantChunks, visibilitiesForRole } from '@/lib/retrieval'
import { requireSession } from '@/lib/session'
import { createRequestLogger } from '@/lib/polarisLogger'

const schema = z.object({
  query: z.string().min(1),
})

export async function POST(request: Request) {
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

  try {
    const { chunks, metrics } = await retrieveRelevantChunks(
      session.user.companyId,
      parsed.data.query,
      visibilitiesForRole(session.user.role),
    )
    log.domainEvent('retrieval_executed', { retrievedChunks: chunks.length, thresholdUsed: metrics.threshold_used })
    log.success(200)
    return NextResponse.json({ chunks, metrics })
  } catch (cause) {
    log.error(500)
    console.error('[retrieval] error:', cause instanceof Error ? cause.message : 'unknown')
    return NextResponse.json({ error: 'Retrieval failed' }, { status: 500 })
  }
}

