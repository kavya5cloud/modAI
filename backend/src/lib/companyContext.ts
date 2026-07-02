import { getCompanyProfile } from './repositories'

function compactJson(value: unknown) {
  if (value === undefined || value === null) return ''
  try {
    const s = JSON.stringify(value)
    if (s === '{}' || s === '[]') return ''
    return s
  } catch {
    return ''
  }
}

function formatDepartments(departments: unknown) {
  // departments is stored as JSONB; best-effort formatting.
  // If it is an array of strings/objects, stringify compactly.
  const s = compactJson(departments)
  return s
}

function formatProducts(products: unknown) {
  return compactJson(products)
}

function formatGoals(goals: unknown) {
  return compactJson(goals)
}

export async function getCompanyContext(companyId: string) {
  const profile = await getCompanyProfile(companyId)
  if (!profile) {
    return null
  }

  return {
    company_name: profile.company_name,
    industry: profile.industry,
    products: profile.products,
    goals: profile.goals,
    departments: profile.departments,
    description: profile.description,
  }
}

export async function buildCompanyContextPrompt(companyId: string) {
  const ctx = await getCompanyContext(companyId)
  if (!ctx) return ''

  const industry = ctx.industry ? String(ctx.industry) : ''
  const products = formatProducts(ctx.products)
  const goals = formatGoals(ctx.goals)
  const departments = formatDepartments(ctx.departments)
  const description = ctx.description ? String(ctx.description) : ''

  const lines = [
    `Company: ${ctx.company_name}`,
    industry ? `Industry: ${industry}` : '',
    products ? `Products: ${products}` : '',
    goals ? `Goals: ${goals}` : '',
    departments ? `Departments: ${departments}` : '',
    description ? `Description: ${description}` : '',
  ].filter(Boolean)

  return lines.join('\n')
}

