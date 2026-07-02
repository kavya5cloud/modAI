import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import type { Session } from 'next-auth'
import { randomBytes } from 'crypto'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// POST /api/team/invite — admin sends an invite
export async function POST(request: Request) {
  const session: Session | null = await getServerSession(authOptions as never)
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Only admin can send invites' }, { status: 403 })
  }

  const { companyId } = session.user
  const body = await request.json() as { email?: string; role?: string }
  const email = body.email?.toLowerCase().trim()
  const role = body.role === 'vp' ? 'vp' : 'employee'

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  // Check seat limit
  const [companyRes, countRes] = await Promise.all([
    db.query<{ seat_limit: number }>('SELECT seat_limit FROM companies WHERE id = $1', [companyId]),
    db.query<{ count: string }>('SELECT COUNT(*) FROM users WHERE company_id = $1 AND is_active = TRUE', [companyId]),
  ])
  const seatLimit = companyRes.rows[0]?.seat_limit ?? 2
  const activeCount = parseInt(countRes.rows[0]?.count ?? '0', 10)

  if (activeCount >= seatLimit) {
    return NextResponse.json({ error: `Seat limit reached (${seatLimit}). Upgrade your plan.` }, { status: 400 })
  }

  // Check not already a member
  const existing = await db.query<{ id: string }>(
    'SELECT id FROM users WHERE email = $1 AND company_id = $2 LIMIT 1',
    [email, companyId],
  )
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: 'This person is already a member.' }, { status: 400 })
  }

  // Upsert invitation (re-sending replaces old token)
  const token = randomBytes(32).toString('hex')
  await db.query(
    `INSERT INTO invitations (company_id, invited_by, email, role, token)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (company_id, email)
     DO UPDATE SET token = EXCLUDED.token, role = EXCLUDED.role, expires_at = now() + INTERVAL '7 days', accepted_at = NULL`,
    [companyId, session.user.id, email, role, token],
  )

  // In production: send email with invite link pointing to /invite?token=<token>
  // For now, return the token in the response so it can be manually shared.
  const inviteUrl = `/invite?token=${token}`

  return NextResponse.json({ ok: true, inviteUrl })
}
