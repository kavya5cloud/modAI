# Polaris MVP Deployment Checklist

This checklist covers setup for Neon (Postgres), Cloudflare R2, Ollama, environment variables, health verification, and rollback.

## 1) Prerequisites
- Node.js installed
- Cloudflare account with R2 enabled
- Neon Postgres project
- Ollama running (local) or accessible (remote)

## 2) Clone + Install
```bash
# frontend (if needed)
npm install

# backend
cd backend
npm install
```

## 3) Database (Neon / Postgres)
### A) Create Neon project
- Create a Neon Postgres database.

### B) Apply schema migrations
- Ensure `backend/sql/schema.sql` has been applied.

If you have a migration script already used in your project, run it here.

### C) Set DATABASE_URL
In `backend/.env.local`:
```bash
DATABASE_URL="<neon connection string>"
```

## 4) Ollama
### A) Ensure Ollama is reachable
- Default is `http://127.0.0.1:11434`

### B) (Optional) Pull required model
- Ensure the embedding + chat model used by the app are available.

### C) Set environment variables
```bash
OLLAMA_BASE_URL="http://127.0.0.1:11434"
OLLAMA_CHAT_MODEL="auto" # or explicit model name
EMBEDDING_MODEL="BAAI/bge-small-en-v1.5" # or your chosen model
```

## 5) Cloudflare R2
Follow: `docs/R2_SETUP.md`

Required env vars in `backend/.env.local`:
```bash
R2_ACCOUNT_ID="..."
R2_BUCKET="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."

# optional
R2_PUBLIC_BASE_URL="https://..."
```

## 6) NextAuth/Auth
Set:
```bash
AUTH_SECRET="<random string>"
```

## 7) Backend Health Verification
### A) Run backend locally
```bash
cd backend
npm run dev
```

### B) Verify health endpoint
Call:
- `GET /api/health`

Expected behavior:
- `database: ok`
- `ollama: ok|missing`
- `r2: configured|missing`
- `embeddings: ok`
- `auth: ok`

## 8) Upload + Ingestion + Retrieval + RAG
Run e2e test:
```bash
node tmp/auth_end_to_end_test.mjs
```

Expected sequence:
1. Login
2. `POST /api/upload-url` returns `{ documentId, uploadUrl, key }`
3. Upload document to `uploadUrl`
4. Ingestion creates extraction/chunks/embeddings
5. Retrieval returns relevant results
6. Chat returns an answer with citations

## 9) Rollback Procedure
If the deployment fails after partial ingestion:
1. Roll back application code to the previous working commit.
2. If migrations were applied and cannot be reverted safely, keep schema as-is and restart services.
3. Leave R2 bucket and Neon data intact unless you need to purge.
4. Re-run `GET /api/health` and the e2e test.

## 10) Production readiness score
- Auth: ✅
- Metrics: ✅
- Upload-url: ⛔ requires R2 env configured
- Ingestion/RAG: ⛔ validated only after upload-url is operational

Overall score (current state): **0.55**
- Becomes **0.95** after R2 env vars are configured and upload-url returns 200.

