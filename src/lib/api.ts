import type { CompanyProfile, CompanySettings } from '../types'

// The frontend always talks to the backend same-origin via relative /api paths:
//   - Dev:  Vite proxy forwards /api -> backend (vite.config.ts)
//   - Prod: Vercel rewrite forwards /api -> backend (vercel.json)
// Same-origin keeps NextAuth cookies same-site, so the csrf -> callback ->
// session handshake works without CORS or SameSite=None (which browsers'
// third-party-cookie blocking would otherwise break).
const BASE = ''



async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const contentType = response.headers.get('content-type') ?? ''
  const rawText = await response.text()

  if (!response.ok) {
    throw new Error(rawText || `Request failed: ${response.status}`)
  }

  if (!contentType.includes('application/json')) {
    throw new Error(
      `Backend returned non-JSON response. Check backend server/proxy configuration for ${path}.`,
    )
  }

  return JSON.parse(rawText) as T
}

export type SessionUser = {
  id: string
  email: string
  companyId: string
  companyName: string
  role?: 'admin' | 'vp' | 'employee'
  plan?: 'starter' | 'team' | 'business' | 'enterprise'
  planStatus?: 'trial' | 'active' | 'past_due' | 'canceled'
  seatLimit?: number
  tokensPerHr?: number
  jobTitle?: string | null
  department?: string | null
}

export async function authWithCredentials(payload: {
  email: string
  password: string
  mode: 'login' | 'signup'
  companyName?: string
}): Promise<SessionUser> {
  const csrf = await request<{ csrfToken: string }>('/api/auth/csrf', {
    method: 'GET',
    headers: {},
  })

  const form = new URLSearchParams()
  form.set('csrfToken', csrf.csrfToken)
  form.set('email', payload.email)
  form.set('password', payload.password)
  form.set('mode', payload.mode)
  form.set('companyName', payload.companyName ?? '')
  form.set('json', 'true')

  const callbackUrl = `${BASE}/api/auth/callback/credentials`

  const response = await fetch(callbackUrl, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    redirect: 'manual',
  })

  const location = response.headers.get('location')
  const contentType = response.headers.get('content-type') ?? ''
  const text = await response.text().catch(() => '')

  let jsonBody: { ok?: boolean; error?: string; url?: string } | null = null
  if (contentType.includes('application/json') && text) {
    try {
      jsonBody = JSON.parse(text) as { ok?: boolean; error?: string; url?: string }
    } catch {
      jsonBody = null
    }
  }

  // Surface the callback outcome so auth failures are easier to diagnose.
  console.info('[auth] credentials callback', {
    status: response.status,
    location,
    responseUrl: response.url,
    error: jsonBody?.error,
    ok: jsonBody?.ok,
    url: jsonBody?.url,
  })

  const redirectTarget = location ?? jsonBody?.url ?? ''
  const redirectedToError =
    redirectTarget.includes('/api/auth/error') ||
    jsonBody?.error != null ||
    response.status >= 400

  // NextAuth sets cookies via Set-Cookie; verify by calling session endpoint.
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    console.info('[auth] session not established after callback', {
      status: response.status,
      location,
      responseUrl: response.url,
    })
    throw new Error(
      redirectedToError
        ? 'Authentication failed. Please check your credentials.'
        : `Authentication failed. Session not established.${text ? ' ' + text.slice(0, 200) : ''}`,
    )
  }

  console.info('[auth] session established', {
    id: sessionUser.id,
    email: sessionUser.email,
    companyId: sessionUser.companyId,
    companyName: sessionUser.companyName,
  })

  return sessionUser
}

export async function getSessionUser() {
  // NextAuth's /api/auth/session returns JSON `null` (not `{}`) when there is no
  // session, so `session` can legitimately be null — guard before reading .user.
  const session = await request<{ user?: SessionUser } | null>('/api/auth/session', {
    method: 'GET',
    headers: {},
  })
  return session?.user ?? null
}

export async function signOutSession() {
  const csrf = await request<{ csrfToken: string }>('/api/auth/csrf', {
    method: 'GET',
    headers: {},
  })
  const form = new URLSearchParams()
  form.set('csrfToken', csrf.csrfToken)
  form.set('json', 'true')
  await fetch(`${BASE}/api/auth/signout`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  })
}

export type ConversationRow = {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export async function getConversations() {
  return request<{ conversations: ConversationRow[] }>('/api/conversations')
}

export async function getConversation(conversationId: string) {
  return request<{ conversation: Array<{ id: string; title?: string; created_at: string; role: 'user' | 'assistant' | 'system'; content: string; position: number }> }>(
    `/api/conversations?conversationId=${encodeURIComponent(conversationId)}`,
  )
}

export async function createConversation(payload: { title: string }) {
  return request<{ id: string }>('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({ title: payload.title }),
  })
}


export type FileRow = {
  id: string
  filename: string
  content_type: string
  size_bytes: number
  status: 'pending' | 'processing' | 'ready' | 'failed'
  created_at: string
}

export async function getFiles() {
  return request<{ files: FileRow[] }>('/api/files')
}

export type DashboardMetrics = {
  total_documents: number
  total_chunks: number
  indexed_documents: number
  total_conversations: number
  total_users: number
  total_departments: number

  recent_uploads: Array<{
    id: string
    filename: string
    size_bytes: number
    status: 'pending' | 'processing' | 'ready' | 'failed'
    created_at: string
  }>
  recent_conversations: Array<{
    id: string
    title: string
    created_at: string
    updated_at: string
  }>

  policies_count: number
  process_documents_count: number

  storage_usage: number

  last_document_uploaded_at: string | null
  last_conversation_at: string | null
}

export async function getDashboardMetrics() {
  return request<DashboardMetrics>('/api/dashboard/metrics', { method: 'GET' })
}


export async function getSettings() {
  return request<{
    settings: {
      company_name: string
      industry: string | null
      tone: string | null
      response_length: 'short' | 'balanced' | 'detailed' | null
    } | null
  }>('/api/settings')
}

export async function saveSettings(payload: CompanySettings) {
  return request<{ ok: boolean }>('/api/settings', {
    method: 'POST',
    body: JSON.stringify({
      companyName: payload.companyName,
      industry: payload.industry,
      tone: payload.tone,
      responseLength: payload.responseLength,
    }),
  })
}

export async function getCompanyProfile() {
  return request<{ profile: CompanyProfile | null }>('/api/company', {
    method: 'GET',
  })
}

export async function saveCompanyProfile(payload: CompanyProfile) {
  return request<{ ok: boolean }>('/api/company', {
    method: 'POST',
    body: JSON.stringify({
      companyName: payload.company_name,
      industry: payload.industry,
      employeeCount: payload.employee_count,
      description: payload.description,
      departments: payload.departments,
      products: payload.products,
      goals: payload.goals,
      logoUrl: (payload as unknown as { logo_url?: string | null }).logo_url ?? null,
    }),
  })
}

/** Uploads a company logo and returns its public URL. */
export async function uploadCompanyLogo(file: File) {
  const body = new FormData()
  body.append('file', file)
  const response = await fetch(`${BASE}/api/company/logo`, {
    method: 'POST',
    credentials: 'include',
    body,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : 'Logo upload failed')
  }
  return data as { logoUrl: string; key: string }
}


export async function uploadDocument(file: File, visibility: 'open' | 'internal' | 'confidential' = 'open') {
  const upload = await request<{
    documentId: string
    key: string
    uploadUrl: string
    fileUrl: string
  }>('/api/upload-url', {
    method: 'POST',
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      visibility,
    }),
  })

  const uploadRes = await fetch(upload.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
  })
  if (!uploadRes.ok) throw new Error(`Upload failed for ${file.name}`)

  await request<{ ok: boolean; document: FileRow }>('/api/files/' + upload.documentId, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'pending' }),
  })

  await request<{ ok: boolean; chunks: number; extractedCharacters: number }>('/api/ingest', {
    method: 'POST',
    body: JSON.stringify({
      documentId: upload.documentId,
      key: upload.key,
      filename: file.name,
    }),
  })

  return upload
}

export async function deleteDocument(id: string) {
  return request<{ ok: boolean }>(`/api/files/${id}`, {
    method: 'DELETE',
  })
}

export type KnowledgeDocument = {
  id: string
  filename: string
  content_type: string
  created_at: string
  status: 'pending' | 'processing' | 'ready' | 'failed'
  chunk_count: number
  fileUrl: string
}

export async function getKnowledgeCenter() {
  return request<{
    summary: {
      totalDocuments: number
      totalChunks: number
      indexedDocuments: number
      lastUpload: string | null
    }
    documents: KnowledgeDocument[]
  }>('/api/knowledge')
}

export type ChatSource = {
  documentId: string
  filename: string
  pageNumber: number | null
  similarityScore: number
  fileUrl: string
}


export async function streamChat(args: {
  prompt: string
  conversationId?: string
  history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
}): Promise<{
  answer: string
  sources: ChatSource[]
  conversationId: string
}> {
  const response = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: args.prompt,
      conversationId: args.conversationId,
      history: args.history,
    }),
  })

  const rawText = await response.text()
  if (!response.ok) {
    throw new Error(rawText || 'Chat request failed')
  }

  return JSON.parse(rawText) as {
    answer: string
    sources: ChatSource[]
    conversationId: string
  }
}
