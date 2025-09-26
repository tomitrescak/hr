import { initTRPC, TRPCError } from '@trpc/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'
import { z } from 'zod'

// Create context
export async function createTRPCContext() {
  const session = await auth()
  
  return {
    session,
    db,
  }
}

const t = initTRPC.context<typeof createTRPCContext>().create()

export const router = t.router
export const publicProcedure = t.procedure

// Auth middleware
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  })
})

// Project Manager role middleware
const enforceUserIsProjectManager = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user || ctx.session.user.role !== Role.PROJECT_MANAGER) {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  })
})

export const protectedProcedure = publicProcedure.use(enforceUserIsAuthed)
export const pmProcedure = publicProcedure.use(enforceUserIsProjectManager)