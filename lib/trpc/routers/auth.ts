import { z } from 'zod'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import bcrypt from 'bcryptjs'
import { TRPCError } from '@trpc/server'

export const authRouter = router({
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session
  }),

  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(['USER', 'PROJECT_MANAGER']).optional().default('USER'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only PROJECT_MANAGERS can create new users (as per specs)
      if (ctx.session?.user?.role !== 'PROJECT_MANAGER') {
        throw new TRPCError({ 
          code: 'FORBIDDEN',
          message: 'Only Project Managers can create new users'
        })
      }

      // Check if user already exists
      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email },
      })

      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User with this email already exists',
        })
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 12)

      // Create user and associated person record
      const user = await ctx.db.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          role: input.role,
          person: {
            create: {
              name: input.name,
              email: input.email,
              role: input.role,
            },
          },
        },
        include: {
          person: true,
        },
      })

      // Create change log entry
      await ctx.db.changeLog.create({
        data: {
          entity: 'PERSON',
          entityId: user.person!.id,
          field: 'created',
          toValue: { name: input.name, email: input.email, role: input.role },
          state: 'CREATED',
          changedById: ctx.session.user.id,
        },
      })

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        person: {
          include: {
            competencies: {
              include: {
                competency: true,
              },
            },
          },
        },
      },
    })

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      })
    }

    return user
  }),
})