'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { useSession } from 'next-auth/react'
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Users, 
  BookOpen, 
  Calendar,
  User,
  GraduationCap
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const competencyTypeColors = {
  KNOWLEDGE: 'bg-blue-100 text-blue-800',
  SKILL: 'bg-green-100 text-green-800',
  TECH_TOOL: 'bg-purple-100 text-purple-800',
  ABILITY: 'bg-orange-100 text-orange-800',
  VALUE: 'bg-pink-100 text-pink-800',
  BEHAVIOUR: 'bg-indigo-100 text-indigo-800',
  ENABLER: 'bg-gray-100 text-gray-800',
}

const proficiencyColors = {
  BEGINNER: 'bg-red-100 text-red-800',
  INTERMEDIATE: 'bg-yellow-100 text-yellow-800',
  ADVANCED: 'bg-blue-100 text-blue-800',
  EXPERT: 'bg-green-100 text-green-800',
}

interface CompetencyDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default function CompetencyDetailPage({ params }: CompetencyDetailPageProps) {
  const { id } = use(params)
  const { data: session } = useSession()
  const router = useRouter()

  const {
    data: competency,
    isLoading,
    refetch,
  } = trpc.competencies.getById.useQuery({ id })

  const deleteMutation = trpc.competencies.delete.useMutation({
    onSuccess: () => {
      router.push('/competencies')
    },
  })

  const handleDelete = async () => {
    if (!competency) return

    if (confirm(`Are you sure you want to delete the competency "${competency.name}"?`)) {
      try {
        await deleteMutation.mutateAsync({ id })
      } catch (error: any) {
        alert(error.message || 'Failed to delete competency')
      }
    }
  }

  const canManage = session?.user?.role === 'PROJECT_MANAGER'

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!competency) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Competency not found</h2>
          <p className="text-gray-600 mt-2">The competency you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/competencies')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Competencies
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/competencies')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{competency.name}</h1>
            <div className="flex items-center space-x-2 mt-2">
              <Badge
                variant="secondary"
                className={competencyTypeColors[competency.type]}
              >
                {competency.type.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>
        {canManage && (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/competencies/${id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Competency Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            Competency Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Type</h3>
              <p className="mt-1">
                <Badge
                  variant="secondary"
                  className={competencyTypeColors[competency.type]}
                >
                  {competency.type.replace('_', ' ')}
                </Badge>
              </p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Name</h3>
              <p className="mt-1 font-medium">{competency.name}</p>
            </div>
            {competency.description && (
              <div className="md:col-span-2">
                <h3 className="font-medium text-sm text-muted-foreground">Description</h3>
                <p className="mt-1 text-gray-700">{competency.description}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for People and Courses */}
      <Tabs defaultValue="people" className="space-y-4">
        <TabsList>
          <TabsTrigger value="people" className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            People ({competency.personCompetencies.length})
          </TabsTrigger>
          <TabsTrigger value="courses" className="flex items-center">
            <GraduationCap className="h-4 w-4 mr-2" />
            Courses ({competency.courseCompetencies.length})
          </TabsTrigger>
        </TabsList>

        {/* People Tab */}
        <TabsContent value="people">
          <Card>
            <CardHeader>
              <CardTitle>People with this Competency</CardTitle>
            </CardHeader>
            <CardContent>
              {competency.personCompetencies.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Person</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Proficiency</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {competency.personCompetencies.map((personCompetency) => (
                      <TableRow key={personCompetency.id}>
                        <TableCell>
                          <button
                            onClick={() => router.push(`/people/${personCompetency.person.id}`)}
                            className="font-medium hover:underline"
                          >
                            {personCompetency.person.name}
                          </button>
                        </TableCell>
                        <TableCell>{personCompetency.person.email}</TableCell>
                        <TableCell>
                          {personCompetency.proficiency ? (
                            <Badge
                              variant="secondary"
                              className={proficiencyColors[personCompetency.proficiency]}
                            >
                              {personCompetency.proficiency}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/people/${personCompetency.person.id}`)}
                          >
                            <User className="h-4 w-4 mr-2" />
                            View Profile
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No people have been assigned this competency yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses">
          <Card>
            <CardHeader>
              <CardTitle>Courses teaching this Competency</CardTitle>
            </CardHeader>
            <CardContent>
              {competency.courseCompetencies.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {competency.courseCompetencies.map((courseCompetency) => (
                      <TableRow key={courseCompetency.id}>
                        <TableCell>
                          <button
                            onClick={() => router.push(`/courses/${courseCompetency.course.id}`)}
                            className="font-medium hover:underline"
                          >
                            {courseCompetency.course.name}
                          </button>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {courseCompetency.course.description || '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/courses/${courseCompetency.course.id}`)}
                          >
                            <BookOpen className="h-4 w-4 mr-2" />
                            View Course
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No courses are currently teaching this competency.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}