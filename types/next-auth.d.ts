import { Role } from '@prisma/client'
import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface User {
    role: Role
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: Role
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: Role
  }
}