import { z } from 'zod'
import { router, protectedProcedure, pmProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

export const peopleRouter = router({
  // Get all people (anyone can view)
  list: protectedProcedure.query(async ({ ctx }) => {
    const people = await ctx.db.person.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
        competencies: {
          include: {
            competency: true,
          },
        },
        assignments: {
          include: {
            project: {
              select: { id: true, name: true },
            },
            course: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            competencies: true,
            assignments: true,
            reviews: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return people
  }),

  // Get person by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const person = await ctx.db.person.findUnique({
        where: { id: input.id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          competencies: {
            include: {
              competency: true,
            },
            orderBy: {
              competency: { type: 'asc' },
            },
          },
          assignments: {
            include: {
              project: {
                select: { id: true, name: true, description: true },
              },
              course: {
                select: { id: true, name: true, description: true },
              },
            },
            orderBy: { startDate: 'desc' },
          },
          reviews: {
            include: {
              assignment: {
                select: {
                  id: true,
                  type: true,
                  project: { select: { name: true } },
                  course: { select: { name: true } },
                },
              },
              competencyDeltas: {
                include: {
                  competency: {
                    select: { name: true, type: true },
                  },
                },
              },
            },
            orderBy: { submittedAt: 'desc' },
            take: 10,
          },
          taskAssignments: {
            include: {
              project: {
                select: { id: true, name: true },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          projectResponsibilities: {
            include: {
              project: {
                select: { id: true, name: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      })

      if (!person) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Person not found',
        })
      }

      return person
    }),

  // Update own profile (users can update themselves)
  updateMe: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).optional(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      // Get current user's person record
      const currentUser = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { person: true },
      })

      if (!currentUser?.person) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Person record not found',
        })
      }

      const personId = currentUser.person.id
      const updates: any = {}
      const userUpdates: any = {}

      if (input.name && input.name !== currentUser.person.name) {
        updates.name = input.name
        userUpdates.name = input.name
      }

      if (input.email && input.email !== currentUser.person.email) {
        // Check if email is already taken
        const existingUser = await ctx.db.user.findUnique({
          where: { email: input.email },
        })

        if (existingUser && existingUser.id !== userId) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Email already in use',
          })
        }

        updates.email = input.email
        userUpdates.email = input.email
      }

      if (Object.keys(updates).length === 0) {
        return currentUser.person
      }

      // Update both user and person records in a transaction
      const [updatedPerson] = await ctx.db.$transaction([
        ctx.db.person.update({
          where: { id: personId },
          data: updates,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
            competencies: {
              include: {
                competency: true,
              },
            },
          },
        }),
        ...(Object.keys(userUpdates).length > 0
          ? [
              ctx.db.user.update({
                where: { id: userId },
                data: userUpdates,
              }),
            ]
          : []),
        // Create change log entry
        ctx.db.changeLog.create({
          data: {
            entity: 'PERSON',
            entityId: personId,
            field: Object.keys(updates).join(', '),
            fromValue: Object.keys(updates).reduce((acc, key) => {
              acc[key] = currentUser.person![key as keyof typeof currentUser.person]
              return acc
            }, {} as any),
            toValue: updates,
            state: 'MODIFIED',
            changedById: userId,
          },
        }),
      ])

      return updatedPerson
    }),

  // Update person by ID (PM only)
  updateById: pmProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).optional(),
        email: z.string().email().optional(),
        role: z.enum(['USER', 'PROJECT_MANAGER']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input

      const currentPerson = await ctx.db.person.findUnique({
        where: { id },
        include: { user: true },
      })

      if (!currentPerson) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Person not found',
        })
      }

      const personUpdates: any = {}
      const userUpdates: any = {}

      if (updates.name && updates.name !== currentPerson.name) {
        personUpdates.name = updates.name
        userUpdates.name = updates.name
      }

      if (updates.email && updates.email !== currentPerson.email) {
        // Check if email is already taken
        const existingUser = await ctx.db.user.findUnique({
          where: { email: updates.email },
        })

        if (existingUser && existingUser.id !== currentPerson.userId) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Email already in use',
          })
        }

        personUpdates.email = updates.email
        userUpdates.email = updates.email
      }

      if (updates.role && updates.role !== currentPerson.role) {
        personUpdates.role = updates.role
        userUpdates.role = updates.role
      }

      if (Object.keys(personUpdates).length === 0) {
        return currentPerson
      }

      // Update both person and user records in a transaction
      const [updatedPerson] = await ctx.db.$transaction([
        ctx.db.person.update({
          where: { id },
          data: personUpdates,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
            competencies: {
              include: {
                competency: true,
              },
            },
          },
        }),
        ctx.db.user.update({
          where: { id: currentPerson.userId },
          data: userUpdates,
        }),
        // Create change log entry
        ctx.db.changeLog.create({
          data: {
            entity: 'PERSON',
            entityId: id,
            field: Object.keys(personUpdates).join(', '),
            fromValue: Object.keys(personUpdates).reduce((acc, key) => {
              acc[key] = currentPerson[key as keyof typeof currentPerson]
              return acc
            }, {} as any),
            toValue: personUpdates,
            state: 'MODIFIED',
            changedById: ctx.session.user.id,
          },
        }),
      ])

      return updatedPerson
    }),

  // Manage person competencies (users can manage their own, PMs can manage anyone's)
  upsertCompetency: protectedProcedure
    .input(
      z.object({
        personId: z.string(),
        competencyId: z.string(),
        proficiency: z.enum(['BEGINNER', 'NOVICE', 'COMPETENT', 'PROFICIENT', 'EXPERT']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { personId, competencyId, proficiency } = input

      // Check if user can modify this person's competencies
      if (ctx.session.user.role !== 'PROJECT_MANAGER') {
        const userPerson = await ctx.db.person.findUnique({
          where: { userId: ctx.session.user.id },
        })

        if (!userPerson || userPerson.id !== personId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only update your own competencies',
          })
        }
      }

      // Verify competency exists and check if proficiency is applicable
      const competency = await ctx.db.competency.findUnique({
        where: { id: competencyId },
      })

      if (!competency) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Competency not found',
        })
      }

      // Only SKILL, TECH_TOOL, and ABILITY competencies should have proficiency
      const shouldHaveProficiency = ['SKILL', 'TECH_TOOL', 'ABILITY'].includes(competency.type)
      
      if (proficiency && !shouldHaveProficiency) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Competency type ${competency.type} does not support proficiency levels`,
        })
      }

      // Get existing record
      const existing = await ctx.db.personCompetency.findUnique({
        where: {
          personId_competencyId: {
            personId,
            competencyId,
          },
        },
      })

      const finalProficiency = shouldHaveProficiency ? proficiency : null

      const result = await ctx.db.personCompetency.upsert({
        where: {
          personId_competencyId: {
            personId,
            competencyId,
          },
        },
        create: {
          personId,
          competencyId,
          proficiency: finalProficiency,
        },
        update: {
          proficiency: finalProficiency,
          lastUpdatedAt: new Date(),
        },
        include: {
          competency: true,
          person: {
            select: {
              name: true,
            },
          },
        },
      })

      // Create change log entry
      await ctx.db.changeLog.create({
        data: {
          entity: 'PERSON_COMPETENCY',
          entityId: result.id,
          field: 'proficiency',
          fromValue: existing?.proficiency || null,
          toValue: finalProficiency,
          state: existing ? 'MODIFIED' : 'CREATED',
          changedById: ctx.session.user.id,
        },
      })

      return result
    }),

  // Remove competency from person
  removeCompetency: protectedProcedure
    .input(
      z.object({
        personId: z.string(),
        competencyId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { personId, competencyId } = input

      // Check if user can modify this person's competencies
      if (ctx.session.user.role !== 'PROJECT_MANAGER') {
        const userPerson = await ctx.db.person.findUnique({
          where: { userId: ctx.session.user.id },
        })

        if (!userPerson || userPerson.id !== personId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only update your own competencies',
          })
        }
      }

      const existing = await ctx.db.personCompetency.findUnique({
        where: {
          personId_competencyId: {
            personId,
            competencyId,
          },
        },
        include: {
          competency: {
            select: { name: true },
          },
        },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Competency assignment not found',
        })
      }

      await ctx.db.personCompetency.delete({
        where: {
          personId_competencyId: {
            personId,
            competencyId,
          },
        },
      })

      return { success: true, removed: existing }
    }),

  // Get person's competency history
  getCompetencyHistory: protectedProcedure
    .input(z.object({ personId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Check if user can view this person's history
      if (ctx.session.user.role !== 'PROJECT_MANAGER') {
        const userPerson = await ctx.db.person.findUnique({
          where: { userId: ctx.session.user.id },
        })

        if (!userPerson || userPerson.id !== input.personId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only view your own history',
          })
        }
      }

      const history = await ctx.db.changeLog.findMany({
        where: {
          entity: 'PERSON_COMPETENCY',
          entityId: {
            in: await ctx.db.personCompetency
              .findMany({
                where: { personId: input.personId },
                select: { id: true },
              })
              .then((records) => records.map((r) => r.id)),
          },
        },
        include: {
          changedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { changedAt: 'desc' },
      })

      return history
    }),
})