import { z } from 'zod'
import { router, protectedProcedure, pmProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { generateEmbedding, findSimilarCompetencies } from '@/lib/services/embedding'
import { randomUUID } from 'crypto'
import { CompetencyType } from '@prisma/client'

export async function checkCreateCompetency(input: {
  id: string,
  name: string | null | undefined,
  description: string | null | undefined,
  type: string | null | undefined,
}, ctx: {
  db: typeof import('@/lib/db').db
}) {
  let competency = input.id.startsWith('+') ? null : await ctx.db.competency.findUnique({
    where: { id: input.id },
  })

  if (competency) {
    return competency;
  }

  // new competencies must provide name and type
  if (!input.name || !input.type) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Competency name and type are required to create a new competency',
    })
  }

  // check if we are creating a duplicate competency
  const existing = await ctx.db.competency.findFirst({
    where: {
      name: {
        equals: input.name,
        mode: 'insensitive',
      },
      type: input.type as CompetencyType,
    },
  })

  if (existing) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: `A ${input.type} competency with the name "${input.name}" already exists`,
    })
  }

  const id = input.id.substring(1) // Remove '+' prefix
  if (!id) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid competency ID',
    })
  }

  competency = await ctx.db.competency.create({
    data: {
      id: id,
      name: input.name,
      description: input.description,
      type: input.type as any
    },
    include: {
      embeddings: true,
    },
  })

  // Create embedding for new competency

  const embeddings = await generateEmbedding(competency.name)
  const vectorString = `[${embeddings.join(',')}]`

  await ctx.db.$executeRawUnsafe(`
          INSERT INTO "competency_embeddings" ("id", "competencyId", "embeddings", "createdAt", "updatedAt")
          VALUES ($1, $2, $3::vector, NOW(), NOW())
        `, randomUUID(), id, vectorString)

  return competency;
}

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
        where: {
          ...(input?.type ? { type: input.type } : {}),
        },
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
          embeddings: true,
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
        embeddings: z.string().optional(), // Existing embedding to avoid regeneration
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if competency with same name already exists (case insensitive)
      // Only check non-draft competencies for conflicts
      const existing = await ctx.db.competency.findFirst({
        where: {
          name: {
            equals: input.name,
            mode: 'insensitive',
          },
          type: input.type
        },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `A ${input.type} competency with the name "${input.name}" already exists`,
        })
      }

      const { embeddings: providedEmbedding, ...competencyData } = input

      const competency = await ctx.db.competency.create({
        data: competencyData,
        include: {
          embeddings: true,
          _count: {
            select: {
              personCompetencies: true,
              courseCompetencies: true,
            },
          },
        },
      })

      // Use provided embedding or generate new one
      try {
        const vectorString = providedEmbedding || `[${(await generateEmbedding(competency.name)).join(',')}]`

        // Use raw SQL to insert both regular embedding and pgvector format
        await ctx.db.$executeRawUnsafe(`
          INSERT INTO "competency_embeddings" ("id", "competencyId", "embeddings", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4::vector, NOW(), NOW())
        `, randomUUID(), competency.id, vectorString)
      } catch (embeddingError) {
        console.error('Failed to create embedding for competency:', embeddingError)
        // Don't fail the competency creation if embedding fails
      }

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
          embeddings: true,
          _count: {
            select: {
              personCompetencies: true,
              courseCompetencies: true,
            },
          },
        },
      })

      // If name was changed, update the embedding
      if (filteredUpdates.name) {
        try {
          const embedding = await generateEmbedding(competency.name)
          const vectorString = `[${embedding.join(',')}]`

          // Use raw SQL to update both embedding formats
          await ctx.db.$executeRawUnsafe(`
            UPDATE "competency_embeddings" 
            SET "embeddings" = $1::vector, "updatedAt" = NOW()
            WHERE "competencyId" = $2
          `, vectorString, id)
        } catch (embeddingError) {
          console.error('Failed to update embedding for competency:', embeddingError)
          // Don't fail the competency update if embedding fails
        }
      }

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


})
