import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import type { StorageProvider, UploadUrlResponse } from './storageProvider'

import { createDocument } from '@/lib/repositories'
import { env } from './env'

// Local fallback provider: stores files on disk and returns a fileUrl that can be
// used by citations. For now we reuse the existing fileUrl building contract:
//   - for local we serve from APP_URL + /uploads/<sanitized-key>
//   - key format is preserved (companyId/randomUUID-filename)

const uploadsRoot = path.join(process.cwd(), 'backend', 'uploads')

function ensureUploadsDir() {
  return fs.mkdir(uploadsRoot, { recursive: true })
}

function sanitizeKeyForLocalStorage(key: string) {
  // Keep subdirectories (companyId/...) but avoid path traversal.
  const normalized = path.normalize(key).replace(/^([/\\])+/, '')
  if (normalized.includes('..')) throw new Error('Invalid storage key')
  return normalized
}

function localObjectPath(key: string) {
  return path.join(uploadsRoot, sanitizeKeyForLocalStorage(key))
}

function buildLocalObjectUrl(key: string) {
  // For citations we only need a stable URL string. We will also ensure
  // Next.js serves /uploads/* from backend/uploads/*.
  const base = env.APP_URL.replace(/\/$/, '')
  return `${base}/uploads/${encodeURIComponent(key).replace(/%2F/g, '/')}`
}

export const localStorageProvider: StorageProvider = {
  async getUploadUrl(args): Promise<UploadUrlResponse> {

    const { companyId, userId, key, filename, contentType, sizeBytes } = args


    await ensureUploadsDir()

    // In R2 flow, the signed URL is used by the client to upload bytes.
    // For local beta, we cannot generate a PUT-to-backend-url compatible
    // signature without changing the frontend, so we return a backend-controlled
    // upload URL that points to the Next route responsible for writing to disk.
    // That route is /api/local-upload (implemented alongside this provider).
    //
    // To preserve the existing upload API contract, uploadUrl is only consumed
    // by the frontend; document record still must be created here.

    const uploadToken = `${companyId}:${userId}:${randomUUID()}:${key}`

    const documentId = await createDocument(companyId, userId, {
      key,
      filename,
      contentType,
      sizeBytes,
    })

    // In dev we want same-origin upload URLs so the Vite dev proxy is used by the browser.
    const isDev = env.NODE_ENV === 'development'

    return {
      documentId,
      key,
      uploadUrl: isDev
        ? `/api/local-upload?token=${encodeURIComponent(uploadToken)}`
        : `${env.APP_URL.replace(/\/$/, '')}/api/local-upload?token=${encodeURIComponent(uploadToken)}`,
      fileUrl: buildLocalObjectUrl(key),
    }

  },

  async readObject({ key }) {
    const filePath = localObjectPath(key)
    const body = await fs.readFile(filePath)
    return { body }
  },

  async deleteObject({ key }) {
    const filePath = localObjectPath(key)
    try {
      await fs.unlink(filePath)
    } catch {
      // best-effort
    }
  },


  buildObjectUrl(key: string) {
    return buildLocalObjectUrl(key)
  },
}
