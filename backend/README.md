# modAI Backend (Next.js API)

Backend for modAI with:

- Next.js API routes
- Auth.js credentials auth
- Neon Postgres + pgvector
- Cloudflare R2 uploads
- Ollama streaming chat with auto-selected smallest available model for testing
- RAG with `BAAI/bge-small-en-v1.5` embeddings
- Multi-tenant company isolation

## 1) Setup

```bash
cp .env.example .env.local
npm install
```

Populate `.env.local` with Neon, R2, and auth values.

## 2) Database schema

Run `sql/schema.sql` on your Neon database.

Important: this enables `vector` extension and creates all tenancy tables.

## 3) Run

```bash
npm run dev
```

API is served at `http://localhost:3000/api/*`.

### Watcher errors (EMFILE) on macOS

If you see `EMFILE: too many open files` or Watchpack errors when running the dev server, raise the file descriptor limit before starting Next.js:

```bash
# quick: use the npm helper script
cd backend
npm run dev:local

# or run the helper script directly
./scripts/dev.sh
```

Alternatively, install `watchman` to reduce filesystem watcher pressure:

```bash
brew install watchman
```

Adding `ulimit -n 10240` before `next dev` typically prevents the Watchpack EMFILE errors on macOS.

## Core API routes

- `POST /api/auth/[...nextauth]` - Auth.js credentials login/signup
- `GET /api/company` - current tenant/company info
- `GET/POST /api/conversations` - list/create conversation
- `POST /api/chat` - streaming NDJSON chat response (RAG + Ollama)
- `POST /api/upload-url` - pre-signed R2 upload URL + document record
- `POST /api/ingest` - extract text, chunk, embed, write vectors
- `GET /api/files` - list company documents
- `GET/POST /api/settings` - tenant-specific company preferences

## Streaming format (`/api/chat`)

Response content type is `application/x-ndjson` with rows:

- `{ "type": "meta", "conversationId": "...", "retrieved": 6 }`
- `{ "type": "token", "token": "..." }` (multiple)
- `{ "type": "done" }`
- or `{ "type": "error", "message": "..." }`
