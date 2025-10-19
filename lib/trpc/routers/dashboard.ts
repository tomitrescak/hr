import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

export const dashboardRouter = router({
  // Get dashboard statistics
  getStats: protectedProcedure.query(async ({ ctx }) => {
    // Get people count
    const peopleCount = await ctx.db.user.count()

    // Get projects count
    const projectsCount = await ctx.db.project.count()

    // Get active allocations count
    const activeAllocations = await ctx.db.projectAllocation.count({
      where: {
        personId: { not: null },
        capacityAllocation: { gt: 0 },
      },
    })

    const coursesCount = await ctx.db.course.count()

    return {
      peopleCount,
      projectsCount,
      activeAllocations,
      coursesCount,
    }
  }),
})