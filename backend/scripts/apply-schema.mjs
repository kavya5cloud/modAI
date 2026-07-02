import fs from 'node:fs/promises'
import { Client } from 'pg'

const envText = await fs.readFile(new URL('../.env.local', import.meta.url), 'utf8')
const dbUrlMatch = envText.match(/^DATABASE_URL=(.*)$/m)

if (!dbUrlMatch) {
  throw new Error('DATABASE_URL missing from backend/.env.local')
}

const dbUrl = dbUrlMatch[1].trim()
const schema = await fs.readFile(new URL('../sql/schema.sql', import.meta.url), 'utf8')
const client = new Client({ connectionString: dbUrl })

await client.connect()

try {
  await client.query('BEGIN')
  await client.query(schema)
  await client.query('COMMIT')

  const tables = [
    'users',
    'companies',
    'conversations',
    'messages',
    'documents',
    'document_chunks',
  ]

  const result = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[]) ORDER BY table_name",
    [tables],
  )

  console.log(JSON.stringify({ verified: result.rows.map((row) => row.table_name) }, null, 2))
} catch (error) {
  try {
    await client.query('ROLLBACK')
  } catch {}
  throw error
} finally {
  await client.end()
}
