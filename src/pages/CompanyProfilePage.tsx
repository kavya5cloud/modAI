import { useEffect, useMemo, useState } from 'react'
import { saveCompanyProfile, getCompanyProfile } from '../lib/api'
import type { CompanyProfile } from '../types'
import './pages.css'


type EditMode = 'view' | 'edit'

type ListState = {
  departments: string
  products: string
  goals: string
}

const toJsonArray = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return []

  // Allow either JSON array input or newline/comma separated.
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed.map((x) => String(x).trim()).filter(Boolean)
    } catch {
      // fallthrough
    }
  }

  return trimmed
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function CompanyProfilePage() {
  const [mode, setMode] = useState<EditMode>('view')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const [profile, setProfile] = useState<CompanyProfile>({
    company_id: '',
    company_name: '',
    industry: null,
    employee_count: null,
    description: null,
    departments: [],
    products: [],
    goals: [],
    created_at: new Date(),
    updated_at: new Date(),
  })

  const [lists, setLists] = useState<ListState>({
    departments: '',
    products: '',
    goals: '',
  })

  const loadProfile = async () => {
    setError('')
    try {
      const res = await getCompanyProfile()
      const p = res.profile

      if (!p) {
        setProfile({
          company_id: '',
          company_name: '',
          industry: null,
          employee_count: null,
          description: null,
          departments: [],
          products: [],
          goals: [],
          created_at: new Date(),
          updated_at: new Date(),
        })
        setLists({ departments: '', products: '', goals: '' })
        return
      }

      // departments/products/goals come back as JSON.
      setProfile(p as unknown as CompanyProfile)
      setLists({
        departments: Array.isArray(p.departments) ? (p.departments as unknown[]).join('\n') : '',
        products: Array.isArray(p.products) ? (p.products as unknown[]).join('\n') : '',
        goals: Array.isArray(p.goals) ? (p.goals as unknown[]).join('\n') : '',
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load company profile')
    }
  }

  useEffect(() => {
    void (async () => {
      await loadProfile()
    })()
  }, [])


  const canEdit = useMemo(() => mode === 'edit', [mode])

  const updateField = <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) => {
    setSaved(false)
    setProfile((prev: CompanyProfile) => ({ ...prev, [key]: value }))
  }



  const onSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSaved(false)
    setSaving(true)

    try {
      const departments = toJsonArray(lists.departments)
      const products = toJsonArray(lists.products)
      const goals = toJsonArray(lists.goals)

      // Save payload uses snake_case properties expected by API client.
      await saveCompanyProfile({
        company_id: profile.company_id,
        company_name: profile.company_name,
        industry: profile.industry,
        employee_count: profile.employee_count,
        description: profile.description,
        departments,
        products,
        goals,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      } as CompanyProfile)

      setMode('view')
      setSaved(true)
      await loadProfile()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to save company profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings-page glass-card">
      <div className="page-head">
        <div>
          <h2>Company Profile</h2>
          <p className="muted">Persistent company context for Polaris (profile management only).</p>
        </div>
        {mode === 'view' ? (
          <button className="pill-button" type="button" onClick={() => setMode('edit')}>
            Edit
          </button>
        ) : (
          <button className="pill-button" type="button" onClick={() => setMode('view')}>
            Cancel
          </button>
        )}
      </div>

      <form onSubmit={onSave}>
        <label>
          Company Name
          <input
            value={profile.company_name}
            disabled={!canEdit}
            onChange={(e) => updateField('company_name', e.target.value)}
          />
        </label>

        <label>
          Industry
          <input
            value={profile.industry ?? ''}
            disabled={!canEdit}
            onChange={(e) => updateField('industry', e.target.value ? e.target.value : null)}
          />
        </label>

        <label>
          Employee Count
          <input
            type="number"
            value={profile.employee_count ?? ''}
            disabled={!canEdit}
onChange={(e) => {
              const v = e.target.value
              updateField('employee_count', v === '' ? null : Number(v))
            }}

          />
        </label>

        <label>
          Description
          <textarea
            disabled={!canEdit}
            value={profile.description ?? ''}
            onChange={(e) => updateField('description', e.target.value ? e.target.value : null)}
            rows={5}
            style={{ resize: 'vertical' }}
          />
        </label>

        <label>
          Departments (newline or comma separated, or JSON array)
          <textarea
            disabled={!canEdit}
            value={lists.departments}
            onChange={(e) => setLists((prev) => ({ ...prev, departments: e.target.value }))}
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </label>

        <label>
          Products (newline or comma separated, or JSON array)
          <textarea
            disabled={!canEdit}
            value={lists.products}
            onChange={(e) => setLists((prev) => ({ ...prev, products: e.target.value }))}
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </label>

        <label>
          Goals (newline or comma separated, or JSON array)
          <textarea
            disabled={!canEdit}
            value={lists.goals}
            onChange={(e) => setLists((prev) => ({ ...prev, goals: e.target.value }))}
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </label>

        {mode === 'edit' ? (
          <button className="pill-button" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        ) : null}

        {saved && <p className="save-note">Saved.</p>}
        {error && <p className="error-note">{error}</p>}
      </form>
    </div>
  )
}

