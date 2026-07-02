export type AppSessionUser = {
  id: string
  email: string
  companyId: string
  companyName: string
}

export type ChatTurn = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export type SearchChunk = {
  id: string
  content: string
  metadata: Record<string, unknown>
  score: number
}
