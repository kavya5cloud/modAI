import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession } from '@/lib/session'
import { enforceRateLimit } from '@/lib/rateLimitMiddleware'
import { getCompanyProfile, upsertCompanyProfile } from '@/lib/repositories'
import { createRequestLogger } from '@/lib/polarisLogger'

const profileSchema = z.object({
  companyName: z.string().min(1).max(120),
  industry: z.string().trim().max(80).nullable().optional(),
  employeeCount: z.number().int().nonnegative().nullable().optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  departments: z.array(z.string().trim().min(1).max(120)).optional(),
  products: z.array(z.string().trim().min(1).max(120)).optional(),
  goals: z.array(z.string().trim().min(1).max(120)).optional(),
  logoUrl: z.string().trim().max(2000).nullable().optional(),
})

export async function GET(request: Request) {
  const { session, error } = await requireSession()
  const log = createRequestLogger({ request, userId: session?.user.id ?? null, companyId: session?.user.companyId ?? null, eventType: 'request_start' })
  log.start()

  if (error) {
    log.error(401)
    return error
  }

  try {
    const profile = await getCompanyProfile(session.user.companyId)
    log.success(200)
    return NextResponse.json({ profile })
  } catch (cause) {
    log.error(500)
    console.error('[company] DB error:', cause instanceof Error ? cause.message : 'unknown')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const rl = await enforceRateLimit({
    keyPrefix: 'company_profile_update',
    limit: 30,
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

  const parsed = profileSchema.safeParse(await request.json())
  if (!parsed.success) {
    log.error(400)
    return NextResponse.json({ error: z.flattenError(parsed.error) }, { status: 400 })
  }

  try {
    await upsertCompanyProfile(session.user.companyId, {
      companyName: parsed.data.companyName,
      industry: parsed.data.industry ?? null,
      employeeCount: parsed.data.employeeCount ?? null,
      description: parsed.data.description ?? null,
      departments: parsed.data.departments ?? [],
      products: parsed.data.products ?? [],
      goals: parsed.data.goals ?? [],
      logoUrl: parsed.data.logoUrl ?? null,
    })

    log.domainEvent('company_profile_updated', { companyId: session.user.companyId })
    log.success(200)
    return NextResponse.json({ ok: true })
  } catch (cause) {
    log.error(500)
    console.error('[company] DB error:', cause instanceof Error ? cause.message : 'unknown')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



