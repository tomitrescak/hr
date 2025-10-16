import { router } from './trpc'
import { authRouter } from './routers/auth'
import { peopleRouter } from './routers/people'
import { competenciesRouter } from './routers/competencies'
import { coursesRouter } from './routers/courses'
import { projectsRouter } from './routers/projects'
import { personReviewsRouter } from './routers/person-reviews'
import { dashboardRouter } from './routers/dashboard'
import { extractionRouter } from './routers/extraction'

export const appRouter = router({
  auth: authRouter,
  people: peopleRouter,
  competencies: competenciesRouter,
  courses: coursesRouter,
  projects: projectsRouter,
  personReviews: personReviewsRouter,
  dashboard: dashboardRouter,
  extraction: extractionRouter,
})

export type AppRouter = typeof appRouter