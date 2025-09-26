"use client"

import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { trpc } from "@/lib/trpc/client"
import Link from "next/link"
import { Role } from "@prisma/client"
import { Users, Plus } from "lucide-react"

export default function PeoplePage() {
  const { data: people, isLoading } = trpc.people.list.useQuery()
  const router = useRouter()

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">People</h1>
              <p className="text-muted-foreground">Manage team member profiles and competencies</p>
            </div>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              People
            </h1>
            <p className="text-muted-foreground">Manage team member profiles and competencies</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              All People
              <Badge variant="secondary">{people?.length || 0}</Badge>
            </CardTitle>
            <CardDescription>List of all users in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {!people || people.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No people found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Competencies</TableHead>
                    <TableHead>Assignments</TableHead>
                    <TableHead>Reviews</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {people.map((person) => (
                    <TableRow key={person.id}>
                      <TableCell>
                        <Link href={`/people/${person.id}`} className="text-primary hover:underline font-medium">
                          {person.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{person.email}</TableCell>
                      <TableCell>
                        <Badge variant={person.role === Role.PROJECT_MANAGER ? "default" : "secondary"}>
                          {person.role === Role.PROJECT_MANAGER ? "Project Manager" : "User"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{person._count?.competencies || 0}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{person._count?.assignments || 0}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{person._count?.reviews || 0}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
