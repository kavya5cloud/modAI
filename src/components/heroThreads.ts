export type HeroTurn = { q: string; a: string; src: string }
export type HeroThread = { id: string; label: string; turns: HeroTurn[] }

export const HERO_THREADS: HeroThread[] = [
  {
    id: 'ask',
    label: 'Ask',
    turns: [
      {
        q: 'What is our leave policy?',
        a: 'Full-time staff accrue 1.75 days of paid leave per month, capped at 24 days a year. Requests go to your line manager at least five working days ahead.',
        src: 'People-Handbook.pdf · p.14',
      },
      {
        q: 'Who approves a £4,000 spend?',
        a: 'Anything over £2,000 needs finance sign-off after your department VP approves it. Under £250 your line manager can approve alone.',
        src: 'Expense-Policy.txt · p.2',
      },
    ],
  },
  {
    id: 'find',
    label: 'Find a doc',
    turns: [
      {
        q: 'Onboarding checklist for engineers',
        a: 'Found 3 documents. The most relevant is the engineering onboarding runbook, last updated in March — it covers laptop setup, repo access, and the first-week pairing rota.',
        src: 'Eng-Onboarding.docx · p.1',
      },
      {
        q: 'Anything about our security review?',
        a: 'Two matches. The SOC 2 readiness memo is the current one; the older penetration-test summary is superseded but still indexed.',
        src: 'SOC2-Readiness.pdf · p.6',
      },
    ],
  },
]
