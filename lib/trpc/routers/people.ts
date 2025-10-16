import { z } from 'zod'
import { router, protectedProcedure, pmProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { supportsProficiency } from '../../utils/competency'
import { Role } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

export const peopleRouter = router({
  // Create new person (PM only)
  create: pmProcedure
    .input(
      z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(['USER', 'PROJECT_MANAGER']).default('USER'),
        entryDate: z.string().datetime().optional(),
        capacity: z.number().int().min(0).max(100).default(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if email is already taken
      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email },
      })

      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Email already in use',
        })
      }

      // Hash the password with bcrypt
      const passwordHash = await bcrypt.hash(input.password, 12)

      const entryDate = input.entryDate ? new Date(input.entryDate) : new Date()

      // Create user and person in a transaction
      const result = await ctx.db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: input.email,
            passwordHash,
            name: input.name,
            role: input.role as Role,
          },
        })

        const person = await tx.person.create({
          data: {
            userId: user.id,
            name: input.name,
            email: input.email,
            role: input.role as Role,
            entryDate,
            capacity: input.capacity,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
              },
            },
          },
        })

        return person
      })

      // Create change log entry
      await ctx.db.changeLog.create({
        data: {
          entity: 'PERSON',
          entityId: result.id,
          field: 'created',
          fromValue: {},
          toValue: {
            name: input.name,
            email: input.email,
            role: input.role,
            entryDate: entryDate.toISOString(),
          },
          state: 'CREATED',
          changedById: ctx.session.user.id,
        },
      })

      return result
    }),

  // Deactivate person (PM only)
  deactivate: pmProcedure
    .input(
      z.object({
        id: z.string(),
        alternativeEmail: z.string().email().optional(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, alternativeEmail, reason } = input

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

      if (!currentPerson.isActive) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Person is already inactive',
        })
      }

      // Update person record in a transaction
      const [updatedPerson] = await ctx.db.$transaction([
        ctx.db.person.update({
          where: { id },
          data: {
            isActive: false,
            deactivatedAt: new Date(),
            alternativeEmail: alternativeEmail || undefined,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
        }),
        // Create change log entry
        ctx.db.changeLog.create({
          data: {
            entity: 'PERSON',
            entityId: id,
            field: 'status',
            fromValue: { isActive: true },
            toValue: {
              isActive: false,
              deactivatedAt: new Date().toISOString(),
              alternativeEmail: alternativeEmail || null,
              reason: reason || null,
            },
            state: 'MODIFIED',
            changedById: ctx.session.user.id,
          },
        }),
      ])

      return updatedPerson
    }),

  // Reactivate person (PM only)
  reactivate: pmProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id } = input

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

      if (currentPerson.isActive) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Person is already active',
        })
      }

      // Update person record in a transaction
      const [updatedPerson] = await ctx.db.$transaction([
        ctx.db.person.update({
          where: { id },
          data: {
            isActive: true,
            deactivatedAt: null,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
        }),
        // Create change log entry
        ctx.db.changeLog.create({
          data: {
            entity: 'PERSON',
            entityId: id,
            field: 'status',
            fromValue: { isActive: false },
            toValue: { isActive: true },
            state: 'MODIFIED',
            changedById: ctx.session.user.id,
          },
        }),
      ])

      return updatedPerson
    }),

  // Delete person permanently (PM only - use with extreme caution)
  delete: pmProcedure
    .input(
      z.object({
        id: z.string(),
        confirmEmail: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, confirmEmail } = input

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

      // Verify email confirmation matches
      if (currentPerson.email !== confirmEmail) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Email confirmation does not match',
        })
      }

      // Prevent deletion of the current user
      if (currentPerson.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot delete your own account',
        })
      }

      // Create change log entry before deletion
      await ctx.db.changeLog.create({
        data: {
          entity: 'PERSON',
          entityId: id,
          field: 'deleted',
          fromValue: {
            name: currentPerson.name,
            email: currentPerson.email,
            role: currentPerson.role,
          },
          toValue: { deleted: true },
          state: 'MODIFIED',
          changedById: ctx.session.user.id,
        },
      })

      // Delete the user (this will cascade to person due to schema constraint)
      await ctx.db.user.delete({
        where: { id: currentPerson.userId },
      })

      return { success: true, deleted: currentPerson }
    }),

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
        projectAllocations: {
          include: {
            project: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            competencies: true,
            projectAllocations: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Calculate capacity utilization for each person
    const peopleWithCapacity = people.map(person => {
      const activeAllocations = person.projectAllocations
      const totalAllocatedCapacity = activeAllocations.reduce(
        (sum, allocation) => sum + allocation.capacityAllocation, 
        0
      )
      const capacityUtilization = person.capacity > 0 ? Math.round((totalAllocatedCapacity / person.capacity) * 100) : 0
      
      return {
        ...person,
        totalAllocatedCapacity,
        capacityUtilization,
        isOverCapacity: capacityUtilization > 100,
      }
    })

    return peopleWithCapacity
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
          projectAllocations: {
            include: {
              project: {
                select: { id: true, name: true, description: true },
              },
            },
            orderBy: { createdAt: 'desc' },
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
          courseEnrollments: {
            include: {
              course: {
                select: { id: true, name: true, description: true, duration: true },
              },
            },
            orderBy: { enrolledAt: 'desc' },
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
        entryDate: z.string().datetime().optional(),
        cv: z.string().optional(),
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

      if (input.entryDate && new Date(input.entryDate).getTime() !== currentUser.person.entryDate.getTime()) {
        updates.entryDate = new Date(input.entryDate)
      }

      if (input.cv !== undefined && input.cv !== currentUser.person.cv) {
        updates.cv = input.cv
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
        entryDate: z.string().datetime().optional(),
        cv: z.string().optional(),
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

      if (updates.entryDate && new Date(updates.entryDate).getTime() !== currentPerson.entryDate.getTime()) {
        personUpdates.entryDate = new Date(updates.entryDate)
      }

      if (updates.cv !== undefined && updates.cv !== currentPerson.cv) {
        personUpdates.cv = updates.cv
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
        proficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
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

      // Only certain competencies should have proficiency
      const shouldHaveProficiency = supportsProficiency(competency.type)
      
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
          fromValue: (existing?.proficiency || null) as any,
          toValue: finalProficiency as any,
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

  // Search people by competencies
  searchByCompetencies: protectedProcedure
    .input(
      z.object({
        competencyIds: z.array(z.string()).min(1),
        minMatchPercentage: z.number().min(0).max(100).default(75),
      })
    )
    .query(async ({ ctx, input }) => {
      const { competencyIds, minMatchPercentage } = input

      // Get all people with their competencies
      const peopleWithCompetencies = await ctx.db.person.findMany({
        include: {
          competencies: {
            include: {
              competency: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      })

      // Filter and calculate match percentages
      const results = peopleWithCompetencies
        .map((person) => {
          const personCompetencyIds = person.competencies.map(pc => pc.competency.id)
          const matchingCompetencyIds = competencyIds.filter(id => personCompetencyIds.includes(id))
          const matchPercentage = Math.round((matchingCompetencyIds.length / competencyIds.length) * 100)

          if (matchPercentage < minMatchPercentage) {
            return null
          }

          const matchingCompetencies = person.competencies
            .filter(pc => competencyIds.includes(pc.competency.id))
            .map(pc => ({
              ...pc.competency,
              proficiency: pc.proficiency,
            }))

          return {
            id: person.id,
            name: person.name,
            email: person.email,
            entryDate: person.entryDate,
            matchPercentage,
            matchingCompetencies,
            totalCompetencies: person.competencies.length,
          }
        })
        .filter((person): person is NonNullable<typeof person> => person !== null)
        .sort((a, b) => b.matchPercentage - a.matchPercentage) // Sort by match percentage descending

      return results
    }),

  // Get tasks for a person
  getTasksForPerson: protectedProcedure
    .input(z.object({ personId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Check if user can view this person's tasks
      if (ctx.session.user.role !== 'PROJECT_MANAGER') {
        const userPerson = await ctx.db.person.findUnique({
          where: { userId: ctx.session.user.id },
        })

        if (!userPerson || userPerson.id !== input.personId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only view your own tasks',
          })
        }
      }

      const tasks = await ctx.db.task.findMany({
        where: { assigneeId: input.personId },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
        orderBy: [
          { state: 'asc' },
          { createdAt: 'desc' },
        ],
      })

      // Group tasks by project and status
      const tasksByProject = new Map<string, {
        project: { id: string; name: string; description: string }
        tasks: typeof tasks
      }>()

      const tasksByStatus = {
        active: [] as typeof tasks,
        completed: [] as typeof tasks,
      }

      tasks.forEach(task => {
        // Group by project
        if (task.project) {
          const projectKey = task.project.id
          if (!tasksByProject.has(projectKey)) {
            tasksByProject.set(projectKey, {
              project: task.project,
              tasks: [],
            })
          }
          tasksByProject.get(projectKey)!.tasks.push(task)
        }

        // Group by status
        if (task.state === 'DONE') {
          tasksByStatus.completed.push(task)
        } else {
          tasksByStatus.active.push(task)
        }
      })

      return {
        allTasks: tasks,
        tasksByProject: Array.from(tasksByProject.values()),
        tasksByStatus,
        summary: {
          total: tasks.length,
          active: tasksByStatus.active.length,
          completed: tasksByStatus.completed.length,
          byState: {
            BACKLOG: tasks.filter(t => t.state === 'BACKLOG').length,
            READY: tasks.filter(t => t.state === 'READY').length,
            IN_PROGRESS: tasks.filter(t => t.state === 'IN_PROGRESS').length,
            BLOCKED: tasks.filter(t => t.state === 'BLOCKED').length,
            REVIEW: tasks.filter(t => t.state === 'REVIEW').length,
            DONE: tasks.filter(t => t.state === 'DONE').length,
          },
          byPriority: {
            LOW: tasks.filter(t => t.priority === 'LOW').length,
            MEDIUM: tasks.filter(t => t.priority === 'MEDIUM').length,
            HIGH: tasks.filter(t => t.priority === 'HIGH').length,
          },
        },
      }
    }),
})
