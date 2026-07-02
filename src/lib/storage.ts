import type {
  CompanySettings,
  Conversation,
  UploadedDoc,
  UserAuth,
} from '../types'

const KEYS = {
  auth: 'modai.auth',
  conversations: 'modai.conversations',
  files: 'modai.files',
  settings: 'modai.settings',
}

const parse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export const getAuth = (): UserAuth | null =>
  parse<UserAuth | null>(localStorage.getItem(KEYS.auth), null)

export const setAuth = (auth: UserAuth) =>
  localStorage.setItem(KEYS.auth, JSON.stringify(auth))

export const clearAuth = () => localStorage.removeItem(KEYS.auth)

export const getConversations = (): Conversation[] =>
  parse<Conversation[]>(localStorage.getItem(KEYS.conversations), [])

export const setConversations = (items: Conversation[]) =>
  localStorage.setItem(KEYS.conversations, JSON.stringify(items))

export const getFiles = (): UploadedDoc[] =>
  parse<UploadedDoc[]>(localStorage.getItem(KEYS.files), [])

export const setFiles = (items: UploadedDoc[]) =>
  localStorage.setItem(KEYS.files, JSON.stringify(items))

export const getSettings = (): CompanySettings => {
  const auth = getAuth()
  return parse<CompanySettings>(localStorage.getItem(KEYS.settings), {
    companyName: auth?.companyName ?? 'modAI Labs',
    industry: 'Fintech',
    tone: 'Confident and friendly',
    responseLength: 'balanced',
    premium: true,
  })
}

export const setSettings = (settings: CompanySettings) =>
  localStorage.setItem(KEYS.settings, JSON.stringify(settings))
