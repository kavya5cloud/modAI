import { useState } from 'react'
import { getAuth } from '../lib/storage'
import './billing.css'
import type { UserAuth } from '../types'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 5,
    seats: '1–2 seats',
    seatLimit: 2,
    tokensPerHr: '50k tokens / hr',
    tokensRaw: 50000,
    ollamaMode: 'Offline (your device)',
    features: ['1 admin seat', 'Document RAG', 'Open + Internal doc access', '50k tokens/hr', 'Offline Ollama'],
    color: 'var(--accent-light)',
  },
  {
    id: 'team',
    name: 'Team',
    price: 20,
    seats: 'Up to 10 seats',
    seatLimit: 10,
    tokensPerHr: '150k tokens / hr',
    tokensRaw: 150000,
    ollamaMode: 'Offline or Cloud (+$10/mo)',
    features: ['10 seats', 'All doc visibility levels', 'VP & role-based access', '150k tokens/hr', 'Invite employees', 'Ollama cloud add-on'],
    color: '#a78bfa',
    popular: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: 60,
    seats: 'Up to 50 seats',
    seatLimit: 50,
    tokensPerHr: '500k tokens / hr',
    tokensRaw: 500000,
    ollamaMode: 'Dedicated cloud instance',
    features: ['50 seats', 'Dedicated Ollama instance', 'Confidential doc vault', '500k tokens/hr', 'Priority support', 'Token upgrade available'],
    color: '#f472b6',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    seats: 'Unlimited seats',
    seatLimit: 9999,
    tokensPerHr: 'Custom',
    tokensRaw: 0,
    ollamaMode: 'Dedicated + on-prem option',
    features: ['Unlimited seats', 'SLA guarantee', 'Custom token limits', 'SSO / SAML', 'On-prem Ollama', 'Dedicated support'],
    color: '#34d399',
  },
]

const MOCK_INVOICES = [
  { id: 'inv_001', period: 'Jun 2026', plan: 'Starter', amount: 5, status: 'paid' },
  { id: 'inv_002', period: 'May 2026', plan: 'Starter', amount: 5, status: 'paid' },
]

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(0)}k` : `${n}`
}

export function BillingPage() {
  const auth = getAuth() as UserAuth | null
  const currentPlan = auth?.plan ?? 'starter'
  const tokensPerHr = auth?.tokensPerHr ?? 50000

  const [selected, setSelected] = useState<string | null>(null)
  const [upgrading, setUpgrading] = useState(false)
  const [upgraded, setUpgraded] = useState(false)
  const [ollamaMode, setOllamaMode] = useState<'offline' | 'cloud'>('offline')

  const handleUpgrade = async (planId: string) => {
    if (planId === 'enterprise') {
      window.location.assign('mailto:hello@modai.io?subject=Enterprise+Inquiry')
      return
    }
    setSelected(planId)
    setUpgrading(true)
    // Mock payment — replace with Stripe Checkout redirect
    await new Promise((r) => setTimeout(r, 1400))
    setUpgrading(false)
    setUpgraded(true)
    setTimeout(() => setUpgraded(false), 3000)
  }

  const activePlan = PLANS.find((p) => p.id === currentPlan) ?? PLANS[0]
  const hourlyUsed = Math.floor(tokensPerHr * 0.34) // mock 34% usage

  return (
    <div className="billing-page">
      {/* Current plan card */}
      <div className="billing-current-card glass-card">
        <div className="billing-current-left">
          <span className="billing-badge" style={{ background: `${activePlan.color}22`, color: activePlan.color, border: `1px solid ${activePlan.color}44` }}>
            {activePlan.name}
          </span>
          <h2 className="billing-current-name">
            {activePlan.price !== null ? `$${activePlan.price}/month` : 'Custom pricing'}
          </h2>
          <p className="billing-current-seats">{activePlan.seats} · {activePlan.ollamaMode}</p>
        </div>

        <div className="billing-usage-block">
          <div className="billing-usage-label">
            <span>Hourly token usage</span>
            <span className="billing-usage-nums">{fmt(hourlyUsed)} / {fmt(tokensPerHr)}</span>
          </div>
          <div className="billing-usage-bar">
            <div className="billing-usage-fill" style={{ width: `${(hourlyUsed / tokensPerHr) * 100}%`, background: activePlan.color }} />
          </div>
          <p className="billing-usage-hint">Resets every hour. Upgrade to increase your limit.</p>
        </div>

        <div className="billing-ollama-mode">
          <span className="billing-ollama-label">Ollama mode</span>
          <div className="billing-mode-toggle">
            <button
              className={`billing-mode-btn${ollamaMode === 'offline' ? ' active' : ''}`}
              onClick={() => setOllamaMode('offline')}
            >
              Offline
            </button>
            <button
              className={`billing-mode-btn${ollamaMode === 'cloud' ? ' active' : ''}`}
              onClick={() => setOllamaMode('cloud')}
            >
              Cloud  <span className="billing-mode-price">+$10/mo</span>
            </button>
          </div>
          {ollamaMode === 'offline' && (
            <p className="billing-mode-desc">Ollama runs on your device. Fast, private, free.</p>
          )}
          {ollamaMode === 'cloud' && (
            <p className="billing-mode-desc">We host a dedicated Ollama instance for your company. Always on, no setup.</p>
          )}
        </div>
      </div>

      {/* Plan grid */}
      <div className="billing-section-head">
        <h3>Change plan</h3>
        <p>All plans include RAG-powered AI, document ingestion, and company-scoped knowledge.</p>
      </div>

      <div className="billing-plans-grid">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan
          const isSelected = selected === plan.id
          return (
            <div
              key={plan.id}
              className={`billing-plan-card glass-card${plan.popular ? ' billing-plan-popular' : ''}${isCurrent ? ' billing-plan-current' : ''}`}
              style={plan.popular ? { '--plan-color': plan.color } as React.CSSProperties : {}}
            >
              {plan.popular && <div className="billing-popular-badge">Most popular</div>}
              {isCurrent && <div className="billing-current-badge">Current plan</div>}

              <div className="billing-plan-top">
                <span className="billing-plan-name" style={{ color: plan.color }}>{plan.name}</span>
                <div className="billing-plan-price">
                  {plan.price !== null ? (
                    <><span className="billing-plan-amount">${plan.price}</span><span className="billing-plan-cycle">/mo</span></>
                  ) : (
                    <span className="billing-plan-amount billing-plan-custom">Custom</span>
                  )}
                </div>
                <p className="billing-plan-seats">{plan.seats}</p>
              </div>

              <ul className="billing-plan-features">
                {plan.features.map((f) => (
                  <li key={f}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                className={`billing-plan-btn${isCurrent ? ' billing-plan-btn-current' : ''}`}
                style={!isCurrent ? { background: `linear-gradient(135deg, ${plan.color}cc, ${plan.color}88)` } : {}}
                onClick={() => !isCurrent && handleUpgrade(plan.id)}
                disabled={isCurrent || (upgrading && isSelected)}
              >
                {isCurrent ? 'Current plan' :
                 plan.id === 'enterprise' ? 'Contact us' :
                 upgrading && isSelected ? 'Processing…' :
                 upgraded && isSelected ? '✓ Upgraded!' :
                 `Upgrade to ${plan.name}`}
              </button>
            </div>
          )
        })}
      </div>

      {/* Invoice history */}
      <div className="billing-section-head" style={{ marginTop: '1rem' }}>
        <h3>Invoice history</h3>
      </div>

      <div className="billing-invoices glass-card">
        <div className="billing-invoices-head">
          <span>Period</span>
          <span>Plan</span>
          <span>Amount</span>
          <span>Status</span>
          <span></span>
        </div>
        {MOCK_INVOICES.map((inv) => (
          <div key={inv.id} className="billing-invoice-row">
            <span>{inv.period}</span>
            <span>{inv.plan}</span>
            <span>${inv.amount}.00</span>
            <span className={`billing-invoice-status billing-invoice-${inv.status}`}>{inv.status}</span>
            <button className="billing-download-btn" title="Download PDF">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
              PDF
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
