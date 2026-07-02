import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// PATCH /api/team/[memberId]/role — change role
export async function PATCH(request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Only admin can change roles' }, { status: 403 })
  }

  const { memberId } = await params
  const { companyId } = session.user
  const body = await request.json() as { role?: string }
  const role = body.role === 'vp' ? 'vp' : 'employee'

  await db.query(
    'UPDATE users SET role = $1 WHERE id = $2 AND company_id = $3 AND role != $4',
    [role, memberId, companyId, 'admin'],
  )

  return NextResponse.json({ ok: true })
}

// DELETE /api/team/[memberId] — deactivate member
export async function DELETE(_request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Only admin can remove members' }, { status: 403 })
  }

  const { memberId } = await params
  const { companyId, id: adminId } = session.user
  if (memberId === adminId) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
  }

  await db.query(
    'UPDATE users SET is_active = FALSE WHERE id = $1 AND company_id = $2',
    [memberId, companyId],
  )

  return NextResponse.json({ ok: true })
}
