import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCompanySettings, upsertCompanySettings } from '@/lib/repositories'
import { requireSession } from '@/lib/session'

const settingsSchema = z.object({
  companyName: z.string().min(1).max(120),
  industry: z.string().min(1).max(80),
  tone: z.string().min(1).max(160),
  responseLength: z.enum(['short', 'balanced', 'detailed']),
})

export async function GET() {
  const { session, error } = await requireSession()
  if (error) return error

  const settings = await getCompanySettings(session.user.companyId)
  return NextResponse.json({ settings })
}

export async function POST(request: Request) {
  const { session, error } = await requireSession()
  if (error) return error

  const parsed = settingsSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: z.flattenError(parsed.error) }, { status: 400 })
  }

  await upsertCompanySettings(session.user.companyId, parsed.data)
  return NextResponse.json({ ok: true })
}
