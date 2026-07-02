import { useEffect, useState } from 'react'
import { getSettings, saveSettings } from '../lib/api'
import type { CompanySettings } from '../types'
import './pages.css'

export function SettingsPage() {
  const [settings, setLocalSettings] = useState<CompanySettings>({
    companyName: 'modAI Labs',
    industry: 'Fintech',
    tone: 'Confident and friendly',
    responseLength: 'balanced',
    premium: true,
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const response = await getSettings()
        if (!response.settings) return
        setLocalSettings((prev) => ({
          ...prev,
          companyName: response.settings?.company_name ?? prev.companyName,
          industry: response.settings?.industry ?? prev.industry,
          tone: response.settings?.tone ?? prev.tone,
          responseLength: response.settings?.response_length ?? prev.responseLength,
        }))
      } catch {
        // keep defaults
      }
    })()
  }, [])

  const update = <K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) => {
    setSaved(false)
    setLocalSettings((prev) => ({ ...prev, [key]: value }))
  }

  const onSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    try {
      await saveSettings(settings)
      setSaved(true)
    } catch (cause) {
      setSaved(false)
      setError(cause instanceof Error ? cause.message : 'Failed to save settings')
    }
  }

  return (
    <div className="settings-page glass-card">
      <h2>Company Settings</h2>
      <p className="muted">Manage your profile, AI style, and premium preferences.</p>

      <form onSubmit={onSave}>
        <label>
          Company Name
          <input
            value={settings.companyName}
            onChange={(event) => update('companyName', event.target.value)}
          />
        </label>
        <label>
          Industry
          <input value={settings.industry} onChange={(event) => update('industry', event.target.value)} />
        </label>
        <label>
          Assistant Tone
          <input value={settings.tone} onChange={(event) => update('tone', event.target.value)} />
        </label>
        <label>
          Response Length
          <select
            value={settings.responseLength}
            onChange={(event) =>
              update('responseLength', event.target.value as CompanySettings['responseLength'])
            }
          >
            <option value="short">Short</option>
            <option value="balanced">Balanced</option>
            <option value="detailed">Detailed</option>
          </select>
        </label>

        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.premium}
            onChange={(event) => update('premium', event.target.checked)}
          />
          Enable Premium Workspace
        </label>

        <button className="pill-button" type="submit">
          Save Settings
        </button>
        {saved && <p className="save-note">Saved.</p>}
        {error && <p className="error-note">{error}</p>}
      </form>
    </div>
  )
}
