import { z } from 'zod'
import { router, protectedProcedure, pmProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

export const projectsRouter = router({
  // Get all projects (anyone can view)
  list: protectedProcedure.query(async ({ ctx }) => {
    const projects = await ctx.db.project.findMany({
      include: {
        okrs: {
          include: {
            keyResults: {
              orderBy: { createdAt: 'asc' },
            },
            _count: {
              select: {
                keyResults: true,
                tasks: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        allocations: {
          include: {
            person: {
              select: { id: true, name: true },
            },
          },
        },
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            allocations: true,
            okrs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return projects
  }),

  // Get project by ID with all details
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findUnique({
        where: { id: input.id },
        include: {
          okrs: {
            include: {
              keyResults: {
                orderBy: { createdAt: 'asc' },
              },
              tasks: {
                include: {
                  assignee: {
                    select: { id: true, name: true },
                  },
                },
                orderBy: { createdAt: 'asc' },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
          allocations: {
            include: {
              person: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
          tasks: {
            include: {
              assignee: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      })

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        })
      }

      return project
    }),

  // Create project (PM only)
  create: pmProcedure
    .input(
      z.object({
        name: z.string().min(2),
        description: z.string().min(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.create({
        data: {
          name: input.name,
          description: input.description,
        },
        include: {
          okrs: true,
          allocations: true,
          tasks: true,
          _count: {
            select: {
              tasks: true,
              allocations: true,
            },
          },
        },
      })

      // Create change log
      await ctx.db.changeLog.create({
        data: {
          entity: 'PROJECT',
          entityId: project.id,
          field: 'created',
          toValue: { name: input.name, description: input.description },
          state: 'CREATED',
          changedById: ctx.session.user.id,
        },
      })

      return project
    }),

  // Update project (PM only)
  update: pmProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).optional(),
        description: z.string().min(10).optional(),
        status: z.enum(['ACTIVE', 'COMPLETED', 'ON_HOLD', 'PLANNING']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input

      const current = await ctx.db.project.findUnique({ where: { id } })
      if (!current) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        })
      }

      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      )

      if (Object.keys(filteredUpdates).length === 0) {
        return current
      }

      const project = await ctx.db.project.update({
        where: { id },
        data: filteredUpdates,
        include: {
          okrs: true,
          allocations: {
            include: {
              person: {
                select: { id: true, name: true },
              },
            },
          },
          tasks: {
            include: {
              assignee: {
                select: { id: true, name: true },
              },
            },
          },
        },
      })

      // Create change log
      await ctx.db.changeLog.create({
        data: {
          entity: 'PROJECT',
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

      return project
    }),

  // Delete project (PM only)
  delete: pmProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findUnique({
        where: { id: input.id },
      })

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        })
      }

      await ctx.db.project.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  // Manage OKRs
  createOkr: pmProcedure
    .input(
      z.object({
        projectId: z.string(),
        title: z.string().min(2),
        description: z.string().min(10),
        metric: z.string().optional(),
        target: z.string().optional(),
        dueDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const okr = await ctx.db.oKR.create({
        data: input,
      })

      await ctx.db.changeLog.create({
        data: {
          entity: 'OKR',
          entityId: okr.id,
          field: 'created',
          toValue: input,
          state: 'CREATED',
          changedById: ctx.session.user.id,
        },
      })

      return okr
    }),

  updateOkr: pmProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(2).optional(),
        description: z.string().min(10).optional(),
        metric: z.string().optional(),
        target: z.string().optional(),
        dueDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input

      const current = await ctx.db.oKR.findUnique({ where: { id } })
      if (!current) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'OKR not found',
        })
      }

      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      )

      const okr = await ctx.db.oKR.update({
        where: { id },
        data: filteredUpdates,
      })

      await ctx.db.changeLog.create({
        data: {
          entity: 'OKR',
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

      return okr
    }),

  deleteOkr: pmProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.oKR.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  // Manage Key Results
  createKeyResult: pmProcedure
    .input(
      z.object({
        okrId: z.string(),
        title: z.string().min(2),
        description: z.string().optional(),
        target: z.string().optional(),
        metric: z.string().optional(),
        dueDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const keyResult = await ctx.db.keyResult.create({
        data: input,
      })

      await ctx.db.changeLog.create({
        data: {
          entity: 'KEY_RESULT',
          entityId: keyResult.id,
          field: 'created',
          toValue: input,
          state: 'CREATED',
          changedById: ctx.session.user.id,
        },
      })

      return keyResult
    }),

  updateKeyResult: pmProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(2).optional(),
        description: z.string().optional(),
        progress: z.number().min(0).max(100).optional(),
        target: z.string().optional(),
        metric: z.string().optional(),
        dueDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input

      const current = await ctx.db.keyResult.findUnique({ where: { id } })
      if (!current) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Key Result not found',
        })
      }

      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      )

      const keyResult = await ctx.db.keyResult.update({
        where: { id },
        data: filteredUpdates,
      })

      await ctx.db.changeLog.create({
        data: {
          entity: 'KEY_RESULT',
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

      return keyResult
    }),

  deleteKeyResult: pmProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.keyResult.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  // Manage tasks
  createTask: pmProcedure
    .input(
      z.object({
        projectId: z.string(),
        okrId: z.string().optional(),
        title: z.string().min(2),
        description: z.string().optional(),
        assigneeId: z.string().optional(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('MEDIUM'),
        dueDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.db.task.create({
        data: input,
        include: {
          assignee: {
            select: { id: true, name: true },
          },
          okr: {
            select: { id: true, title: true },
          },
          project: {
            select: { id: true, name: true },
          },
        },
      })

      await ctx.db.changeLog.create({
        data: {
          entity: 'TASK',
          entityId: task.id,
          field: 'created',
          toValue: input,
          state: 'CREATED',
          changedById: ctx.session.user.id,
        },
      })

      return task
    }),

  updateTask: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(2).optional(),
        description: z.string().optional(),
        assigneeId: z.string().optional(),
        okrId: z.string().optional(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
        state: z.enum(['BACKLOG', 'READY', 'IN_PROGRESS', 'BLOCKED', 'REVIEW', 'DONE']).optional(),
        dueDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input

      const current = await ctx.db.task.findUnique({ 
        where: { id },
        include: {
          assignee: true,
        },
      })
      
      if (!current) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        })
      }

      // Check permissions - PMs can edit anything, users can only edit tasks assigned to them
      if (ctx.session.user.role !== 'PROJECT_MANAGER') {
        const userPerson = await ctx.db.person.findUnique({
          where: { userId: ctx.session.user.id },
        })

        if (!userPerson || current.assigneeId !== userPerson.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only update tasks assigned to you',
          })
        }
      }

      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      )

      const task = await ctx.db.task.update({
        where: { id },
        data: filteredUpdates,
        include: {
          assignee: {
            select: { id: true, name: true },
          },
          okr: {
            select: { id: true, title: true },
          },
          project: {
            select: { id: true, name: true },
          },
        },
      })

      await ctx.db.changeLog.create({
        data: {
          entity: 'TASK',
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

      return task
    }),

  deleteTask: pmProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.task.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  // Manage project allocations
  createAllocation: pmProcedure
    .input(
      z.object({
        projectId: z.string(),
        personId: z.string().optional(),
        title: z.string().min(2),
        description: z.string().min(10),
        capacityAllocation: z.number().int().min(0).max(100).default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate capacity allocation if person is assigned
      if (input.personId && input.capacityAllocation > 0) {
        const person = await ctx.db.person.findUnique({
          where: { id: input.personId },
          include: {
            projectAllocations: {
              where: {
                personId: input.personId,
              },
            },
          },
        })

        if (!person) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Person not found',
          })
        }

        // Calculate current capacity utilization
        const currentAllocated = person.projectAllocations.reduce(
          (sum, allocation) => sum + allocation.capacityAllocation,
          0
        )
        
        const newTotalCapacity = currentAllocated + input.capacityAllocation
        if (newTotalCapacity > person.capacity) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Assignment would exceed person's capacity. Current: ${currentAllocated}%, Requested: ${input.capacityAllocation}%, Available: ${person.capacity}%`,
          })
        }
      }
      
      const allocation = await ctx.db.projectAllocation.create({
        data: input,
        include: {
          person: {
            select: { id: true, name: true },
          },
        },
      })

      await ctx.db.changeLog.create({
        data: {
          entity: 'PROJECT_ALLOCATION',
          entityId: allocation.id,
          field: 'created',
          toValue: input,
          state: 'CREATED',
          changedById: ctx.session.user.id,
        },
      })

      return allocation
    }),

  updateAllocation: pmProcedure
    .input(
      z.object({
        id: z.string(),
        personId: z.string().optional(),
        title: z.string().min(2).optional(),
        description: z.string().min(10).optional(),
        capacityAllocation: z.number().int().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input

      const current = await ctx.db.projectAllocation.findUnique({ where: { id } })
      if (!current) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project allocation not found',
        })
      }

      // Validate capacity if updating allocation
      if (updates.capacityAllocation !== undefined && updates.personId) {
        const person = await ctx.db.person.findUnique({
          where: { id: updates.personId },
          include: {
            projectAllocations: {
              where: {
                id: { not: id }, // Exclude current allocation
              },
            },
          },
        })

        if (person) {
          const otherAllocations = person.projectAllocations.reduce(
            (sum, allocation) => sum + allocation.capacityAllocation,
            0
          )
          
          if (otherAllocations + updates.capacityAllocation > person.capacity) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Update would exceed person's capacity`,
            })
          }
        }
      }

      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      )

      const allocation = await ctx.db.projectAllocation.update({
        where: { id },
        data: filteredUpdates,
        include: {
          person: {
            select: { id: true, name: true },
          },
        },
      })

      await ctx.db.changeLog.create({
        data: {
          entity: 'PROJECT_ALLOCATION',
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

      return allocation
    }),

  deleteAllocation: pmProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.projectAllocation.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  // Get project statistics
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const totalProjects = await ctx.db.project.count()
    
    const taskStats = await ctx.db.task.groupBy({
      by: ['state'],
      _count: {
        _all: true,
      },
    })

    const tasksByPriority = await ctx.db.task.groupBy({
      by: ['priority'],
      _count: {
        _all: true,
      },
    })

    const overdueOkrs = await ctx.db.oKR.count({
      where: {
        dueDate: {
          lt: new Date(),
        },
      },
    })

    const totalOkrs = await ctx.db.oKR.count()
    const totalTasks = await ctx.db.task.count()
    const completedTasks = taskStats.find(s => s.state === 'DONE')?._count._all || 0

    return {
      totalProjects,
      totalTasks,
      completedTasks,
      totalOkrs,
      overdueOkrs,
      taskCompletion: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      tasksByState: taskStats.reduce((acc, stat) => {
        acc[stat.state] = stat._count._all
        return acc
      }, {} as Record<string, number>),
      tasksByPriority: tasksByPriority.reduce((acc, stat) => {
        acc[stat.priority!] = stat._count._all
        return acc
      }, {} as Record<string, number>),
    }
  }),

  // Get all people for assignments
  getPeople: protectedProcedure.query(async ({ ctx }) => {
    const people = await ctx.db.person.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    })

    return people
  }),

  // Bulk update task states (for drag and drop)
  updateTaskState: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        newState: z.enum(['BACKLOG', 'READY', 'IN_PROGRESS', 'BLOCKED', 'REVIEW', 'DONE']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.db.task.findUnique({ 
        where: { id: input.taskId },
        include: { assignee: true },
      })
      
      if (!current) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        })
      }

      // Check permissions - PMs can move anything, users can only move their tasks
      if (ctx.session.user.role !== 'PROJECT_MANAGER') {
        const userPerson = await ctx.db.person.findUnique({
          where: { userId: ctx.session.user.id },
        })

        if (!userPerson || current.assigneeId !== userPerson.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only update tasks assigned to you',
          })
        }
      }

      const task = await ctx.db.task.update({
        where: { id: input.taskId },
        data: { state: input.newState },
        include: {
          assignee: {
            select: { id: true, name: true },
          },
          okr: {
            select: { id: true, title: true },
          },
          project: {
            select: { id: true, name: true },
          },
        },
      })

      // Create change log
      await ctx.db.changeLog.create({
        data: {
          entity: 'TASK',
          entityId: input.taskId,
          field: 'state',
          fromValue: current.state,
          toValue: input.newState,
          state: 'MODIFIED',
          changedById: ctx.session.user.id,
        },
      })

      return task
    }),
})
