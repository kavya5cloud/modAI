CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'team', 'business', 'enterprise')),
  plan_status TEXT NOT NULL DEFAULT 'active' CHECK (plan_status IN ('trial', 'active', 'past_due', 'canceled')),
  seat_limit INT NOT NULL DEFAULT 2,
  tokens_per_hr INT NOT NULL DEFAULT 50000,
  ollama_mode TEXT NOT NULL DEFAULT 'offline' CHECK (ollama_mode IN ('offline', 'cloud')),
  ollama_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'plan'
  ) THEN
    ALTER TABLE companies ADD COLUMN plan TEXT NOT NULL DEFAULT 'starter';
    ALTER TABLE companies ADD CONSTRAINT companies_plan_check CHECK (plan IN ('starter', 'team', 'business', 'enterprise'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'plan_status'
  ) THEN
    ALTER TABLE companies ADD COLUMN plan_status TEXT NOT NULL DEFAULT 'active';
    ALTER TABLE companies ADD CONSTRAINT companies_plan_status_check CHECK (plan_status IN ('trial', 'active', 'past_due', 'canceled'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'seat_limit'
  ) THEN
    ALTER TABLE companies ADD COLUMN seat_limit INT NOT NULL DEFAULT 2;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'tokens_per_hr'
  ) THEN
    ALTER TABLE companies ADD COLUMN tokens_per_hr INT NOT NULL DEFAULT 50000;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'ollama_mode'
  ) THEN
    ALTER TABLE companies ADD COLUMN ollama_mode TEXT NOT NULL DEFAULT 'offline';
    ALTER TABLE companies ADD CONSTRAINT companies_ollama_mode_check CHECK (ollama_mode IN ('offline', 'cloud'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'ollama_url'
  ) THEN
    ALTER TABLE companies ADD COLUMN ollama_url TEXT;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'vp', 'employee')),
  job_title TEXT,
  department TEXT,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'employee';
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'vp', 'employee'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'job_title'
  ) THEN
    ALTER TABLE users ADD COLUMN job_title TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'department'
  ) THEN
    ALTER TABLE users ADD COLUMN department TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'invited_by'
  ) THEN
    ALTER TABLE users ADD COLUMN invited_by UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS company_settings (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  industry TEXT,
  tone TEXT,
  response_length TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_profile (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,

  company_name TEXT NOT NULL,
  industry TEXT,
  employee_count INT,

  description TEXT,

  departments JSONB,
  products JSONB,
  goals JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('vp', 'employee')),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, email)
);


CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_company_updated
  ON conversations (company_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
  content TEXT NOT NULL,
  position INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_position
  ON messages (conversation_id, position);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'processing', 'ready', 'failed')),
  extraction_status TEXT NOT NULL DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'extracting', 'extracted', 'failed')),
  extracted_text TEXT,
  extracted_at TIMESTAMPTZ,
  extraction_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compatibility aliases: some parts of the code assume these columns exist.
-- If they already exist, these statements are no-ops.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'page_number'
  ) THEN
    ALTER TABLE documents ADD COLUMN page_number INT;
  END IF;
END $$;


-- Document index depends on existing columns.
-- This project uses code paths that expect `documents.page_number` to exist
-- (some databases may already have it; schema is now compatible via DO $$ block above).
CREATE INDEX IF NOT EXISTS idx_documents_company_created
  ON documents (company_id, created_at DESC);


CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  page_number INT,
  chunk_text TEXT NOT NULL,
  token_count INT NOT NULL,
  embedding vector(384) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_company_doc
  ON document_chunks (company_id, document_id);

-- Some deployments may not have documents.page_number/indexes fully aligned.
-- Keep indexes optional to avoid schema apply failures.
-- CREATE INDEX IF NOT EXISTS idx_document_chunks_document_page
--   ON document_chunks (document_id, page_number);



CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
  ON document_chunks USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'team', 'business', 'enterprise')),
  amount_cents INT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_company_created
  ON billing_invoices (company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS token_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hour_bucket TIMESTAMPTZ NOT NULL,
  tokens_used INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id, hour_bucket)
);

CREATE INDEX IF NOT EXISTS idx_token_usage_company_hour
  ON token_usage (company_id, hour_bucket DESC);

-- Rate limiting (fixed window, per key)
-- One row per (key, window_start). Counters are incremented atomically.
CREATE TABLE IF NOT EXISTS rate_limit_counters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  window_seconds INT NOT NULL,
  count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_counters_key_window
  ON rate_limit_counters (key, window_start DESC);

-- Best-effort cleanup: keep only last ~30 windows for each limiter key.
-- (Works as an MVP; you can tune later.)
CREATE OR REPLACE FUNCTION prune_rate_limit_counters(p_keep_windows INT DEFAULT 30)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM rate_limit_counters
  WHERE window_start < now() - (make_interval(secs => p_keep_windows * window_seconds));
END;
$$;
