import { z } from 'zod'
import { router, protectedProcedure, pmProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

export const coursesRouter = router({
  // Get all courses (anyone can view)
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
      }).optional().default({})
    )
    .query(async ({ ctx, input }) => {
      const where: any = {}
      
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
        orderBy: { name: 'asc' },
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
          specialisationCourses: {
            include: {
              course: {
                select: { id: true, name: true, duration: true, description: true },
              },
            },
            orderBy: { order: 'asc' },
          },
          _count: {
            select: {
              enrollments: true,
              competencies: true,
              specialisationCourses: true,
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
        url: z.string().url().optional().or(z.literal('')),
        type: z.enum(['COURSE', 'SPECIALISATION']).default('COURSE'),
        duration: z.number().int().positive().optional(),
        competencyIds: z.array(z.string()).optional().default([]),
        specialisationCourses: z.array(z.string()).optional().default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { competencyIds, specialisationCourses, url, ...courseData } = input
      
      // Clean up URL - convert empty string to null
      const cleanUrl = url && url.trim() !== '' ? url : null

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
      
      // For specialisations, validate that selected courses exist and are of type COURSE
      if (input.type === 'SPECIALISATION' && specialisationCourses.length > 0) {
        const courses = await ctx.db.course.findMany({
          where: {
            id: { in: specialisationCourses },
            type: 'COURSE',
          },
          select: { id: true },
        })

        if (courses.length !== specialisationCourses.length) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'One or more specialisation course IDs are invalid or not of type COURSE',
          })
        }
      }

      const course = await ctx.db.course.create({
        data: {
          ...courseData,
          url: cleanUrl,
          competencies: {
            create: competencyIds.map((competencyId) => ({
              competency: { connect: { id: competencyId } },
            })),
          },
          ...(input.type === 'SPECIALISATION' && specialisationCourses.length > 0 && {
            specialisationCourses: {
              create: specialisationCourses.map((courseId, index) => ({
                course: { connect: { id: courseId } },
                order: index + 1,
              })),
            },
          }),
        },
        include: {
          competencies: {
            include: {
              competency: {
                select: { id: true, name: true, type: true, description: true },
              },
            },
          },
          specialisationCourses: {
            include: {
              course: {
                select: { id: true, name: true, duration: true },
              },
            },
            orderBy: { order: 'asc' },
          },
          _count: {
            select: {
              enrollments: true,
              competencies: true,
              specialisationCourses: true,
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
          toValue: { ...courseData, url: cleanUrl, competencyIds, specialisationCourses },
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
        url: z.string().url().optional().or(z.literal('')),
        type: z.enum(['COURSE', 'SPECIALISATION']).optional(),
        duration: z.number().int().positive().optional(),
        competencyIds: z.array(z.string()).optional(),
        specialisationCourses: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, competencyIds, specialisationCourses, url, ...updates } = input
      
      // Clean up URL - convert empty string to null
      const cleanUrl = url !== undefined ? (url && url.trim() !== '' ? url : null) : undefined

      const current = await ctx.db.course.findUnique({
        where: { id },
        include: {
          competencies: { select: { competencyId: true } },
          specialisationCourses: { select: { courseId: true } },
        },
      })

      if (!current) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Course not found',
        })
      }

      const filteredUpdates = Object.fromEntries(
        Object.entries({ ...updates, ...(cleanUrl !== undefined && { url: cleanUrl }) }).filter(([_, v]) => v !== undefined)
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
      
      // For specialisations, validate that selected courses exist and are of type COURSE
      if (specialisationCourses) {
        const courses = await ctx.db.course.findMany({
          where: {
            id: { in: specialisationCourses },
            type: 'COURSE',
          },
          select: { id: true },
        })

        if (courses.length !== specialisationCourses.length) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'One or more specialisation course IDs are invalid or not of type COURSE',
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
          ...(specialisationCourses !== undefined && {
            specialisationCourses: {
              deleteMany: {},
              create: specialisationCourses.map((courseId, index) => ({
                course: { connect: { id: courseId } },
                order: index + 1,
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
          specialisationCourses: {
            include: {
              course: {
                select: { id: true, name: true, duration: true },
              },
            },
            orderBy: { order: 'asc' },
          },
          _count: {
            select: {
              enrollments: true,
              competencies: true,
              specialisationCourses: true,
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
    const courseStats = await ctx.db.course.aggregate({
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

    const totalCourses = courseStats._count._all
    const completedEnrollments = completionStats.find(s => s.completed)?._count._all || 0
    const totalEnrollments = enrollmentStats._count._all

    return {
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
            },
          },
        },
      })

      // If moved to completed, add course competencies to person
      if (input.status === 'COMPLETED' && enrollment.status !== 'COMPLETED') {
        console.log(`Adding competencies for completed course: ${enrollment.course.id} to person: ${personId}`)
        console.log(`Course has ${enrollment.course.competencies.length} competencies`)
        
        for (const courseComp of enrollment.course.competencies) {
          const competency = courseComp.competency
          
          console.log(`Processing competency: ${competency.name} (${competency.type})`)
          
          // Check if person already has this competency
          const existingPersonComp = await ctx.db.personCompetency.findUnique({
            where: {
              personId_competencyId: {
                personId,
                competencyId: competency.id,
              },
            },
          })

          // Use the course's proficiency level if available, otherwise default
          let targetProficiency = courseComp.proficiency
          if (!targetProficiency) {
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
            targetProficiency = defaultProficiency
          }

          if (!existingPersonComp && targetProficiency) {
            // Add new competency
            console.log(`Adding new competency: ${competency.name} with proficiency: ${targetProficiency}`)
            await ctx.db.personCompetency.create({
              data: {
                personId,
                competencyId: competency.id,
                proficiency: targetProficiency,
                lastUpdatedAt: new Date(),
              },
            })
          } else if (existingPersonComp && targetProficiency) {
            // Update only if the new proficiency is higher
            const proficiencyLevels = { 'BEGINNER': 1, 'INTERMEDIATE': 2, 'ADVANCED': 3, 'EXPERT': 4 }
            const currentLevel = proficiencyLevels[existingPersonComp.proficiency as keyof typeof proficiencyLevels] || 0
            const newLevel = proficiencyLevels[targetProficiency as keyof typeof proficiencyLevels] || 0
            
            console.log(`Existing competency: ${competency.name}, current: ${existingPersonComp.proficiency} (${currentLevel}), target: ${targetProficiency} (${newLevel})`)
            
            if (newLevel > currentLevel) {
              console.log(`Updating competency: ${competency.name} from ${existingPersonComp.proficiency} to ${targetProficiency}`)
              await ctx.db.personCompetency.update({
                where: {
                  personId_competencyId: {
                    personId,
                    competencyId: competency.id,
                  },
                },
                data: {
                  proficiency: targetProficiency,
                  lastUpdatedAt: new Date(),
                },
              })
            } else {
              console.log(`Keeping existing higher proficiency: ${existingPersonComp.proficiency}`)
            }
          } else {
            console.log(`Skipping competency: ${competency.name} - no target proficiency determined`)
          }
        }
        console.log(`Finished adding competencies for course completion`)
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

      const updates: any = {}
      if (input.startedAt !== undefined) updates.startedAt = input.startedAt
      if (input.completedAt !== undefined) updates.completedAt = input.completedAt
      if (input.progress !== undefined) updates.progress = input.progress

      // Auto-complete if progress reaches 100%
      const wasNotCompleted = !enrollment.completed
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
            },
          },
        },
      })

      // If auto-completed via progress = 100%, add competencies to person profile
      if (updates.completed && wasNotCompleted) {
        console.log(`Auto-completed course via progress 100% - adding competencies for course: ${enrollment.course.id} to person: ${personId}`)
        console.log(`Course has ${enrollment.course.competencies.length} competencies`)
        
        for (const courseComp of enrollment.course.competencies) {
          const competency = courseComp.competency
          
          console.log(`Processing competency: ${competency.name} (${competency.type})`)
          
          // Check if person already has this competency
          const existingPersonComp = await ctx.db.personCompetency.findUnique({
            where: {
              personId_competencyId: {
                personId,
                competencyId: competency.id,
              },
            },
          })

          // Use the course's proficiency level if available, otherwise default
          let targetProficiency = courseComp.proficiency
          if (!targetProficiency) {
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
            targetProficiency = defaultProficiency
          }

          if (!existingPersonComp && targetProficiency) {
            // Add new competency
            console.log(`Adding new competency: ${competency.name} with proficiency: ${targetProficiency}`)
            await ctx.db.personCompetency.create({
              data: {
                personId,
                competencyId: competency.id,
                proficiency: targetProficiency,
                lastUpdatedAt: new Date(),
              },
            })
          } else if (existingPersonComp && targetProficiency) {
            // Update only if the new proficiency is higher
            const proficiencyLevels = { 'BEGINNER': 1, 'INTERMEDIATE': 2, 'ADVANCED': 3, 'EXPERT': 4 }
            const currentLevel = proficiencyLevels[existingPersonComp.proficiency as keyof typeof proficiencyLevels] || 0
            const newLevel = proficiencyLevels[targetProficiency as keyof typeof proficiencyLevels] || 0
            
            console.log(`Existing competency: ${competency.name}, current: ${existingPersonComp.proficiency} (${currentLevel}), target: ${targetProficiency} (${newLevel})`)
            
            if (newLevel > currentLevel) {
              console.log(`Updating competency: ${competency.name} from ${existingPersonComp.proficiency} to ${targetProficiency}`)
              await ctx.db.personCompetency.update({
                where: {
                  personId_competencyId: {
                    personId,
                    competencyId: competency.id,
                  },
                },
                data: {
                  proficiency: targetProficiency,
                  lastUpdatedAt: new Date(),
                },
              })
            } else {
              console.log(`Keeping existing higher proficiency: ${existingPersonComp.proficiency}`)
            }
          } else {
            console.log(`Skipping competency: ${competency.name} - no target proficiency determined`)
          }
        }
        console.log(`Finished adding competencies for auto-completed course`)
      }

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

  // Get unique competencies across all courses in a specialization
  getSpecializationCompetencies: protectedProcedure
    .input(z.object({ specializationId: z.string() }))
    .query(async ({ ctx, input }) => {
      // First verify the specialization exists and is of type SPECIALISATION
      const specialization = await ctx.db.course.findUnique({
        where: { id: input.specializationId },
        select: { type: true, name: true },
      })

      if (!specialization) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Specialization not found',
        })
      }

      if (specialization.type !== 'SPECIALISATION') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Course is not a specialization',
        })
      }

      // Get all courses in the specialization with their competencies
      const specializationCourses = await ctx.db.specialisationCourse.findMany({
        where: { specialisationId: input.specializationId },
        include: {
          course: {
            include: {
              competencies: {
                include: {
                  competency: {
                    select: {
                      id: true,
                      name: true,
                      type: true,
                      description: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { order: 'asc' },
      })

      // Aggregate unique competencies
      const competencyMap = new Map<string, any>()

      specializationCourses.forEach((specCourse) => {
        specCourse.course.competencies.forEach((courseComp: any) => {
          const competency = courseComp.competency
          const key = competency.id

          if (!competencyMap.has(key)) {
            competencyMap.set(key, {
              ...competency,
              proficiencies: [],
              courseNames: [],
              occurrenceCount: 0,
            })
          }

          const existing = competencyMap.get(key)
          if (existing) {
            existing.occurrenceCount += 1
            existing.courseNames.push(specCourse.course.name)
            
            if (courseComp.proficiency) {
              existing.proficiencies.push(courseComp.proficiency)
            }
          }
        })
      })

      // Convert map to array and determine highest proficiency for each competency
      const uniqueCompetencies = Array.from(competencyMap.values()).map((comp) => {
        let highestProficiency = null
        if (comp.proficiencies.length > 0) {
          const proficiencyLevels = { 'BEGINNER': 1, 'INTERMEDIATE': 2, 'ADVANCED': 3, 'EXPERT': 4 }
          const maxLevel = Math.max(...comp.proficiencies.map((p: string) => proficiencyLevels[p as keyof typeof proficiencyLevels] || 0))
          highestProficiency = Object.keys(proficiencyLevels).find(
            key => proficiencyLevels[key as keyof typeof proficiencyLevels] === maxLevel
          )
        }

        return {
          id: comp.id,
          name: comp.name,
          type: comp.type,
          description: comp.description,
          highestProficiency,
          occurrenceCount: comp.occurrenceCount,
          courseNames: Array.from(new Set(comp.courseNames)), // Remove duplicates
          proficiencies: comp.proficiencies,
        }
      })

      // Group by competency type
      const groupedCompetencies = uniqueCompetencies.reduce((acc, comp) => {
        if (!acc[comp.type]) {
          acc[comp.type] = []
        }
        acc[comp.type].push(comp)
        return acc
      }, {} as Record<string, typeof uniqueCompetencies>)

      // Sort each group by name
      Object.keys(groupedCompetencies).forEach(type => {
        groupedCompetencies[type].sort((a, b) => a.name.localeCompare(b.name))
      })

      return {
        specializationName: specialization.name,
        totalCourses: specializationCourses.length,
        totalUniqueCompetencies: uniqueCompetencies.length,
        competenciesByType: groupedCompetencies,
        allCompetencies: uniqueCompetencies.sort((a, b) => a.name.localeCompare(b.name)),
      }
    }),

  // Search courses by competencies
  searchByCompetencies: protectedProcedure
    .input(
      z.object({
        competencyIds: z.array(z.string()).min(1),
        minMatchPercentage: z.number().min(0).max(100).default(75),
      })
    )
    .query(async ({ ctx, input }) => {
      const { competencyIds, minMatchPercentage } = input

      // Get all courses with their competencies
      const coursesWithCompetencies = await ctx.db.course.findMany({
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
          _count: {
            select: {
              enrollments: true,
              competencies: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      })

      // Filter and calculate match percentages
      const results = coursesWithCompetencies
        .map((course) => {
          const courseCompetencyIds = course.competencies.map(cc => cc.competency.id)
          const matchingCompetencyIds = competencyIds.filter(id => courseCompetencyIds.includes(id))
          const matchPercentage = Math.round((matchingCompetencyIds.length / competencyIds.length) * 100)

          if (matchPercentage < minMatchPercentage) {
            return null
          }

          const matchingCompetencies = course.competencies
            .filter(cc => competencyIds.includes(cc.competency.id))
            .map(cc => ({
              ...cc.competency,
              proficiency: cc.proficiency,
            }))

          return {
            id: course.id,
            name: course.name,
            description: course.description,
            type: course.type,
            duration: course.duration,
            url: course.url,
            matchPercentage,
            matchingCompetencies,
            totalCompetencies: course.competencies.length,
            totalEnrollments: course._count.enrollments,
          }
        })
        .filter((course): course is NonNullable<typeof course> => course !== null)
        .sort((a, b) => b.matchPercentage - a.matchPercentage) // Sort by match percentage descending

      return results
    }),
})
