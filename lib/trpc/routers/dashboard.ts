import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

export const dashboardRouter = router({
  // Get dashboard statistics
  getStats: protectedProcedure.query(async ({ ctx }) => {
    // Get people count
    const peopleCount = await ctx.db.person.count()

    // Get projects count
    const projectsCount = await ctx.db.project.count()

    // Get reviews count (total submitted reviews)
    const reviewsCount = await ctx.db.review.count()

    // Get additional useful stats
    const activeAssignments = await ctx.db.assignment.count({
      where: {
        startDate: { lte: new Date() },
        plannedEndDate: { gte: new Date() },
      },
    })

    const pendingReviews = await ctx.db.review.count({
      where: {
        approvedAt: null,
      },
    })

    const coursesCount = await ctx.db.course.count({
      where: {
        status: 'PUBLISHED',
      },
    })

    return {
      peopleCount,
      projectsCount,
      reviewsCount,
      activeAssignments,
      pendingReviews,
      coursesCount,
    }
  }),
})