import { z } from 'zod'
import { router, protectedProcedure, pmProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

export const coursesRouter = router({
  // Get all courses (anyone can view)
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
        search: z.string().optional(),
      }).optional().default({})
    )
    .query(async ({ ctx, input }) => {
      const where: any = {}
      
      if (input?.status) {
        where.status = input.status
      }
      
      if (input?.search) {
        where.OR = [
          { name: { contains: input.search, mode: 'insensitive' } },
          { description: { contains: input.search, mode: 'insensitive' } },
        ]
      }

      const courses = await ctx.db.course.findMany({
        where,
        include: {
          enrollments: {
            include: {
              person: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          competencies: {
            include: {
              competency: {
                select: { id: true, name: true, type: true },
              },
            },
          },
          _count: {
            select: {
              enrollments: true,
              competencies: true,
            },
          },
        },
        orderBy: [{ status: 'asc' }, { name: 'asc' }],
      })

      return courses
    }),

  // Get course by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const course = await ctx.db.course.findUnique({
        where: { id: input.id },
        include: {
          enrollments: {
            include: {
              person: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { enrolledAt: 'desc' },
          },
          competencies: {
            include: {
              competency: {
                select: { id: true, name: true, type: true, description: true },
              },
            },
          },
          _count: {
            select: {
              enrollments: true,
              competencies: true,
            },
          },
        },
      })

      if (!course) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Course not found',
        })
      }

      return course
    }),

  // Create course (PM only)
  create: pmProcedure
    .input(
      z.object({
        name: z.string().min(2),
        description: z.string().optional(),
        content: z.string().optional(),
        duration: z.number().int().positive().optional(),
        status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
        competencyIds: z.array(z.string()).optional().default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { competencyIds, ...courseData } = input

      // Check if course with same name already exists
      const existing = await ctx.db.course.findFirst({
        where: { name: input.name },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `A course with the name "${input.name}" already exists`,
        })
      }

      // Validate competency IDs exist
      if (competencyIds.length > 0) {
        const competencies = await ctx.db.competency.findMany({
          where: { id: { in: competencyIds } },
          select: { id: true },
        })

        if (competencies.length !== competencyIds.length) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'One or more competency IDs are invalid',
          })
        }
      }

      const course = await ctx.db.course.create({
        data: {
          ...courseData,
          competencies: {
            create: competencyIds.map((competencyId) => ({
              competency: { connect: { id: competencyId } },
            })),
          },
        },
        include: {
          competencies: {
            include: {
              competency: {
                select: { id: true, name: true, type: true, description: true },
              },
            },
          },
          _count: {
            select: {
              enrollments: true,
              competencies: true,
            },
          },
        },
      })

      // Create change log
      await ctx.db.changeLog.create({
        data: {
          entity: 'COURSE',
          entityId: course.id,
          field: 'created',
          toValue: { ...courseData, competencyIds },
          state: 'CREATED',
          changedById: ctx.session.user.id,
        },
      })

      return course
    }),

  // Update course (PM only)
  update: pmProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).optional(),
        description: z.string().optional(),
        content: z.string().optional(),
        duration: z.number().int().positive().optional(),
        status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
        competencyIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, competencyIds, ...updates } = input

      const current = await ctx.db.course.findUnique({
        where: { id },
        include: {
          competencies: { select: { competencyId: true } },
        },
      })

      if (!current) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Course not found',
        })
      }

      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      )

      // Check for name conflicts if name is being changed
      if (filteredUpdates.name && filteredUpdates.name !== current.name) {
        const existing = await ctx.db.course.findFirst({
          where: {
            name: filteredUpdates.name as string,
            id: { not: id },
          },
        })

        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `A course with the name "${filteredUpdates.name}" already exists`,
          })
        }
      }

      // Validate competency IDs if provided
      if (competencyIds) {
        const competencies = await ctx.db.competency.findMany({
          where: { id: { in: competencyIds } },
          select: { id: true },
        })

        if (competencies.length !== competencyIds.length) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'One or more competency IDs are invalid',
          })
        }
      }

      const course = await ctx.db.course.update({
        where: { id },
        data: {
          ...filteredUpdates,
          ...(competencyIds !== undefined && {
            competencies: {
              deleteMany: {},
              create: competencyIds.map((competencyId) => ({
                competency: { connect: { id: competencyId } },
              })),
            },
          }),
        },
        include: {
          competencies: {
            include: {
              competency: {
                select: { id: true, name: true, type: true },
              },
            },
          },
          _count: {
            select: {
              enrollments: true,
              competencies: true,
            },
          },
        },
      })

      // Create change log
      await ctx.db.changeLog.create({
        data: {
          entity: 'COURSE',
          entityId: id,
          field: Object.keys({ ...filteredUpdates, ...(competencyIds && { competencyIds }) }).join(', '),
          fromValue: {
            ...Object.keys(filteredUpdates).reduce((acc, key) => {
              acc[key] = current[key as keyof typeof current]
              return acc
            }, {} as any),
            competencyIds: current.competencies.map(c => c.competencyId),
          },
          toValue: { ...filteredUpdates, ...(competencyIds && { competencyIds }) },
          state: 'MODIFIED',
          changedById: ctx.session.user.id,
        },
      })

      return course
    }),

  // Delete course (PM only)
  delete: pmProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const course = await ctx.db.course.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: {
              enrollments: true,
            },
          },
        },
      })

      if (!course) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Course not found',
        })
      }

      // Check if course has enrollments
      if (course._count.enrollments > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Cannot delete course that has enrollments. Archive it instead.',
        })
      }

      await ctx.db.course.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  // Enroll person in course
  enroll: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        personId: z.string().optional(), // If not provided, enroll current user
      })
    )
    .mutation(async ({ ctx, input }) => {
      const personId = input.personId || ctx.session.user.id
      
      // Check if person can enroll others (PM only)
      if (input.personId && ctx.session.user.role !== 'PROJECT_MANAGER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Project Managers can enroll other people',
        })
      }

      const course = await ctx.db.course.findUnique({
        where: { id: input.courseId },
        include: {
          _count: { select: { enrollments: true } },
        },
      })

      if (!course) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Course not found',
        })
      }

      if (course.status !== 'PUBLISHED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Course is not available for enrollment',
        })
      }


      // Check if already enrolled
      const existing = await ctx.db.courseEnrollment.findUnique({
        where: {
          courseId_personId: {
            courseId: input.courseId,
            personId,
          },
        },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Already enrolled in this course',
        })
      }

      const enrollment = await ctx.db.courseEnrollment.create({
        data: {
          courseId: input.courseId,
          personId,
          enrolledAt: new Date(),
        },
        include: {
          course: { select: { id: true, name: true } },
          person: { select: { id: true, name: true } },
        },
      })

      return enrollment
    }),

  // Update enrollment progress/completion
  updateEnrollment: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        personId: z.string().optional(),
        progress: z.number().min(0).max(100).optional(),
        completed: z.boolean().optional(),
        completedAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const personId = input.personId || ctx.session.user.id
      
      // Check if person can update others' progress (PM only)
      if (input.personId && ctx.session.user.role !== 'PROJECT_MANAGER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Project Managers can update others\' progress',
        })
      }

      const enrollment = await ctx.db.courseEnrollment.findUnique({
        where: {
          courseId_personId: {
            courseId: input.courseId,
            personId,
          },
        },
      })

      if (!enrollment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Enrollment not found',
        })
      }

      const updates: any = {}
      if (input.progress !== undefined) updates.progress = input.progress
      if (input.completed !== undefined) updates.completed = input.completed
      if (input.completedAt !== undefined) updates.completedAt = input.completedAt

      // Auto-complete if progress reaches 100%
      if (input.progress === 100 && !input.completed) {
        updates.completed = true
        updates.completedAt = new Date()
      }

      const updatedEnrollment = await ctx.db.courseEnrollment.update({
        where: {
          courseId_personId: {
            courseId: input.courseId,
            personId,
          },
        },
        data: updates,
        include: {
          course: { select: { id: true, name: true } },
          person: { select: { id: true, name: true } },
        },
      })

      return updatedEnrollment
    }),

  // Get course statistics
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const stats = await ctx.db.course.groupBy({
      by: ['status'],
      _count: {
        _all: true,
      },
    })

    const enrollmentStats = await ctx.db.courseEnrollment.aggregate({
      _count: {
        _all: true,
      },
      _avg: {
        progress: true,
      },
    })

    const completionStats = await ctx.db.courseEnrollment.groupBy({
      by: ['completed'],
      _count: {
        _all: true,
      },
    })

    const totalCourses = stats.reduce((sum, stat) => sum + stat._count._all, 0)
    const completedEnrollments = completionStats.find(s => s.completed)?._count._all || 0
    const totalEnrollments = enrollmentStats._count._all

    return {
      byStatus: stats.reduce((acc, stat) => {
        acc[stat.status] = stat._count._all
        return acc
      }, {} as Record<string, number>),
      totalCourses,
      totalEnrollments,
      completedEnrollments,
      averageProgress: enrollmentStats._avg.progress || 0,
      completionRate: totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0,
    }
  }),

  // Get my enrollments (current user)
  myEnrollments: protectedProcedure.query(async ({ ctx }) => {
    const enrollments = await ctx.db.courseEnrollment.findMany({
      where: { personId: ctx.session.user.id },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            description: true,
            duration: true,
            status: true,
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    })

    return enrollments
  }),

  // Get development plan for a person
  getDevelopmentPlan: protectedProcedure
    .input(
      z.object({
        personId: z.string().optional(), // If not provided, get current user's plan
      })
    )
    .query(async ({ ctx, input }) => {
      const personId = input.personId || ctx.session.user.id
      
      // Check if user can view others' plans (PM only)
      if (input.personId && ctx.session.user.role !== 'PROJECT_MANAGER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Project Managers can view others\' development plans',
        })
      }

      const enrollments = await ctx.db.courseEnrollment.findMany({
        where: { personId },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              description: true,
              duration: true,
              status: true,
              competencies: {
                include: {
                  competency: {
                    select: { id: true, name: true, type: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      })

      return {
        wishlist: enrollments.filter(e => e.status === 'WISHLIST'),
        inProgress: enrollments.filter(e => e.status === 'IN_PROGRESS'),
        completed: enrollments.filter(e => e.status === 'COMPLETED'),
      }
    }),

  // Add course to wishlist/development plan
  addToWishlist: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        personId: z.string().optional(), // If not provided, add to current user's plan
      })
    )
    .mutation(async ({ ctx, input }) => {
      const personId = input.personId || ctx.session.user.id
      
      // Check if user can manage others' plans (PM only)
      if (input.personId && ctx.session.user.role !== 'PROJECT_MANAGER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Project Managers can manage others\' development plans',
        })
      }

      const course = await ctx.db.course.findUnique({
        where: { id: input.courseId },
      })

      if (!course) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Course not found',
        })
      }

      // Check if already enrolled
      const existing = await ctx.db.courseEnrollment.findUnique({
        where: {
          courseId_personId: {
            courseId: input.courseId,
            personId,
          },
        },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Course is already in development plan',
        })
      }

      const enrollment = await ctx.db.courseEnrollment.create({
        data: {
          courseId: input.courseId,
          personId,
          status: 'WISHLIST',
          enrolledAt: new Date(),
        },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              description: true,
              duration: true,
              status: true,
            },
          },
        },
      })

      return enrollment
    }),

  // Move course between development plan statuses
  updateEnrollmentStatus: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        personId: z.string().optional(),
        status: z.enum(['WISHLIST', 'IN_PROGRESS', 'COMPLETED']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const personId = input.personId || ctx.session.user.id
      
      // Check if user can manage others' plans (PM only)
      if (input.personId && ctx.session.user.role !== 'PROJECT_MANAGER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Project Managers can manage others\' development plans',
        })
      }

      const enrollment = await ctx.db.courseEnrollment.findUnique({
        where: {
          courseId_personId: {
            courseId: input.courseId,
            personId,
          },
        },
        include: {
          course: {
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

      if (!enrollment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Course enrollment not found',
        })
      }

      const updates: any = {
        status: input.status,
      }

      // Set dates based on status change
      if (input.status === 'IN_PROGRESS' && enrollment.status !== 'IN_PROGRESS') {
        updates.startedAt = new Date()
      }
      
      if (input.status === 'COMPLETED' && enrollment.status !== 'COMPLETED') {
        updates.completedAt = new Date()
        updates.completed = true
        updates.progress = 100
      }

      // Update enrollment
      const updatedEnrollment = await ctx.db.courseEnrollment.update({
        where: {
          courseId_personId: {
            courseId: input.courseId,
            personId,
          },
        },
        data: updates,
        include: {
          course: {
            select: {
              id: true,
              name: true,
              description: true,
              duration: true,
              status: true,
            },
          },
        },
      })

      // If moved to completed, add course competencies to person
      if (input.status === 'COMPLETED' && enrollment.status !== 'COMPLETED') {
        for (const courseComp of enrollment.course.competencies) {
          const competency = courseComp.competency
          
          // Check if person already has this competency
          const existingPersonComp = await ctx.db.personCompetency.findUnique({
            where: {
              personId_competencyId: {
                personId,
                competencyId: competency.id,
              },
            },
          })

          // Determine proficiency level for new competencies
          const defaultProficiency = {
            'SKILL': 'INTERMEDIATE',
            'TECH_TOOL': 'INTERMEDIATE', 
            'ABILITY': 'INTERMEDIATE',
            'KNOWLEDGE': 'INTERMEDIATE',
            'VALUE': 'INTERMEDIATE',
            'BEHAVIOUR': 'INTERMEDIATE',
            'ENABLER': 'INTERMEDIATE',
          }[competency.type] as any

          if (!existingPersonComp && defaultProficiency) {
            // Add new competency
            await ctx.db.personCompetency.create({
              data: {
                personId,
                competencyId: competency.id,
                proficiency: defaultProficiency,
                lastUpdatedAt: new Date(),
              },
            })
          } else if (existingPersonComp && defaultProficiency) {
            // Update only if the new proficiency is higher
            const proficiencyLevels = { 'BEGINNER': 1, 'INTERMEDIATE': 2, 'ADVANCED': 3, 'EXPERT': 4 }
            const currentLevel = proficiencyLevels[existingPersonComp.proficiency as keyof typeof proficiencyLevels] || 0
            const newLevel = proficiencyLevels[defaultProficiency as keyof typeof proficiencyLevels] || 0
            
            if (newLevel > currentLevel) {
              await ctx.db.personCompetency.update({
                where: {
                  personId_competencyId: {
                    personId,
                    competencyId: competency.id,
                  },
                },
                data: {
                  proficiency: defaultProficiency,
                  lastUpdatedAt: new Date(),
                },
              })
            }
          }
        }
      }

      return updatedEnrollment
    }),

  // Update enrollment dates and progress
  updateEnrollmentDates: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        personId: z.string().optional(),
        startedAt: z.string().optional().transform(val => val ? new Date(val) : undefined),
        completedAt: z.string().optional().transform(val => val ? new Date(val) : undefined),
        progress: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const personId = input.personId || ctx.session.user.id
      
      // Check if user can manage others' plans (PM only)
      if (input.personId && ctx.session.user.role !== 'PROJECT_MANAGER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Project Managers can manage others\' development plans',
        })
      }

      const enrollment = await ctx.db.courseEnrollment.findUnique({
        where: {
          courseId_personId: {
            courseId: input.courseId,
            personId,
          },
        },
      })

      if (!enrollment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Course enrollment not found',
        })
      }

      const updates: any = {}
      if (input.startedAt !== undefined) updates.startedAt = input.startedAt
      if (input.completedAt !== undefined) updates.completedAt = input.completedAt
      if (input.progress !== undefined) updates.progress = input.progress

      // Auto-complete if progress reaches 100%
      if (input.progress === 100 && !updates.completedAt) {
        updates.completed = true
        updates.completedAt = new Date()
      }

      const updatedEnrollment = await ctx.db.courseEnrollment.update({
        where: {
          courseId_personId: {
            courseId: input.courseId,
            personId,
          },
        },
        data: updates,
        include: {
          course: {
            select: {
              id: true,
              name: true,
              description: true,
              duration: true,
              status: true,
            },
          },
        },
      })

      return updatedEnrollment
    }),

  // Add single competency to course with proficiency
  addCompetency: pmProcedure
    .input(
      z.object({
        courseId: z.string(),
        competencyId: z.string(),
        proficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if course exists
      const course = await ctx.db.course.findUnique({
        where: { id: input.courseId },
      })

      if (!course) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Course not found',
        })
      }

      // Check if competency exists
      const competency = await ctx.db.competency.findUnique({
        where: { id: input.competencyId },
      })

      if (!competency) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Competency not found',
        })
      }

      // Check if already exists
      const existing = await ctx.db.courseCompetency.findUnique({
        where: {
          courseId_competencyId: {
            courseId: input.courseId,
            competencyId: input.competencyId,
          },
        },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Competency already added to this course',
        })
      }

      const courseCompetency = await ctx.db.courseCompetency.create({
        data: {
          courseId: input.courseId,
          competencyId: input.competencyId,
          proficiency: input.proficiency,
        },
        include: {
          competency: {
            select: { id: true, name: true, type: true, description: true },
          },
        },
      })

      return courseCompetency
    }),

  // Update course competency proficiency
  updateCompetencyProficiency: pmProcedure
    .input(
      z.object({
        courseId: z.string(),
        competencyId: z.string(),
        proficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const courseCompetency = await ctx.db.courseCompetency.findUnique({
        where: {
          courseId_competencyId: {
            courseId: input.courseId,
            competencyId: input.competencyId,
          },
        },
      })

      if (!courseCompetency) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Course competency not found',
        })
      }

      const updated = await ctx.db.courseCompetency.update({
        where: {
          courseId_competencyId: {
            courseId: input.courseId,
            competencyId: input.competencyId,
          },
        },
        data: {
          proficiency: input.proficiency,
        },
        include: {
          competency: {
            select: { id: true, name: true, type: true, description: true },
          },
        },
      })

      return updated
    }),

  // Remove single competency from course
  removeCompetency: pmProcedure
    .input(
      z.object({
        courseId: z.string(),
        competencyId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const courseCompetency = await ctx.db.courseCompetency.findUnique({
        where: {
          courseId_competencyId: {
            courseId: input.courseId,
            competencyId: input.competencyId,
          },
        },
      })

      if (!courseCompetency) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Course competency not found',
        })
      }

      await ctx.db.courseCompetency.delete({
        where: {
          courseId_competencyId: {
            courseId: input.courseId,
            competencyId: input.competencyId,
          },
        },
      })

      return { success: true }
    }),
})
