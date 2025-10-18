import { createTRPCReact } from '@trpc/react-query'
import { AppRouter } from './root'

export const trpc = createTRPCReact<AppRouter>({})

