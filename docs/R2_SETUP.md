# Cloudflare R2 Setup for Polaris MVP

This guide prepares Polaris to store uploaded documents and serve signed upload URLs using Cloudflare R2.

## 1) Create / Use a Cloudflare account
1. Sign in to Cloudflare.
2. Ensure you have access to a **Cloudflare account** with R2 enabled.

## 2) Create an R2 bucket
1. Go to **R2** (R2 → Buckets).
2. Click **Create bucket**.
3. Choose a bucket name.
4. Enable any settings needed for your security model (default is usually fine).

Record:
- **R2 bucket name** → `R2_BUCKET`

## 3) Obtain the R2 Account ID
1. In the Cloudflare dashboard, open **R2**.
2. Identify the account ID for your R2 resources.

Record:
- **R2 Account ID** → `R2_ACCOUNT_ID`

## 4) Generate an API token with minimum required permissions
1. Go to **Cloudflare dashboard → API Tokens**.
2. Create a **Token**.
3. Use the token permissions needed for S3-compatible access to R2:
   - Read/write object permissions for the bucket
   - Ability to generate signed URLs (effectively requires object + bucket access)

Attach the token to the bucket you created.

Record:
- Token **Access Key ID** → `R2_ACCESS_KEY_ID`
- Token **Secret Access Key** → `R2_SECRET_ACCESS_KEY`

## 5) (Optional) Configure a public base URL
If you want Polaris to build stable `fileUrl` values from a public URL:
- Create/ensure access path to your objects.
- Set:
  - `R2_PUBLIC_BASE_URL` (optional)

If unset, Polaris will derive a default R2 public URL using `R2_BUCKET` and `R2_ACCOUNT_ID`.

## 6) Set environment variables for the backend
In `backend/.env.local` (or your deployment env), add:

```bash
# Cloudflare R2 (required for uploads)
R2_ACCOUNT_ID="..."
R2_BUCKET="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."

# Optional
R2_PUBLIC_BASE_URL="https://..." 
```

### Required for upload flow
Without `R2_ACCOUNT_ID` and `R2_BUCKET`, `POST /api/upload-url` will return:
- `500 Storage backend is not configured. Set R2_ACCOUNT_ID and R2_BUCKET.`

## 7) Validation
After setting env vars:
1. Start the backend (`npm run dev` from `backend/`).
2. Call:
   - `GET /api/health` (should show `r2: ok`)
3. Run the e2e auth test script (`node tmp/auth_end_to_end_test.mjs`) to verify:
   - `POST /api/upload-url` returns `{ documentId, uploadUrl, key }`

---

EOF

