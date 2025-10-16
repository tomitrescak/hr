import { z } from 'zod'
import { router, protectedProcedure, pmProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { PrismaClient } from '@prisma/client'
import { supportsProficiency } from '../../utils/competency'

// Helper function to get Monday of a given date
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

export const reviewsRouter = router({
  // Get review by assignment and week
  getByAssignmentAndWeek: protectedProcedure
    .input(z.object({
      assignmentId: z.string(),
      weekStartDate: z.date(),
    }))
    .query(async ({ input, ctx }) => {
      const assignment = await ctx.db.assignment.findUnique({
        where: { id: input.assignmentId },
        include: {
          person: true,
          project: { select: { id: true, name: true } },
          course: { select: { id: true, name: true } },
        }
      })

      if (!assignment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Assignment not found',
        })
      }

      // Users can only view their own reviews unless they're PM
      if (ctx.session.user.role !== 'PROJECT_MANAGER' && assignment.person.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only view your own reviews',
        })
      }

      // Ensure weekStartDate is Monday
      const mondayDate = getMondayOfWeek(input.weekStartDate)

      const review = await ctx.db.review.findUnique({
        where: {
          assignmentId_weekStartDate: {
            assignmentId: input.assignmentId,
            weekStartDate: mondayDate,
          }
        },
        include: {
          competencyDeltas: {
            include: {
              review: {
                select: {
                  assignment: {
                    select: {
                      person: {
                        select: {
                          competencies: {
                            where: { competencyId: { in: [] } }, // Will be populated dynamically
                            select: { competencyId: true, proficiency: true }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          submittedBy: { select: { id: true, name: true, email: true } },
          approvedBy: { select: { id: true, name: true } },
        }
      })

      return {
        assignment,
        review,
      }
    }),

  // Create or update review (USER for own reviews, PM can approve)
  createOrUpdate: protectedProcedure
    .input(z.object({
      assignmentId: z.string(),
      weekStartDate: z.date(),
      status: z.enum(['FINISHED', 'IN_PROGRESS', 'STALLED']),
      competencyDeltas: z.array(z.object({
        competencyId: z.string(),
        newProficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
      })).optional(),
      reflection: z.string(),
      positives: z.array(z.string()),
      negatives: z.array(z.string()),
    }))
    .mutation(async ({ input, ctx }) => {
      const assignment = await ctx.db.assignment.findUnique({
        where: { id: input.assignmentId },
        include: {
          person: true,
        }
      })

      if (!assignment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Assignment not found',
        })
      }

      // Users can only create/update their own reviews unless they're PM
      if (ctx.session.user.role !== 'PROJECT_MANAGER' && assignment.person.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only create/update your own reviews',
        })
      }

      // Ensure weekStartDate is Monday and within assignment period
      const mondayDate = getMondayOfWeek(input.weekStartDate)
      
      // Check if week falls within assignment period
      if (mondayDate < assignment.startDate || mondayDate > assignment.plannedEndDate) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Review week must fall within assignment period',
        })
      }

      // Validate competency deltas - only allow proficiency updates for SKILL, TECH_TOOL, ABILITY
      if (input.competencyDeltas && input.competencyDeltas.length > 0) {
        const competencyIds = input.competencyDeltas.map(d => d.competencyId)
        const competencies = await ctx.db.competency.findMany({
          where: { id: { in: competencyIds } }
        })

        for (const delta of input.competencyDeltas) {
          const competency = competencies.find(c => c.id === delta.competencyId)
          if (!competency) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: `Competency ${delta.competencyId} not found`,
            })
          }

          // Only certain competencies can have proficiency
          if (delta.newProficiency && !supportsProficiency(competency.type)) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Competency ${competency.name} (${competency.type}) cannot have proficiency`,
            })
          }
        }
      }

      // Create or update review
      const review = await ctx.db.review.upsert({
        where: {
          assignmentId_weekStartDate: {
            assignmentId: input.assignmentId,
            weekStartDate: mondayDate,
          }
        },
        create: {
          assignmentId: input.assignmentId,
          weekStartDate: mondayDate,
          status: input.status,
          reflection: input.reflection,
          positives: input.positives,
          negatives: input.negatives,
          submittedById: assignment.person.id,
        },
        update: {
          status: input.status,
          reflection: input.reflection,
          positives: input.positives,
          negatives: input.negatives,
          submittedAt: new Date(),
        },
        include: {
          competencyDeltas: true,
        }
      })

      // Handle competency deltas
      if (input.competencyDeltas && input.competencyDeltas.length > 0) {
        // Delete existing deltas
        await ctx.db.competencyDelta.deleteMany({
          where: { reviewId: review.id }
        })

        // Create new deltas
        const deltasData = input.competencyDeltas.map(delta => ({
          reviewId: review.id,
          competencyId: delta.competencyId,
          newProficiency: delta.newProficiency,
        }))

        await ctx.db.competencyDelta.createMany({
          data: deltasData
        })

        // Update PersonCompetency records based on deltas
        for (const delta of input.competencyDeltas) {
          if (delta.newProficiency) {
            await ctx.db.personCompetency.upsert({
              where: {
                personId_competencyId: {
                  personId: assignment.person.id,
                  competencyId: delta.competencyId,
                }
              },
              create: {
                personId: assignment.person.id,
                competencyId: delta.competencyId,
                proficiency: delta.newProficiency,
                lastUpdatedAt: new Date(),
              },
              update: {
                proficiency: delta.newProficiency,
                lastUpdatedAt: new Date(),
              }
            })

            // Create changelog entry for proficiency change
            await ctx.db.changeLog.create({
              data: {
                entity: 'PERSON_COMPETENCY',
                entityId: `${assignment.person.id}-${delta.competencyId}`,
                field: 'proficiency',
                fromValue: null as any, // Could track previous value if needed
                toValue: delta.newProficiency as any,
                state: 'MODIFIED',
                changedById: ctx.session.user.id,
              }
            })
          }
        }
      }

      // Create changelog entry for review
      await ctx.db.changeLog.create({
        data: {
          entity: 'REVIEW',
          entityId: review.id,
          field: 'updated',
          fromValue: null as any,
          toValue: {
            status: input.status,
            competencyDeltas: input.competencyDeltas?.length || 0,
          } as any,
          state: 'MODIFIED',
          changedById: ctx.session.user.id,
        }
      })

      return ctx.db.review.findUnique({
        where: { id: review.id },
        include: {
          competencyDeltas: true,
          submittedBy: { select: { id: true, name: true, email: true } },
          approvedBy: { select: { id: true, name: true } },
        }
      })
    }),

  // Approve review (PM only)
  approve: pmProcedure
    .input(z.object({
      id: z.string(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const review = await ctx.db.review.findUnique({
        where: { id: input.id }
      })

      if (!review) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Review not found',
        })
      }

      const updatedReview = await ctx.db.review.update({
        where: { id: input.id },
        data: {
          approvedById: ctx.session.user.id,
          approvedAt: new Date(),
          comment: input.comment,
        },
        include: {
          competencyDeltas: true,
          submittedBy: { select: { id: true, name: true, email: true } },
          approvedBy: { select: { id: true, name: true } },
        }
      })

      // Create changelog entry
      await ctx.db.changeLog.create({
        data: {
          entity: 'REVIEW',
          entityId: review.id,
          field: 'approved',
          fromValue: null as any,
          toValue: {
            approvedById: ctx.session.user.id,
            comment: input.comment,
          } as any,
          state: 'MODIFIED',
          changedById: ctx.session.user.id,
        }
      })

      return updatedReview
    }),

  // List reviews for person (with optional filtering)
  listForPerson: protectedProcedure
    .input(z.object({
      personId: z.string(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input, ctx }) => {
      // Users can only view their own reviews unless they're PM
      if (ctx.session.user.role !== 'PROJECT_MANAGER' && ctx.session.user.id !== input.personId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only view your own reviews',
        })
      }

      const where: any = {
        assignment: {
          personId: input.personId
        }
      }

      if (input.startDate && input.endDate) {
        where.weekStartDate = {
          gte: input.startDate,
          lte: input.endDate,
        }
      }

      return ctx.db.review.findMany({
        where,
        include: {
          assignment: {
            include: {
              project: { select: { id: true, name: true } },
              course: { select: { id: true, name: true } },
              person: { select: { id: true, name: true, email: true } },
            }
          },
          competencyDeltas: {
            include: {
              // Need to get competency info for display
            }
          },
          submittedBy: { select: { id: true, name: true, email: true } },
          approvedBy: { select: { id: true, name: true } },
        },
        orderBy: { weekStartDate: 'desc' }
      })
    }),

  // List all reviews (PM only) - for management/approval
  listForApproval: pmProcedure
    .input(z.object({
      approvedOnly: z.boolean().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const where: any = {}

      if (input.approvedOnly !== undefined) {
        if (input.approvedOnly) {
          where.approvedAt = { not: null }
        } else {
          where.approvedAt = null
        }
      }

      if (input.startDate && input.endDate) {
        where.weekStartDate = {
          gte: input.startDate,
          lte: input.endDate,
        }
      }

      return ctx.db.review.findMany({
        where,
        include: {
          assignment: {
            include: {
              project: { select: { id: true, name: true } },
              course: { select: { id: true, name: true } },
              person: { select: { id: true, name: true, email: true } },
            }
          },
          competencyDeltas: true,
          submittedBy: { select: { id: true, name: true, email: true } },
          approvedBy: { select: { id: true, name: true } },
        },
        orderBy: [
          { approvedAt: 'asc' }, // Unapproved first
          { weekStartDate: 'desc' }
        ]
      })
    }),

  // Get review by ID
  getById: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const review = await ctx.db.review.findUnique({
        where: { id: input.id },
        include: {
          assignment: {
            include: {
              project: { select: { id: true, name: true, description: true } },
              course: { select: { id: true, name: true, description: true } },
              person: { select: { id: true, name: true, email: true } },
            }
          },
          competencyDeltas: {
            include: {
              // Get competency details
            }
          },
          submittedBy: { select: { id: true, name: true, email: true } },
          approvedBy: { select: { id: true, name: true } },
        }
      })

      if (!review) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Review not found',
        })
      }

      // Users can only view their own reviews unless they're PM
      if (ctx.session.user.role !== 'PROJECT_MANAGER' && review.assignment.person.id !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only view your own reviews',
        })
      }

      return review
    }),

  // Get competencies available for review (SKILL, TECH_TOOL, ABILITY only)
  getAvailableCompetencies: protectedProcedure
    .input(z.object({
      personId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      // Users can only get competencies for themselves unless they're PM
      if (ctx.session.user.role !== 'PROJECT_MANAGER' && ctx.session.user.id !== input.personId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only view your own competencies',
        })
      }

      return ctx.db.competency.findMany({
        where: {
          type: { in: ['SKILL', 'TECH_TOOL', 'ABILITY'] },
        },
        include: {
          personCompetencies: {
            where: { personId: input.personId },
            select: { proficiency: true, lastUpdatedAt: true }
          }
        },
        orderBy: [
          { type: 'asc' },
          { name: 'asc' }
        ]
      })
    }),
})