import { S3Client } from '@aws-sdk/client-s3'
import { env } from './env'

let _r2: S3Client | null = null

function getR2Client(): S3Client {
  if (_r2) return _r2

  // Fail-safe: module import must never crash due to missing env.
  // Routes that require R2 should validate env before using this client.
  _r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  })

  return _r2
}

// Export a getter so importing this module never throws.
export const r2 = new Proxy(
  {} as S3Client,
  {
    get(_target, prop) {
      const client = getR2Client()
      const value = Reflect.get(client, prop as keyof S3Client)
      return typeof value === 'function' ? value.bind(client) : value
    },
  },
)

export const buildObjectUrl = (key: string) =>
  env.R2_PUBLIC_BASE_URL
    ? `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`
    : `https://${env.R2_BUCKET}.${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`
