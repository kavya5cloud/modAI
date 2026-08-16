export type UserAuth = {
  email: string
  companyName: string
  id?: string
  companyId?: string
  role?: 'admin' | 'vp' | 'employee'
  plan?: 'starter' | 'team' | 'business' | 'enterprise'
  planStatus?: 'trial' | 'active' | 'past_due' | 'canceled'
  seatLimit?: number
  tokensPerHr?: number
  jobTitle?: string | null
  department?: string | null
}

export type ChatSource = {
  documentId: string
  filename: string
  pageNumber: number | null
  similarityScore: number
  fileUrl: string
}


export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  sources?: ChatSource[]
}

export type Conversation = {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
}

export type UploadedDoc = {
  id: string
  name: string
  size: number
  uploadedAt: string
}

export type CompanySettings = {
  companyName: string
  industry: string
  tone: string
  responseLength: 'short' | 'balanced' | 'detailed'
  premium: boolean
}

export type CompanyProfile = {
  company_id: string
  company_name: string
  logo_url?: string | null
  industry: string | null
  employee_count: number | null
  description: string | null
  departments: unknown
  products: unknown
  goals: unknown
  created_at: Date | string
  updated_at: Date | string
}
