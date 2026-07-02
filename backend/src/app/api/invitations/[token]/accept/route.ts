import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

// POST /api/invitations/[token]/accept — create user + mark invite accepted
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const body = await request.json() as { password?: string; jobTitle?: string; department?: string }
  const { password, jobTitle, department } = body

  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }
  if (!jobTitle?.trim()) {
    return NextResponse.json({ error: 'Job title is required.' }, { status: 400 })
  }

  const invResult = await db.query<{
    id: string
    company_id: string
    email: string
    role: 'vp' | 'employee'
    invited_by: string
    expires_at: Date
    accepted_at: Date | null
  }>(
    'SELECT id, company_id, email, role, invited_by, expires_at, accepted_at FROM invitations WHERE token = $1 LIMIT 1',
    [token],
  )

  const inv = invResult.rows[0]
  if (!inv) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  if (inv.accepted_at) return NextResponse.json({ error: 'Already accepted' }, { status: 410 })
  if (new Date(inv.expires_at) < new Date()) return NextResponse.json({ error: 'Invite expired' }, { status: 410 })

  // Check user doesn't already exist
  const existingUser = await db.query<{ id: string }>(
    'SELECT id FROM users WHERE email = $1 LIMIT 1',
    [inv.email],
  )
  if (existingUser.rows.length > 0) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
  }

  const hash = await bcrypt.hash(password, 12)

  await db.query(
    `INSERT INTO users (email, password_hash, company_id, role, job_title, department, invited_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [inv.email, hash, inv.company_id, inv.role, jobTitle.trim(), department?.trim() ?? null, inv.invited_by],
  )

  await db.query(
    'UPDATE invitations SET accepted_at = now() WHERE id = $1',
    [inv.id],
  )

  return NextResponse.json({ ok: true })
}
