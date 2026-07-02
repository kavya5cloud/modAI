import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { promises as fs } from 'fs'
import path from 'path'

const tokenSchema = z.object({
  token: z.string().min(1),
})

const uploadsRoot = path.join(process.cwd(), 'backend', 'uploads')

function sanitizeKeyForLocalStorage(key: string) {
  const normalized = path.normalize(key).replace(/^([/\\])+/, '')
  if (normalized.includes('..')) throw new Error('Invalid storage key')
  return normalized
}

function localObjectPath(key: string) {
  return path.join(uploadsRoot, sanitizeKeyForLocalStorage(key))
}

export async function PUT(request: NextRequest) {
  // Client sends raw bytes to this endpoint.
  // The uploadUrl returned by localStorageProvider points here.
  const url = new URL(request.url)
  const parsed = tokenSchema.safeParse({ token: url.searchParams.get('token') })
  if (!parsed.success) {
    return NextResponse.json({ error: z.flattenError(parsed.error) }, { status: 400 })
  }

  const token = parsed.data.token

  // token format: companyId:userId:uploadId:key
  const parts = token.split(':')
  if (parts.length < 4) {
    return NextResponse.json({ error: 'Invalid upload token' }, { status: 400 })
  }

  const key = parts.slice(3).join(':')

  const filePath = localObjectPath(key)
  await fs.mkdir(path.dirname(filePath), { recursive: true })

  const buffer = Buffer.from(await request.arrayBuffer())
  await fs.writeFile(filePath, buffer)

  // Keep response minimal.
  return new NextResponse(null, { status: 204 })
}
