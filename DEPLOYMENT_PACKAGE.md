# Polaris Deployment Package (Documentation Only)

This document describes how to deploy the Polaris app in production.

> Scope: **documentation only**.

---

## 1) Environment Variable Checklist

### Frontend (Vercel / Next.js)
- **No Polaris backend secrets** should be exposed to the browser.
- Frontend must call the backend using the runtime base URL.

### Backend (`backend` Next.js app)
Create environment variables required by `backend/src/lib/env.ts`:

| Variable | Purpose |
|---|---|
| `NODE_ENV` | runtime mode (`development`, `test`, `production`) |
| `APP_URL` | absolute URL of the app (used by auth/session flows) |
| `AUTH_SECRET` | NextAuth/JWT secret |
| `DATABASE_URL` | Neon Postgres connection string |
| `OLLAMA_BASE_URL` | Ollama server base URL (e.g. `http://localhost:11434`) |
| `OLLAMA_CHAT_MODEL` | Ollama chat model selector (e.g. `auto` or specific model identifier) |
| `EMBEDDING_MODEL` | Xenova embedding model id (e.g. `BAAI/bge-small-en-v1.5`) |
| `R2_ACCOUNT_ID` | Cloudflare R2 account id |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret key |
| `R2_BUCKET` | R2 bucket name |
| `R2_PUBLIC_BASE_URL` | optional public base URL for object access |

> Note: `.env.local` already exists in many setups, but you must provide real production values.

---

## 2) Production Deployment Guide (High Level)

### Step A — Prepare infrastructure
1. Provision **Neon Postgres**.
2. Provision **Cloudflare R2**.
3. Run or provision **Ollama**.
4. Deploy the backend (Railway/Render/etc.).

### Step B — Configure secrets
Set the environment variables listed above in your backend deployment settings.

### Step C — Networking and connectivity
- Ensure backend can reach:
  - Neon Postgres (outbound traffic allowed)
  - Ollama endpoint (outbound allowed)
  - Cloudflare R2 endpoint via AWS SDK-compatible API

### Step D — Build and run
- Backend build command: `npm run build` (inside `backend`).
- Start command: `npm run start` (inside `backend`).

### Step E — Validate with health endpoint
- Call `GET /api/health` and expect:
  - `status: healthy | degraded | unhealthy`
  - per dependency statuses under `checks.*`

---

## 3) Vercel Frontend Configuration

Polaris uses a separate `backend` Next.js app under `/backend`.

### Option 1 (recommended): Vercel for frontend only
- Deploy the Vite/React frontend to Vercel (root project).
- Configure an environment variable (at app build time) for your API base URL (in code this is typically handled via existing client config).

### Option 2: Deploy full stack to Vercel (if desired)
If you deploy the backend to Vercel instead of Railway/Render:
- Use Vercel project settings for environment variables (the backend list from section 1).
- Ensure serverless compatibility for:
  - long-running ingestion (chunking/embedding)
  - outbound calls to Ollama and R2

> Since the backend is a Next.js App Router project, Vercel deployment works, but verify that embeddings/Ollama calls complete within the chosen execution model limits.

---

## 4) Railway / Render Backend Configuration

### Railway
1. Create a **Node.js** service for the `backend` directory.
2. Set environment variables (section 1).
3. Expose the service (Railway will provide a base URL).

**Build / Start suggestions** (conceptual):
- Build: `cd backend && npm run build`
- Start: `cd backend && npm run start`

### Render
1. Create a **Web Service**.
2. Set environment variables.
3. Use build & start commands similar to:
   - Build: `cd backend && npm run build`
   - Start: `cd backend && npm run start`

### Operational notes
- Ensure outbound network access is enabled to:
  - Neon
  - Ollama
  - Cloudflare R2

---

## 5) Neon Configuration (Postgres)

1. Create a Neon project.
2. Create a database.
3. Copy `DATABASE_URL` from Neon.
4. Ensure the connection uses SSL when required by Neon.

**Recommended operational steps**
- Run schema migrations / apply schema.
  - The repository includes `backend/sql/schema.sql`.
  - Apply it once to your Neon database.

---

## 6) R2 Configuration (Cloudflare)

1. Create a Cloudflare account (if not already).
2. Create an R2 bucket.
3. Create an R2 API token granting access to the bucket.

### Credentials mapping
- `R2_ACCOUNT_ID` = Cloudflare account id (where R2 lives)
- `R2_BUCKET` = bucket name
- `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` = R2 API credentials
- `R2_PUBLIC_BASE_URL` (optional) = base URL for public object serving
  - If omitted, the backend constructs a default URL format using the bucket/account.

> Ensure your R2 bucket policy and access mode align with the way you intend to serve objects publicly.

---

## 7) Ollama Server Requirements

### Connectivity
- Backend calls:
  - `GET {OLLAMA_BASE_URL}/api/tags`
  - `POST {OLLAMA_BASE_URL}/api/chat` with `stream: true`

### Model requirements
- Set `OLLAMA_CHAT_MODEL` to:
  - `auto` (default) to select a smallest available model
  - or a specific model identifier that appears in `/api/tags` response

### Resource expectations
- Chat streaming is done token-by-token.
- Ingestion + retrieval relies on embedding generation and vector search, but the chat endpoint uses Ollama for response generation.

### Deployment options
- Local Ollama (`http://localhost:11434`) for dev.
- Managed Ollama or self-hosted VM/container for production.

---

## Appendix: Quick Health Check

After deploying backend, run:
- `GET https://<your-backend>/api/health`

Interpretation:
- `healthy`: all dependencies ok
- `degraded`: exactly one failed
- `unhealthy`: 2+ failed

---

## Appendix: Security Notes

- Do **not** expose:
  - `AUTH_SECRET`
  - `DATABASE_URL`
  - `R2_SECRET_ACCESS_KEY`
  - any other secrets in frontend/public environments.

- The health endpoint returns only status info; it does not return secrets.

