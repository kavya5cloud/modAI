import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import type { Session } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const PLAN_CONFIGS = {
  starter:    { price_cents: 500,  seat_limit: 2,  tokens_per_hr: 50000  },
  team:       { price_cents: 2000, seat_limit: 10, tokens_per_hr: 150000 },
  business:   { price_cents: 6000, seat_limit: 50, tokens_per_hr: 500000 },
  enterprise: { price_cents: 0,    seat_limit: 9999, tokens_per_hr: 1000000 },
} as const

type Plan = keyof typeof PLAN_CONFIGS

// GET /api/billing — current plan + invoice history
export async function GET() {
  const session: Session | null = await getServerSession(authOptions as never)
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { companyId } = session.user

  const [companyRes, invoicesRes, usageRes] = await Promise.all([
    db.query<{
      plan: Plan
      plan_status: string
      seat_limit: number
      tokens_per_hr: number
      ollama_mode: string
      ollama_url: string | null
    }>(
      'SELECT plan, plan_status, seat_limit, tokens_per_hr, ollama_mode, ollama_url FROM companies WHERE id = $1',
      [companyId],
    ),
    db.query<{
      id: string
      plan: string
      amount_cents: number
      status: string
      period_start: Date
      period_end: Date
      created_at: Date
    }>(
      'SELECT id, plan, amount_cents, status, period_start, period_end, created_at FROM billing_invoices WHERE company_id = $1 ORDER BY created_at DESC LIMIT 12',
      [companyId],
    ),
    db.query<{ tokens_used: number }>(
      `SELECT COALESCE(SUM(tokens_used), 0)::int AS tokens_used
       FROM token_usage
       WHERE company_id = $1 AND hour_bucket = date_trunc('hour', now())`,
      [companyId],
    ),
  ])

  const company = companyRes.rows[0]
  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  return NextResponse.json({
    plan: company.plan,
    planStatus: company.plan_status,
    seatLimit: company.seat_limit,
    tokensPerHr: company.tokens_per_hr,
    tokensUsedThisHour: usageRes.rows[0]?.tokens_used ?? 0,
    ollamaMode: company.ollama_mode,
    ollamaUrl: company.ollama_url,
    invoices: invoicesRes.rows,
  })
}

// POST /api/billing/upgrade — switch plan (mock: no real payment)
export async function POST(request: Request) {
  const session: Session | null = await getServerSession(authOptions as never)
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Only admin can change the plan' }, { status: 403 })
  }

  const { companyId } = session.user
  const body = await request.json() as { plan?: Plan; ollamaMode?: 'offline' | 'cloud' }
  const { plan, ollamaMode } = body

  if (plan && !PLAN_CONFIGS[plan]) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const cfg = plan ? PLAN_CONFIGS[plan] : null

  await db.query(
    `UPDATE companies SET
       plan            = COALESCE($2, plan),
       seat_limit      = COALESCE($3, seat_limit),
       tokens_per_hr   = COALESCE($4, tokens_per_hr),
       ollama_mode     = COALESCE($5, ollama_mode),
       plan_status     = 'active'
     WHERE id = $1`,
    [companyId, plan ?? null, cfg?.seat_limit ?? null, cfg?.tokens_per_hr ?? null, ollamaMode ?? null],
  )

  // Create a mock invoice if the plan actually changed
  if (plan && cfg && cfg.price_cents > 0) {
    const now = new Date()
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
    await db.query(
      `INSERT INTO billing_invoices (company_id, plan, amount_cents, status, period_start, period_end)
       VALUES ($1, $2, $3, 'paid', $4, $5)`,
      [companyId, plan, cfg.price_cents, now.toISOString(), periodEnd.toISOString()],
    )
  }

  return NextResponse.json({ ok: true })
}
