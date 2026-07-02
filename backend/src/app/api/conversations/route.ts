import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createConversation, listConversations, loadConversation } from '@/lib/repositories'
import { requireSession } from '@/lib/session'

const createSchema = z.object({
  title: z.string().min(1).max(160),
  conversationId: z.uuid().optional(),
})

export async function GET(request: Request) {
  const { session, error } = await requireSession()
  if (error) return error

  const url = new URL(request.url)
  const conversationId = url.searchParams.get('conversationId')

  if (conversationId) {
    const rows = await loadConversation(session.user.companyId, conversationId)
    return NextResponse.json({ conversation: rows })
  }

  const list = await listConversations(session.user.companyId)
  return NextResponse.json({ conversations: list })
}

export async function POST(request: Request) {
  const { session, error } = await requireSession()
  if (error) return error

  const parsed = createSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: z.flattenError(parsed.error) }, { status: 400 })
  }

  const id = await createConversation(session.user.companyId, session.user.id, parsed.data.title)
  return NextResponse.json({ id }, { status: 201 })
}
