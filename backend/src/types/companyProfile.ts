export type CompanyProfile = {
  company_id: string
  company_name: string
  industry: string | null
  employee_count: number | null
  description: string | null
  departments: unknown
  products: unknown
  goals: unknown
  created_at: Date
  updated_at: Date
}

export type CompanyProfilePayload = {
  companyName: string
  industry: string | null
  employeeCount: number | null
  description: string | null
  departments: unknown
  products: unknown
  goals: unknown
}

