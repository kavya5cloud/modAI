const { Pool } = require('pg')
const fs = require('fs')

const env = Object.fromEntries(
  fs
    .readFileSync('backend/.env.local', 'utf8')
    .split('\n')
    .filter(Boolean)
    .filter((line) => !line.startsWith('#'))
    .map((line) => line.split('='))
    .filter((parts) => parts.length >= 2)
    .map(([key, ...valueParts]) => [key, valueParts.join('=')]),
)

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  const result = await pool.query(
    'select id, email, company_id from users order by email asc limit 10',
  )
  console.log(JSON.stringify(result.rows))
}

main()
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(() => pool.end())
