import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function Home() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-lg text-muted-foreground">
            Welcome back, {session.user.name}!
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                People
                <Badge variant="secondary">0</Badge>
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
                <Badge variant="secondary">0</Badge>
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
                Reviews
                <Badge variant="secondary">0</Badge>
              </CardTitle>
              <CardDescription>
                Weekly assignments and reviews
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Submit weekly reviews and track competency development progress.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
