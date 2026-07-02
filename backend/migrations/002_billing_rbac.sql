-- ─────────────────────────────────────────────────────────────────
-- Migration 002: Billing, RBAC, Invitations, Document Visibility,
--                Token Usage, Ollama Assignment
-- Run once against your Postgres instance.
-- ─────────────────────────────────────────────────────────────────

-- ── 1. Plans on companies ───────────────────────────────────────
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS plan          TEXT    NOT NULL DEFAULT 'starter'
                                         CHECK (plan IN ('starter','team','business','enterprise')),
  ADD COLUMN IF NOT EXISTS plan_status   TEXT    NOT NULL DEFAULT 'active'
                                         CHECK (plan_status IN ('trial','active','past_due','canceled')),
  ADD COLUMN IF NOT EXISTS seat_limit    INT     NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS tokens_per_hr INT     NOT NULL DEFAULT 50000,
  ADD COLUMN IF NOT EXISTS ollama_mode   TEXT    NOT NULL DEFAULT 'offline'
                                         CHECK (ollama_mode IN ('offline','cloud')),
  ADD COLUMN IF NOT EXISTS ollama_url    TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- ── 2. Role + job info on users ─────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role         TEXT    NOT NULL DEFAULT 'employee'
                                        CHECK (role IN ('admin','vp','employee')),
  ADD COLUMN IF NOT EXISTS job_title    TEXT,
  ADD COLUMN IF NOT EXISTS department   TEXT,
  ADD COLUMN IF NOT EXISTS is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS invited_by   UUID    REFERENCES users(id);

-- ── 3. Document visibility ───────────────────────────────────────
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS visibility   TEXT    NOT NULL DEFAULT 'open'
                                        CHECK (visibility IN ('open','internal','confidential'));

-- ── 4. Invitations ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invitations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invited_by   UUID        NOT NULL REFERENCES users(id),
  email        TEXT        NOT NULL,
  role         TEXT        NOT NULL DEFAULT 'employee'
                           CHECK (role IN ('admin','vp','employee')),
  token        TEXT        NOT NULL UNIQUE,
  accepted_at  TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One outstanding invite per email per company. Required for the
  -- ON CONFLICT (company_id, email) upsert in /api/team/invite.
  UNIQUE (company_id, email)
);
CREATE INDEX IF NOT EXISTS idx_invitations_token      ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_company    ON invitations(company_id);

-- Idempotent guard: if the invitations table already existed without the
-- (company_id, email) unique constraint, add it now.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'invitations'::regclass
      AND contype = 'u'
      AND conname = 'invitations_company_id_email_key'
  ) THEN
    ALTER TABLE invitations
      ADD CONSTRAINT invitations_company_id_email_key UNIQUE (company_id, email);
  END IF;
END $$;

-- ── 5. Token usage (hourly buckets per company) ──────────────────
CREATE TABLE IF NOT EXISTS token_usage (
  id           BIGSERIAL   PRIMARY KEY,
  company_id   UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id      UUID        REFERENCES users(id),
  hour_bucket  TIMESTAMPTZ NOT NULL,   -- truncated to the hour
  tokens_used  INT         NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, hour_bucket)
);
CREATE INDEX IF NOT EXISTS idx_token_usage_company ON token_usage(company_id, hour_bucket DESC);

-- ── 6. Billing invoices (mock — no Stripe yet) ───────────────────
CREATE TABLE IF NOT EXISTS billing_invoices (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan         TEXT        NOT NULL,
  amount_cents INT         NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'paid'
                           CHECK (status IN ('draft','open','paid','uncollectible','void')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON billing_invoices(company_id, created_at DESC);

-- ── 7. Seed first registered user in each company as admin ───────
-- (Only sets role='admin' for users who are the only member of their company)
UPDATE users u
SET role = 'admin'
WHERE u.role = 'employee'
  AND NOT EXISTS (
    SELECT 1 FROM users u2
    WHERE u2.company_id = u.company_id
      AND u2.id <> u.id
  );
