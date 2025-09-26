import { z } from 'zod'
import { router, publicProcedure, protectedProcedure, pmProcedure } from '../trpc'
import { db as prisma } from '@/lib/db'
import { TRPCError } from '@trpc/server'

// Helper function to get Monday of a given date
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
  return new Date(d.setDate(diff))
}

// Helper function to validate date is Monday
function isMondayDate(date: Date): boolean {
  return date.getDay() === 1 // Monday is 1 in JavaScript
}

export const assignmentsRouter = router({
  // List assignments for a person with optional date range
  listForPerson: protectedProcedure
    .input(z.object({
      personId: z.string(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input, ctx }) => {
      // Users can only view their own assignments unless they're PM
      if (ctx.session.user.role !== 'PROJECT_MANAGER' && ctx.session.user.id !== input.personId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only view your own assignments',
        })
      }

      const where: any = { personId: input.personId }
      
      if (input.startDate && input.endDate) {
        where.AND = [
          { startDate: { lte: input.endDate } },
          { plannedEndDate: { gte: input.startDate } }
        ]
      }

      return prisma.assignment.findMany({
        where,
        include: {
          person: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true } },
          course: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          reviews: {
            select: {
              id: true,
              weekStartDate: true,
              status: true,
              submittedAt: true,
            }
          }
        },
        orderBy: [
          { startDate: 'desc' }
        ]
      })
    }),

  // List assignments for planning (PM only) - includes conflict detection
  listForPlanning: pmProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ input }) => {
      return prisma.assignment.findMany({
        where: {
          OR: [
            {
              AND: [
                { startDate: { lte: input.endDate } },
                { plannedEndDate: { gte: input.startDate } }
              ]
            }
          ]
        },
        include: {
          person: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true } },
          course: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: [
          { person: { name: 'asc' } },
          { startDate: 'asc' }
        ]
      })
    }),

  // Create new assignment (PM only)
  create: pmProcedure
    .input(z.object({
      personId: z.string(),
      type: z.enum(['PROJECT', 'COURSE']),
      projectId: z.string().optional(),
      courseId: z.string().optional(),
      startDate: z.date(),
      plannedEndDate: z.date(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Validate that startDate is a Monday
      if (!isMondayDate(input.startDate)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Start date must be a Monday',
        })
      }

      // Validate that plannedEndDate >= startDate
      if (input.plannedEndDate < input.startDate) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Planned end date must be after or equal to start date',
        })
      }

      // Validate type-specific requirements
      if (input.type === 'PROJECT' && !input.projectId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Project ID is required for PROJECT assignments',
        })
      }

      if (input.type === 'COURSE' && !input.courseId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Course ID is required for COURSE assignments',
        })
      }

      // Check for conflicts (overlapping assignments for same person)
      const existingAssignments = await prisma.assignment.findMany({
        where: {
          personId: input.personId,
          AND: [
            { startDate: { lte: input.plannedEndDate } },
            { plannedEndDate: { gte: input.startDate } }
          ]
        },
        include: {
          project: { select: { name: true } },
          course: { select: { name: true } },
        }
      })

      if (existingAssignments.length > 0) {
        const conflictDetails = existingAssignments.map(a => 
          `${a.type === 'PROJECT' ? a.project?.name : a.course?.name} (${a.startDate.toISOString().split('T')[0]} - ${a.plannedEndDate.toISOString().split('T')[0]})`
        ).join(', ')
        
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Person already has overlapping assignments: ${conflictDetails}`,
        })
      }

      // Verify the person exists
      const person = await prisma.person.findUnique({
        where: { id: input.personId }
      })

      if (!person) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Person not found',
        })
      }

      // Verify project/course exists
      if (input.type === 'PROJECT' && input.projectId) {
        const project = await prisma.project.findUnique({
          where: { id: input.projectId }
        })
        if (!project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found',
          })
        }
      }

      if (input.type === 'COURSE' && input.courseId) {
        const course = await prisma.course.findUnique({
          where: { id: input.courseId }
        })
        if (!course) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Course not found',
          })
        }
      }

      // Create the assignment
      const assignment = await prisma.assignment.create({
        data: {
          personId: input.personId,
          type: input.type,
          projectId: input.projectId,
          courseId: input.courseId,
          startDate: input.startDate,
          plannedEndDate: input.plannedEndDate,
          createdById: ctx.session.user.id,
        },
        include: {
          person: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true } },
          course: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        }
      })

      // Create changelog entry
      await prisma.changeLog.create({
        data: {
          entity: 'ASSIGNMENT',
          entityId: assignment.id,
          field: 'created',
          fromValue: null,
          toValue: {
            personId: assignment.personId,
            type: assignment.type,
            projectId: assignment.projectId,
            courseId: assignment.courseId,
            startDate: assignment.startDate,
            plannedEndDate: assignment.plannedEndDate,
          },
          state: 'CREATED',
          changedById: ctx.session.user.id,
        }
      })

      return assignment
    }),

  // Update assignment (PM only)
  update: pmProcedure
    .input(z.object({
      id: z.string(),
      startDate: z.date().optional(),
      plannedEndDate: z.date().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.assignment.findUnique({
        where: { id: input.id }
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Assignment not found',
        })
      }

      const updateData: any = {}
      
      if (input.startDate !== undefined) {
        if (!isMondayDate(input.startDate)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Start date must be a Monday',
          })
        }
        updateData.startDate = input.startDate
      }

      if (input.plannedEndDate !== undefined) {
        const startDate = input.startDate || existing.startDate
        if (input.plannedEndDate < startDate) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Planned end date must be after or equal to start date',
          })
        }
        updateData.plannedEndDate = input.plannedEndDate
      }

      if (Object.keys(updateData).length === 0) {
        return existing
      }

      // Check for conflicts if dates are being changed
      if (input.startDate || input.plannedEndDate) {
        const newStartDate = input.startDate || existing.startDate
        const newEndDate = input.plannedEndDate || existing.plannedEndDate

        const conflictingAssignments = await prisma.assignment.findMany({
          where: {
            personId: existing.personId,
            id: { not: input.id }, // Exclude current assignment
            AND: [
              { startDate: { lte: newEndDate } },
              { plannedEndDate: { gte: newStartDate } }
            ]
          }
        })

        if (conflictingAssignments.length > 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Updated assignment would conflict with existing assignments',
          })
        }
      }

      const updated = await prisma.assignment.update({
        where: { id: input.id },
        data: updateData,
        include: {
          person: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true } },
          course: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        }
      })

      // Create changelog entries for changed fields
      for (const [field, newValue] of Object.entries(updateData)) {
        await prisma.changeLog.create({
          data: {
            entity: 'ASSIGNMENT',
            entityId: updated.id,
            field,
            fromValue: existing[field as keyof typeof existing],
            toValue: newValue,
            state: 'MODIFIED',
            changedById: ctx.session.user.id,
          }
        })
      }

      return updated
    }),

  // Delete assignment (PM only)
  delete: pmProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const assignment = await prisma.assignment.findUnique({
        where: { id: input.id },
        include: {
          reviews: true,
        }
      })

      if (!assignment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Assignment not found',
        })
      }

      // Check if there are any reviews - might want to prevent deletion if reviews exist
      if (assignment.reviews.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Cannot delete assignment with existing reviews',
        })
      }

      await prisma.assignment.delete({
        where: { id: input.id }
      })

      return { success: true }
    }),

  // Get assignment by ID
  getById: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const assignment = await prisma.assignment.findUnique({
        where: { id: input.id },
        include: {
          person: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true, description: true } },
          course: { select: { id: true, name: true, description: true } },
          createdBy: { select: { id: true, name: true } },
          reviews: {
            select: {
              id: true,
              weekStartDate: true,
              status: true,
              submittedAt: true,
              approvedAt: true,
            },
            orderBy: { weekStartDate: 'desc' }
          }
        }
      })

      if (!assignment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Assignment not found',
        })
      }

      // Users can only view their own assignments unless they're PM
      if (ctx.session.user.role !== 'PROJECT_MANAGER' && assignment.person.id !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only view your own assignments',
        })
      }

      return assignment
    }),

  // Get people workload for planning view
  getWorkload: pmProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ input }) => {
      const people = await prisma.person.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          assignments: {
            where: {
              AND: [
                { startDate: { lte: input.endDate } },
                { plannedEndDate: { gte: input.startDate } }
              ]
            },
            include: {
              project: { select: { id: true, name: true } },
              course: { select: { id: true, name: true } },
            }
          }
        },
        orderBy: { name: 'asc' }
      })

      return people.map(person => ({
        ...person,
        workload: person.assignments.length,
        assignments: person.assignments
      }))
    }),
})