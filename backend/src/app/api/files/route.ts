import { NextResponse } from 'next/server'
import { listDocuments } from '@/lib/repositories'
import { requireSession } from '@/lib/session'

export async function GET() {
  const { session, error } = await requireSession()
  if (error) return error

  const files = await listDocuments(session.user.companyId)
  return NextResponse.json({ files })
}
