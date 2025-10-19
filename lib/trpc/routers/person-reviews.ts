import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

export const personReviewsRouter = router({
  // Get all reviews for a person
  getByPersonId: protectedProcedure
    .input(
      z.object({
        personId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check if user can access this person's reviews
      const canAccess = 
        ctx.session.user.role === 'PROJECT_MANAGER' ||
        (ctx.session.user.id && await ctx.db.user.findFirst({
          where: { id: ctx.session.user.id }
        }))

      if (!canAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view these reviews',
        })
      }

      return ctx.db.personReview.findMany({
        where: { personId: input.personId },
        include: {
          person: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      })
    }),

  // Create a new person review
  create: protectedProcedure
    .input(
      z.object({
        personId: z.string(),
        recordingText: z.string(),
        notes: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user can create reviews for this person
      const canCreate = 
        ctx.session.user.role === 'PROJECT_MANAGER' && 
        ctx.session.user.id 

      if (!canCreate) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to create reviews for this person',
        })
      }

      return ctx.db.personReview.create({
        data: {
          personId: input.personId,
          recordingText: input.recordingText,
          notes: input.notes,
        },
        include: {
          person: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      })
    }),

  // Update an existing review
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        recordingText: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // First check if the review exists and user has permission
      const existingReview = await ctx.db.personReview.findUnique({
        where: { id: input.id },
        include: { person: true }
      })

      if (!existingReview) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Review not found',
        })
      }

      const canUpdate = 
        ctx.session.user.role === 'PROJECT_MANAGER' && 
        ctx.session.user.id 

      if (!canUpdate) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this review',
        })
      }

      return ctx.db.personReview.update({
        where: { id: input.id },
        data: {
          ...(input.recordingText !== undefined && { recordingText: input.recordingText }),
          ...(input.notes !== undefined && { notes: input.notes }),
        },
        include: {
          person: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      })
    }),

  // Delete a review
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // First check if the review exists and user has permission
      const existingReview = await ctx.db.personReview.findUnique({
        where: { id: input.id },
        include: { person: true }
      })

      if (!existingReview) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Review not found',
        })
      }

      const canDelete = 
        ctx.session.user.role === 'PROJECT_MANAGER' && 
        ctx.session.user.id 

      if (!canDelete) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this review',
        })
      }

      await ctx.db.personReview.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),
})