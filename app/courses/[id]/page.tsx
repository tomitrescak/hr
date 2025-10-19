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
  Clock,
  CheckCircle,
  User,
  GraduationCap,
  Target,
  UserPlus,
  ExternalLink,
  TrendingUp
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { AppLayout } from '@/components/layout/app-layout'
import { CourseCompetencyManager } from '@/components/courses/CourseCompetencyManager'
import { SpecializationCompetencySummary } from '@/components/courses/SpecializationCompetencySummary'
import { marked } from 'marked'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'


const competencyTypeColors = {
  KNOWLEDGE: 'bg-blue-100 text-blue-800',
  SKILL: 'bg-green-100 text-green-800',
  TECH_TOOL: 'bg-purple-100 text-purple-800',
  ABILITY: 'bg-orange-100 text-orange-800',
  VALUE: 'bg-pink-100 text-pink-800',
  BEHAVIOUR: 'bg-indigo-100 text-indigo-800',
  ENABLER: 'bg-gray-100 text-gray-800',
}

interface CourseDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { id } = use(params)
  const { data: session } = useSession()
  const router = useRouter()

  const {
    data: course,
    isLoading,
    refetch,
  } = trpc.courses.getById.useQuery({ id })

  // Fetch specialization competencies if this is a specialization
  const {
    data: specializationCompetencies,
    isLoading: isLoadingSpecializationCompetencies,
  } = trpc.courses.getSpecializationCompetencies.useQuery(
    { specializationId: id },
    { 
      enabled: course?.type === 'SPECIALISATION' && !!course,
      refetchOnWindowFocus: false,
    }
  )

  const deleteMutation = trpc.courses.delete.useMutation({
    onSuccess: () => {
      router.push('/courses')
    },
  })

  const updateEnrollmentStatus = trpc.courses.updateEnrollmentStatus.useMutation({
    onSuccess: () => {
      refetch()
    }
  });

  const handleDelete = async () => {
    if (!course) return

    if (confirm(`Are you sure you want to delete the course "${course.name}"?`)) {
      try {
        await deleteMutation.mutateAsync({ id })
      } catch (error: any) {
        alert(error.message || 'Failed to delete course')
      }
    }
  }

  const handleEnroll = async (status: 'WISHLIST' | 'IN_PROGRESS' | 'COMPLETED') => {
    try {
      await updateEnrollmentStatus.mutateAsync({
        courseId: id,
        personId: session?.user?.id as string,
        status: status
      })
      alert('Successfully enrolled in course!')
    } catch (error: any) {
      alert(error.message || 'Failed to enroll in course')
    }
  }

  const canManage = session?.user?.role === 'PROJECT_MANAGER'
  const enrollmentStatus =  course?.enrollments.find(e => e.person.id === session?.user?.id)?.status || 'NOT_ENROLLED';


  const handleCompetencyClick = (competencyId: string) => {
    router.push(`/competencies/${competencyId}`)
  }

  // Markdown to HTML conversion using marked package
  const markdownToHtml = (markdown: string): string => {
    if (!markdown) return ''

    try {
      return marked(markdown) as string
    } catch (error) {
      console.error('Error converting markdown to HTML:', error)
      return `<p>${markdown}</p>`
    }
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </AppLayout>
    )
  }

  if (!course) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Course not found</h2>
          <p className="text-gray-600 mt-2">The course you&apos;re looking for doesn&apos;t exist.</p>
          <Button onClick={() => router.push('/courses')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>
        </div>
      </AppLayout>
    )
  }

  const completionRate = course.enrollments.length > 0
    ? (course.enrollments.filter(e => e.completed).length / course.enrollments.length) * 100
    : 0

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{course.name}</h1>

              </div>
              <div className="flex items-center gap-4  mt-2">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/courses')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                {course.url ? (
                  <a
                    href={course.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View {course.type === 'SPECIALISATION' ? 'Specialisation' : 'Course'}
                  </a>
                ) : <Badge variant="outline" className={course.type === 'SPECIALISATION' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                  {course.type === 'SPECIALISATION' ? 'Specialisation' : 'Course'}
                </Badge>}
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            {session?.user && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Select
                  value={enrollmentStatus}
                  onValueChange={(value) => {
                    if (value == '') {
                      return
                    }
                    if (value !== 'NOT_ENROLLED') {
                      handleEnroll(value as 'WISHLIST' | 'IN_PROGRESS' | 'COMPLETED')
                      
                      // setEnrollmentStatus(value as 'NOT_ENROLLED' | 'WISHLIST' | 'IN_PROGRESS' | 'COMPLETED')
                    }
                  }}
                  disabled={updateEnrollmentStatus.isPending}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOT_ENROLLED">Not Enrolled</SelectItem>
                    <SelectItem value="WISHLIST">Wishlist</SelectItem>
                    <SelectItem value="IN_PROGRESS">Enrolled</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {canManage && (
              <>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/courses/${id}/edit`)}
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
              </>
            )}
          </div>
        </div>

        {/* Course Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Enrollments</p>
                  <p className="text-2xl font-bold">{course._count.enrollments}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {course.type === 'SPECIALISATION' ? 'Total Competencies' : 'Competencies'}
                  </p>
                  <p className="text-2xl font-bold">
                    {course.type === 'SPECIALISATION'
                      ? (isLoadingSpecializationCompetencies
                          ? '...' 
                          : specializationCompetencies?.totalUniqueCompetencies ?? course._count.competencies
                        )
                      : course._count.competencies
                    }
                  </p>
                  {course.type === 'SPECIALISATION' && specializationCompetencies && (
                    <p className="text-xs text-muted-foreground">
                      across {specializationCompetencies.totalCourses} courses
                    </p>
                  )}
                </div>
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="text-2xl font-bold">{course.duration || '-'}</p>
                  {course.duration && <p className="text-xs text-muted-foreground">hours</p>}
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completion</p>
                  <p className="text-2xl font-bold">{completionRate.toFixed(0)}%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Course Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              Course Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {course.description && (
              <div>

                <div
                  className="mt-1 cv-content"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(course.description) }}
                />
              </div>
            )}
            {course.content && (
              <div>
                <h1 className="font-bold text-2xl text-muted-foreground">Course Content</h1>
                <hr className="my-2 border-gray-300" />
                <div
                  className="mt-1 cv-content"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(course.content) }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs for Enrollments and Competencies */}
        <Tabs defaultValue="enrollments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="enrollments" className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Enrollments ({course.enrollments.length})
            </TabsTrigger>
            {course.type === 'SPECIALISATION' && (
              <TabsTrigger value="courses" className="flex items-center">
                <BookOpen className="h-4 w-4 mr-2" />
                Courses ({course.specialisationCourses?.length || 0})
              </TabsTrigger>
            )}
            {course.type === 'SPECIALISATION' && specializationCompetencies && (
              <TabsTrigger value="specialization-competencies" className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                All Competencies ({specializationCompetencies.totalUniqueCompetencies})
              </TabsTrigger>
            )}
            <TabsTrigger value="competencies" className="flex items-center">
              <Target className="h-4 w-4 mr-2" />
              {course.type === 'SPECIALISATION' ? 'Direct Competencies' : 'Competencies'} ({course.competencies.length})
            </TabsTrigger>
          </TabsList>

          {/* Enrollments Tab */}
          <TabsContent value="enrollments">
            <Card>
              <CardHeader>
                <CardTitle>Course Enrollments</CardTitle>
              </CardHeader>
              <CardContent>
                {course.enrollments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Person</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Enrolled</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {course.enrollments.map((enrollment) => (
                        <TableRow key={enrollment.id}>
                          <TableCell>
                            <button
                              onClick={() => router.push(`/people/${enrollment.person.id}`)}
                              className="font-medium hover:underline"
                            >
                              {enrollment.person.name}
                            </button>
                          </TableCell>
                          <TableCell>{enrollment.person.email}</TableCell>
                          <TableCell>
                            {new Date(enrollment.enrolledAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Progress value={enrollment.progress || 0} className="w-16" />
                              <span className="text-sm text-muted-foreground">
                                {enrollment.progress || 0}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {enrollment.completed ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Completed
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                <Clock className="h-3 w-3 mr-1" />
                                In Progress
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/people/${enrollment.person.id}`)}
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
                    No enrollments yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Specialisation Courses Tab */}
          {course.type === 'SPECIALISATION' && (
            <TabsContent value="courses">
              <Card>
                <CardHeader>
                  <CardTitle>Included Courses</CardTitle>
                  <CardDescription>
                    Courses that are part of this specialisation learning path
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {course.specialisationCourses && course.specialisationCourses.length > 0 ? (
                    <div className="grid gap-4">
                      {course.specialisationCourses.map((specialisationCourse, index) => (
                        <Card key={specialisationCourse.id} className="border-l-4 border-l-blue-500">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {index + 1}
                                  </Badge>
                                  <button
                                    onClick={() => router.push(`/courses/${specialisationCourse.course.id}`)}
                                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                  >
                                    {specialisationCourse.course.name}
                                  </button>
                                </div>
                                {specialisationCourse.course.description && (
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {specialisationCourse.course.description.substring(0, 150)}...
                                  </p>
                                )}
                                {specialisationCourse.course.duration && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {specialisationCourse.course.duration} hours
                                  </div>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/courses/${specialisationCourse.course.id}`)}
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No courses added to this specialisation yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Specialization Competencies Summary Tab */}
          {course.type === 'SPECIALISATION' && specializationCompetencies && (
            <TabsContent value="specialization-competencies">
              <SpecializationCompetencySummary
                specializationData={specializationCompetencies}
                onCompetencyClick={handleCompetencyClick}
              />
            </TabsContent>
          )}

          {/* Competencies Tab */}
          <TabsContent value="competencies">
            <CourseCompetencyManager
              courseId={id}
              competencies={course.competencies.map(c => ({ ...c, proficiency: c.proficiency || undefined })) as any}
              canManage={canManage}
              readOnly={true}
              onCompetencyClick={handleCompetencyClick}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}