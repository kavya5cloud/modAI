import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/team — list company members
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { companyId } = session.user

  const result = await db.query<{
    id: string
    email: string
    role: string
    job_title: string | null
    department: string | null
    is_active: boolean
    created_at: Date
  }>(
    `SELECT id, email, role, job_title, department, is_active, created_at
     FROM users
     WHERE company_id = $1
     ORDER BY created_at ASC`,
    [companyId],
  )

  return NextResponse.json({ members: result.rows })
}
