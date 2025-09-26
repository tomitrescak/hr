import { router } from './trpc'
import { authRouter } from './routers/auth'
import { peopleRouter } from './routers/people'
import { competenciesRouter } from './routers/competencies'
import { coursesRouter } from './routers/courses'
import { projectsRouter } from './routers/projects'
import { assignmentsRouter } from './routers/assignments'
import { reviewsRouter } from './routers/reviews'

export const appRouter = router({
  auth: authRouter,
  people: peopleRouter,
  competencies: competenciesRouter,
  courses: coursesRouter,
  projects: projectsRouter,
  assignments: assignmentsRouter,
  reviews: reviewsRouter,
})

export type AppRouter = typeof appRouter