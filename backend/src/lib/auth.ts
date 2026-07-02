import bcrypt from 'bcryptjs'
import type { NextAuthOptions } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { db } from './db'
import { env } from './env'
import { rateLimitFixedWindow } from './rateLimiter'

const isProd = process.env.NODE_ENV === 'production'

type AuthUser = {
  id: string
  email: string
  companyId: string
  companyName: string
  role: 'admin' | 'vp' | 'employee'
  plan: 'starter' | 'team' | 'business' | 'enterprise'
  planStatus: 'trial' | 'active' | 'past_due' | 'canceled'
  seatLimit: number
  tokensPerHr: number
  jobTitle: string | null
  department: string | null
}

type AppJWT = JWT & {
  userId?: string
  companyId?: string
  companyName?: string
  role?: 'admin' | 'vp' | 'employee'
  plan?: 'starter' | 'team' | 'business' | 'enterprise'
  planStatus?: 'trial' | 'active' | 'past_due' | 'canceled'
  seatLimit?: number
  tokensPerHr?: number
  jobTitle?: string | null
  department?: string | null
}

const PASSWORD_MIN_LENGTH = 8
const LOGIN_ATTEMPT_LIMIT = 10
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

async function checkLoginRateLimit(email: string): Promise<boolean> {
  try {
    const result = await rateLimitFixedWindow({
      key: `login_attempt:${email}`,
      limit: LOGIN_ATTEMPT_LIMIT,
      windowMs: LOGIN_ATTEMPT_WINDOW_MS,
    })
    return result.allowed
  } catch {
    // On rate limiter failure, allow the request through rather than hard-failing.
    return true
  }
}

export const authOptions: NextAuthOptions = {
  debug: false,
  session: { strategy: 'jwt' },
  secret: env.AUTH_SECRET,

  useSecureCookies: isProd,
  cookies: {
    sessionToken: {
      name: isProd ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProd,
        maxAge: 30 * 24 * 60 * 60,
      },
    },
  },

  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
        companyName: { label: 'Company Name', type: 'text' },
        mode: { label: 'Mode', type: 'text' },
      },
      authorize: async (credentials) => {
        try {
          if (!credentials?.email || !credentials.password) return null

          const email = credentials.email.toLowerCase().trim()
          const mode = credentials.mode === 'signup' ? 'signup' : 'login'
          const companyName = credentials.companyName?.trim() || 'modAI Company'

          // Basic email format check
          if (!email.includes('@') || email.length > 320) return null

          // Enforce password minimum length
          if (credentials.password.length < PASSWORD_MIN_LENGTH) return null

          // Rate-limit login attempts per email to prevent brute force
          const allowed = await checkLoginRateLimit(email)
          if (!allowed) {
            throw new Error('Too many login attempts. Please try again later.')
          }

          if (mode === 'signup') {
            const existing = await db.query<{ id: string }>(
              'SELECT id FROM users WHERE email = $1 LIMIT 1',
              [email],
            )
            if (existing.rows.length > 0) return null

            // Starter plan defaults
            const companyInsert = await db.query<{ id: string; name: string }>(
              `INSERT INTO companies (name, plan, plan_status, seat_limit, tokens_per_hr)
               VALUES ($1, 'starter', 'active', 2, 50000)
               RETURNING id, name`,
              [companyName],
            )
            const company = companyInsert.rows[0]

            const hash = await bcrypt.hash(credentials.password, 12)

            const userInsert = await db.query<{
              id: string
              email: string
              company_id: string
            }>(
              `INSERT INTO users (email, password_hash, company_id, role)
               VALUES ($1, $2, $3, 'admin')
               RETURNING id, email, company_id`,
              [email, hash, company.id],
            )

            const user = userInsert.rows[0]
            return {
              id: user.id,
              email: user.email,
              companyId: user.company_id,
              companyName: company.name,
              role: 'admin' as const,
              plan: 'starter' as const,
              planStatus: 'active' as const,
              seatLimit: 2,
              tokensPerHr: 50000,
              jobTitle: null,
              department: null,
            }
          }

          // Login — join company plan + user role
          const userResult = await db.query<{
            id: string
            email: string
            password_hash: string
            company_id: string
            company_name: string
            role: 'admin' | 'vp' | 'employee'
            plan: 'starter' | 'team' | 'business' | 'enterprise'
            plan_status: 'trial' | 'active' | 'past_due' | 'canceled'
            seat_limit: number
            tokens_per_hr: number
            job_title: string | null
            department: string | null
          }>(
            `SELECT u.id, u.email, u.password_hash, u.company_id, u.role,
                    u.job_title, u.department,
                    c.name AS company_name,
                    c.plan, c.plan_status, c.seat_limit, c.tokens_per_hr
             FROM users u
             JOIN companies c ON c.id = u.company_id
             WHERE u.email = $1 AND u.is_active = TRUE
             LIMIT 1`,
            [email],
          )

          const user = userResult.rows[0]
          if (!user) return null

          const ok = await bcrypt.compare(credentials.password, user.password_hash)
          if (!ok) return null

          return {
            id: user.id,
            email: user.email,
            companyId: user.company_id,
            companyName: user.company_name,
            role: user.role,
            plan: user.plan,
            planStatus: user.plan_status,
            seatLimit: user.seat_limit,
            tokensPerHr: user.tokens_per_hr,
            jobTitle: user.job_title,
            department: user.department,
          }
        } catch (cause) {
          console.error('[auth] authorize error:', cause instanceof Error ? cause.message : 'unknown')
          throw cause
        }
      },
    }),
  ],

  callbacks: {
    jwt: async ({ token, user }) => {
      const appToken = token as AppJWT
      if (user) {
        const authUser = user as unknown as AuthUser
        appToken.userId = authUser.id
        appToken.email = authUser.email
        appToken.companyId = authUser.companyId
        appToken.companyName = authUser.companyName
        appToken.role = authUser.role
        appToken.plan = authUser.plan
        appToken.planStatus = authUser.planStatus
        appToken.seatLimit = authUser.seatLimit
        appToken.tokensPerHr = authUser.tokensPerHr
        appToken.jobTitle = authUser.jobTitle
        appToken.department = authUser.department
      }
      return appToken
    },
    session: async ({ session, token }) => {
      const appToken = token as AppJWT

      if (appToken.userId && appToken.companyId) {
        if (!session.user) session.user = {} as typeof session.user
        const u = session.user as Record<string, unknown>
        u.id = appToken.userId
        u.email = appToken.email
        u.companyId = appToken.companyId
        u.companyName = appToken.companyName
        u.role = appToken.role ?? 'employee'
        u.plan = appToken.plan ?? 'starter'
        u.planStatus = appToken.planStatus ?? 'active'
        u.seatLimit = appToken.seatLimit ?? 2
        u.tokensPerHr = appToken.tokensPerHr ?? 50000
        u.jobTitle = appToken.jobTitle ?? null
        u.department = appToken.department ?? null
      }

      return session
    },
  },
}

const authHandler = NextAuth(authOptions)
export { authHandler }
export default authHandler
