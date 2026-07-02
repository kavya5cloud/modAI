declare module 'next-auth' {
  interface Session {
    user: {
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
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string
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
}
