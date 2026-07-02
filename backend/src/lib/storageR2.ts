import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { StorageProvider, UploadUrlResponse } from './storageProvider'
import { env } from './env'
import { r2, buildObjectUrl as buildR2ObjectUrl } from './r2'
import { createDocument } from './repositories'


export const r2StorageProvider: StorageProvider = {
  async getUploadUrl(args): Promise<UploadUrlResponse> {
    const { companyId, userId, key, filename, contentType, sizeBytes } = args

    const r2Bucket = env.R2_BUCKET
    const r2AccountId = env.R2_ACCOUNT_ID

    if (!r2AccountId || !r2Bucket) {
      throw new Error('Storage backend is not configured. Set R2_ACCOUNT_ID and R2_BUCKET.')
    }

    const command = new PutObjectCommand({
      Bucket: r2Bucket,
      Key: key,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 60 * 10 })

    const documentId = await createDocument(companyId, userId, {
      key,
      filename,
      contentType,
      sizeBytes,
    })

    return {
      documentId,
      key,
      uploadUrl,
      fileUrl: buildR2ObjectUrl(key),
    }
  },

  async readObject() {
    throw new Error('R2 readObject not implemented yet (temporary beta)')
  },

  async deleteObject() {
    throw new Error('R2 deleteObject not implemented yet (temporary beta)')
  },
  buildObjectUrl: (key: string) => buildR2ObjectUrl(key),
}
