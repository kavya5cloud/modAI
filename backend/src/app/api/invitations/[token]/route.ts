import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/invitations/[token] — validate invite and return info
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const result = await db.query<{
    email: string
    role: string
    company_name: string
    invited_by_email: string
    expires_at: Date
    accepted_at: Date | null
  }>(
    `SELECT i.email, i.role, c.name AS company_name, u.email AS invited_by_email,
            i.expires_at, i.accepted_at
     FROM invitations i
     JOIN companies c ON c.id = i.company_id
     JOIN users u ON u.id = i.invited_by
     WHERE i.token = $1
     LIMIT 1`,
    [token],
  )

  const inv = result.rows[0]
  if (!inv) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }
  if (inv.accepted_at) {
    return NextResponse.json({ error: 'This invite has already been used.' }, { status: 410 })
  }
  if (new Date(inv.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite has expired. Ask your admin to resend.' }, { status: 410 })
  }

  return NextResponse.json({
    email: inv.email,
    role: inv.role,
    companyName: inv.company_name,
    invitedBy: inv.invited_by_email,
  })
}
