import { z } from 'zod'

const isProd = process.env.NODE_ENV === 'production'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.url().default('http://localhost:3000'),
  AUTH_SECRET: isProd
    ? z.string().min(32, 'AUTH_SECRET must be at least 32 characters in production')
    : z.string().default('dev-secret-change-in-production'),
  DATABASE_URL: isProd
    ? z.string().min(1, 'DATABASE_URL is required in production')
    : z.string().default(''),
  OLLAMA_BASE_URL: z.url().default('http://127.0.0.1:11434'),
  OLLAMA_CHAT_MODEL: z.string().default('auto'),
  EMBEDDING_MODEL: z.string().default('BAAI/bge-small-en-v1.5'),
  R2_ACCOUNT_ID: z.string().default(''),
  R2_ACCESS_KEY_ID: z.string().default(''),
  R2_SECRET_ACCESS_KEY: z.string().default(''),
  R2_BUCKET: z.string().default(''),
  R2_PUBLIC_BASE_URL: z.url().optional(),
})

export const env = schema.parse({
  NODE_ENV: process.env.NODE_ENV,
  APP_URL: process.env.APP_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
  OLLAMA_CHAT_MODEL: process.env.OLLAMA_CHAT_MODEL,
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET: process.env.R2_BUCKET,
  R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,
})
