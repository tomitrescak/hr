"use client"

import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useSession } from "next-auth/react"
import { trpc } from "@/lib/trpc/client"

export default function Home() {
  const { data: session } = useSession()
  const { data: stats, isLoading } = trpc.dashboard.getStats.useQuery()

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-lg text-muted-foreground">
            Welcome back, {session?.user.name}!
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                People
                {isLoading ? (
                  <Skeleton className="h-5 w-8" />
                ) : (
                  <Badge variant="secondary">{stats?.peopleCount || 0}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Manage people and competencies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View and manage team member profiles, competencies, and development plans.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Projects
                {isLoading ? (
                  <Skeleton className="h-5 w-8" />
                ) : (
                  <Badge variant="secondary">{stats?.projectsCount || 0}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Track projects and tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage projects, tasks, and track progress using Kanban boards.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Active Allocations
                {isLoading ? (
                  <Skeleton className="h-5 w-8" />
                ) : (
                  <Badge variant="secondary">{stats?.activeAllocations || 0}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Current project team allocations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View active team member allocations across projects with capacity tracking.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
