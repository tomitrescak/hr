import { z } from 'zod'
import { router, protectedProcedure, pmProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

export const competenciesRouter = router({
  // Get all competencies (anyone can view)
  list: protectedProcedure
    .input(
      z.object({
        type: z.enum(['KNOWLEDGE', 'SKILL', 'TECH_TOOL', 'ABILITY', 'VALUE', 'BEHAVIOUR', 'ENABLER']).optional(),
      }).optional().default({})
    )
    .query(async ({ ctx, input }) => {
      const competencies = await ctx.db.competency.findMany({
        where: input?.type ? { type: input.type } : {},
        include: {
          personCompetencies: {
            include: {
              person: {
                select: { id: true, name: true },
              },
            },
          },
          courseCompetencies: {
            include: {
              course: {
                select: { id: true, name: true },
              },
            },
          },
          _count: {
            select: {
              personCompetencies: true,
              courseCompetencies: true,
            },
          },
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      })

      return competencies
    }),

  // Get competency by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const competency = await ctx.db.competency.findUnique({
        where: { id: input.id },
        include: {
          personCompetencies: {
            include: {
              person: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          courseCompetencies: {
            include: {
              course: {
                select: { id: true, name: true, description: true },
              },
            },
          },
        },
      })

      if (!competency) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Competency not found',
        })
      }

      return competency
    }),

  // Create competency (PM only)
  create: pmProcedure
    .input(
      z.object({
        type: z.enum(['KNOWLEDGE', 'SKILL', 'TECH_TOOL', 'ABILITY', 'VALUE', 'BEHAVIOUR', 'ENABLER']),
        name: z.string().min(2),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if competency with same name already exists
      const existing = await ctx.db.competency.findFirst({
        where: {
          name: input.name,
          type: input.type,
        },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `A ${input.type} competency with the name "${input.name}" already exists`,
        })
      }

      const competency = await ctx.db.competency.create({
        data: input,
        include: {
          _count: {
            select: {
              personCompetencies: true,
              courseCompetencies: true,
            },
          },
        },
      })

      // Create change log
      await ctx.db.changeLog.create({
        data: {
          entity: 'COURSE_COMPETENCY',
          entityId: competency.id,
          field: 'created',
          toValue: input,
          state: 'CREATED',
          changedById: ctx.session.user.id,
        },
      })

      return competency
    }),

  // Update competency (PM only)
  update: pmProcedure
    .input(
      z.object({
        id: z.string(),
        type: z.enum(['KNOWLEDGE', 'SKILL', 'TECH_TOOL', 'ABILITY', 'VALUE', 'BEHAVIOUR', 'ENABLER']).optional(),
        name: z.string().min(2).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input

      const current = await ctx.db.competency.findUnique({ where: { id } })
      if (!current) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Competency not found',
        })
      }

      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      )

      if (Object.keys(filteredUpdates).length === 0) {
        return current
      }

      // Check for name conflicts if name is being changed
      if (filteredUpdates.name && filteredUpdates.name !== current.name) {
        const existing = await ctx.db.competency.findFirst({
          where: {
            name: filteredUpdates.name,
            type: (filteredUpdates.type as any) || current.type,
            id: { not: id },
          },
        })

        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `A competency with the name "${filteredUpdates.name}" already exists`,
          })
        }
      }

      const competency = await ctx.db.competency.update({
        where: { id },
        data: filteredUpdates,
        include: {
          _count: {
            select: {
              personCompetencies: true,
              courseCompetencies: true,
            },
          },
        },
      })

      // Create change log
      await ctx.db.changeLog.create({
        data: {
          entity: 'COURSE_COMPETENCY',
          entityId: id,
          field: Object.keys(filteredUpdates).join(', '),
          fromValue: Object.keys(filteredUpdates).reduce((acc, key) => {
            acc[key] = current[key as keyof typeof current]
            return acc
          }, {} as any),
          toValue: filteredUpdates,
          state: 'MODIFIED',
          changedById: ctx.session.user.id,
        },
      })

      return competency
    }),

  // Delete competency (PM only)
  delete: pmProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const competency = await ctx.db.competency.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: {
              personCompetencies: true,
              courseCompetencies: true,
            },
          },
        },
      })

      if (!competency) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Competency not found',
        })
      }

      // Check if competency is in use
      if (competency._count.personCompetencies > 0 || competency._count.courseCompetencies > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Cannot delete competency that is assigned to people or courses',
        })
      }

      await ctx.db.competency.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  // Get competency statistics
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const stats = await ctx.db.competency.groupBy({
      by: ['type'],
      _count: {
        _all: true,
      },
    })

    const personCompetencyStats = await ctx.db.personCompetency.groupBy({
      by: ['proficiency'],
      _count: {
        _all: true,
      },
      where: {
        proficiency: { not: null },
      },
    })

    return {
      byType: stats.reduce((acc, stat) => {
        acc[stat.type] = stat._count._all
        return acc
      }, {} as Record<string, number>),
      byProficiency: personCompetencyStats.reduce((acc, stat) => {
        acc[stat.proficiency!] = stat._count._all
        return acc
      }, {} as Record<string, number>),
      totalCompetencies: stats.reduce((sum, stat) => sum + stat._count._all, 0),
      totalAssignments: personCompetencyStats.reduce((sum, stat) => sum + stat._count._all, 0),
    }
  }),

  // Bulk create competencies from LLM extraction
  bulkCreate: pmProcedure
    .input(
      z.array(
        z.object({
          type: z.enum(['KNOWLEDGE', 'SKILL', 'TECH_TOOL', 'ABILITY', 'VALUE', 'BEHAVIOUR', 'ENABLER']),
          name: z.string().min(2),
          description: z.string().optional(),
        })
      )
    )
    .mutation(async ({ ctx, input }) => {
      const results = {
        created: [] as any[],
        skipped: [] as string[],
        errors: [] as string[],
      }

      for (const competencyData of input) {
        try {
          // Check if competency already exists
          const existing = await ctx.db.competency.findFirst({
            where: {
              name: competencyData.name,
              type: competencyData.type,
            },
          })

          if (existing) {
            results.skipped.push(competencyData.name)
            continue
          }

          // Create the competency
          const competency = await ctx.db.competency.create({
            data: competencyData,
          })

          results.created.push(competency)

          // Create change log
          await ctx.db.changeLog.create({
            data: {
              entity: 'COURSE_COMPETENCY',
              entityId: competency.id,
              field: 'bulk_created',
              toValue: competencyData,
              state: 'CREATED',
              changedById: ctx.session.user.id,
            },
          })
        } catch (error) {
          results.errors.push(`Failed to create ${competencyData.name}: ${error}`)
        }
      }

      return results
    }),
})