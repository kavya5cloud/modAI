import { useEffect, useMemo, useState } from 'react'
import { Building2, ImagePlus, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { saveCompanyProfile, getCompanyProfile, uploadCompanyLogo } from '../lib/api'
import { SaveBar, TagInput, ToastStack } from '../components/ui'
import { useToasts } from '../components/useToasts'
import type { CompanyProfile } from '../types'
import './pages.css'

type Draft = {
  company_id: string
  company_name: string
  industry: string
  employee_count: string
  description: string
  departments: string[]
  products: string[]
  goals: string[]
  logo_url: string
}

const EMPTY: Draft = {
  company_id: '',
  company_name: '',
  industry: '',
  employee_count: '',
  description: '',
  departments: [],
  products: [],
  goals: [],
  logo_url: '',
}

const toList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((v) => String(v).trim()).filter(Boolean) : []

export function CompanyProfilePage() {
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [error, setError] = useState('')
  const { toasts, push, dismiss } = useToasts()

  // The last saved state, so we can tell dirty from clean and support discard.
  const [baseline, setBaseline] = useState<Draft>(EMPTY)

  const load = async (announce = false) => {
    setError('')
    if (announce) setLoading(true)
    try {
      const res = await getCompanyProfile()
      const p = res.profile
      const next: Draft = p
        ? {
            company_id: p.company_id ?? '',
            company_name: p.company_name ?? '',
            industry: p.industry ?? '',
            employee_count: p.employee_count === null || p.employee_count === undefined ? '' : String(p.employee_count),
            description: p.description ?? '',
            departments: toList(p.departments),
            products: toList(p.products),
            goals: toList(p.goals),
            logo_url: (p as unknown as { logo_url?: string | null }).logo_url ?? '',
          }
        : EMPTY
      setBaseline(next)
      setDraft(next)
      if (announce) push('Profile reloaded')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load company profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Deferred so the initial fetch never sets state during the effect body;
    // `loading` already starts true, so there is no flash.
    let cancelled = false
    void Promise.resolve().then(() => {
      if (!cancelled) void load()
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(baseline),
    [draft, baseline],
  )

  // Warn before losing edits on a hard navigation.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }))

  const onSave = async () => {
    if (saving) return
    setError('')
    setSaving(true)
    try {
      const count = draft.employee_count.trim()
      await saveCompanyProfile({
        company_id: draft.company_id,
        company_name: draft.company_name,
        industry: draft.industry.trim() || null,
        employee_count: count === '' ? null : Number(count),
        description: draft.description.trim() || null,
        departments: draft.departments,
        products: draft.products,
        goals: draft.goals,
        logo_url: draft.logo_url || null,
      } as unknown as CompanyProfile)
      setBaseline(draft)
      push('Company profile saved')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Failed to save company profile'
      setError(message)
      push(message, 'err')
    } finally {
      setSaving(false)
    }
  }

  const onPickLogo = async (file: File | undefined) => {
    if (!file || uploadingLogo) return
    if (file.size > 2 * 1024 * 1024) {
      push('Logo must be 2 MB or smaller', 'err')
      return
    }
    setUploadingLogo(true)
    try {
      const { logoUrl } = await uploadCompanyLogo(file)
      set('logo_url', logoUrl)
      push('Logo uploaded — save to apply')
    } catch (cause) {
      push(cause instanceof Error ? cause.message : 'Logo upload failed', 'err')
    } finally {
      setUploadingLogo(false)
    }
  }

  const discard = () => {
    setDraft(baseline)
    setError('')
  }

  const filled = [
    draft.company_name,
    draft.industry,
    draft.employee_count,
    draft.description,
    draft.departments.length ? 'y' : '',
    draft.products.length ? 'y' : '',
    draft.goals.length ? 'y' : '',
  ].filter((v) => String(v).trim()).length
  const completeness = Math.round((filled / 7) * 100)

  if (loading) {
    return (
      <div className="list-page">
        <header className="page-head">
          <div>
            <h2>Company Profile</h2>
            <p className="muted">Loading your company context…</p>
          </div>
        </header>
        <div className="settings-card">
          <div className="skeleton-stack">
            {Array.from({ length: 5 }).map((_, i) => (
              <span className="skeleton" key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="list-page company-page">
      <header className="page-head">
        <div>
          <h2>Company Profile</h2>
          <p className="muted">
            Context Polaris uses on every answer. The more you fill in, the better it grounds replies.
          </p>
        </div>

        <div className="company-head-side">
          <div className="completeness" title={`${completeness}% complete`}>
            <div className="completeness-track">
              <span className="completeness-fill" style={{ width: `${completeness}%` }} />
            </div>
            <span className="completeness-label">{completeness}% complete</span>
          </div>
          <button type="button" className="icon-button" onClick={() => void load(true)} disabled={saving} title="Reload">
            <RefreshCw size={15} />
          </button>
        </div>
      </header>

      {error ? <p className="error-note">{error}</p> : null}

      <section className="settings-card">
        <div className="card-head">
          <span className="card-head-icon"><Building2 size={16} /></span>
          <div>
            <h3>Basics</h3>
            <p>Who you are. Used to frame every answer.</p>
          </div>
        </div>

        <div className="logo-row">
          <div className="logo-preview">
            {draft.logo_url ? (
              <img src={draft.logo_url} alt="Company logo" />
            ) : (
              <span className="logo-fallback">
                {(draft.company_name || 'C').slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          <div className="logo-actions">
            <label className={uploadingLogo ? 'logo-btn is-busy' : 'logo-btn'}>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                disabled={uploadingLogo}
                onChange={(e) => {
                  void onPickLogo(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
              {uploadingLogo ? <Loader2 size={14} className="spin" /> : <ImagePlus size={14} />}
              {uploadingLogo ? 'Uploading…' : draft.logo_url ? 'Replace logo' : 'Upload logo'}
            </label>

            {draft.logo_url ? (
              <button type="button" className="logo-remove" onClick={() => set('logo_url', '')}>
                <Trash2 size={13} />
                Remove
              </button>
            ) : null}

            <p className="logo-hint">PNG, JPG, WEBP or SVG — up to 2 MB.</p>
          </div>
        </div>

        <div className="field-grid">
          <label className="field">
            <span className="field-label">Company name</span>
            <input
              value={draft.company_name}
              onChange={(e) => set('company_name', e.target.value)}
              placeholder="Acme Inc."
            />
          </label>

          <label className="field">
            <span className="field-label">Industry</span>
            <input
              value={draft.industry}
              onChange={(e) => set('industry', e.target.value)}
              placeholder="Fintech"
            />
          </label>

          <label className="field">
            <span className="field-label">Employees</span>
            <input
              type="number"
              min={0}
              value={draft.employee_count}
              onChange={(e) => set('employee_count', e.target.value)}
              placeholder="50"
            />
          </label>
        </div>

        <label className="field">
          <span className="field-label">What the company does</span>
          <textarea
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
            rows={4}
            placeholder="One paragraph a new hire could read to understand the business."
          />
        </label>
      </section>

      <section className="settings-card">
        <div className="card-head">
          <span className="card-head-icon"><Building2 size={16} /></span>
          <div>
            <h3>Structure</h3>
            <p>Type a value and press Enter. Paste a comma-separated list to add several at once.</p>
          </div>
        </div>

        <div className="field">
          <span className="field-label">Departments</span>
          <TagInput
            value={draft.departments}
            onChange={(v) => set('departments', v)}
            placeholder="Engineering, Sales, People…"
          />
          <p className="tag-hint">Helps Polaris route questions to the right context.</p>
        </div>

        <div className="field">
          <span className="field-label">Products</span>
          <TagInput
            value={draft.products}
            onChange={(v) => set('products', v)}
            placeholder="Polaris, Harness…"
          />
        </div>

        <div className="field">
          <span className="field-label">Goals</span>
          <TagInput
            value={draft.goals}
            onChange={(v) => set('goals', v)}
            placeholder="Ship v2, reduce churn…"
          />
        </div>
      </section>

      <SaveBar dirty={dirty} saving={saving} onSave={() => void onSave()} onDiscard={discard} />

      {saving ? (
        <span className="sr-live" aria-live="polite">
          <Loader2 size={14} /> Saving
        </span>
      ) : null}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
