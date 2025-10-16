'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Users, 
  BookOpen, 
  Eye, 
  Edit, 
  Trash2,
  Play,
  CheckCircle
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CreateCourseForm } from '@/components/courses/CreateCourseForm'
import { AppLayout } from '@/components/layout/app-layout'


export default function CoursesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const {
    data: courses,
    isLoading,
    refetch,
  } = trpc.courses.list.useQuery({
    search: searchTerm || undefined,
  })

  const { data: stats } = trpc.courses.getStats.useQuery()

  const deleteMutation = trpc.courses.delete.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const enrollMutation = trpc.courses.enroll.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const filteredCourses = courses || []

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the course "${name}"?`)) {
      try {
        await deleteMutation.mutateAsync({ id })
      } catch (error: any) {
        alert(error.message || 'Failed to delete course')
      }
    }
  }

  const handleEnroll = async (courseId: string) => {
    try {
      await enrollMutation.mutateAsync({ courseId })
      alert('Successfully enrolled in course!')
    } catch (error: any) {
      alert(error.message || 'Failed to enroll in course')
    }
  }

  const canManage = session?.user?.role === 'PROJECT_MANAGER'

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

  return (
    <AppLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Courses</h1>
          <p className="text-muted-foreground">
            Manage learning courses and track progress
          </p>
        </div>
        {canManage && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Course
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Course</DialogTitle>
              </DialogHeader>
              <CreateCourseForm
                onSuccess={() => {
                  setCreateDialogOpen(false)
                  refetch()
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Courses</p>
                  <p className="text-2xl font-bold">{stats.totalCourses}</p>
                </div>
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Enrollments</p>
                  <p className="text-2xl font-bold">{stats.totalEnrollments}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completions</p>
                  <p className="text-2xl font-bold">{stats.completedEnrollments}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold">{stats.completionRate.toFixed(1)}%</p>
                </div>
                <div className="h-8 w-8 text-muted-foreground">
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${stats.completionRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search courses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      {/* Courses Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Courses ({filteredCourses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Enrollments</TableHead>
                <TableHead>Competencies</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourses.map((course) => {
                const isEnrolled = course.enrollments.some(e => e.person.id === session?.user?.id)
                
                return (
                  <TableRow key={course.id}>
                    <TableCell>
                      <div>
                        <button
                          onClick={() => router.push(`/courses/${course.id}`)}
                          className="font-medium hover:underline text-left"
                        >
                          {course.name}
                        </button>
                        {course.description && (
                          <p className="text-sm text-muted-foreground mt-1 max-w-xs truncate">
                            {course.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                        {course._count.enrollments}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <BookOpen className="h-4 w-4 mr-1 text-muted-foreground" />
                        {course._count.competencies}
                      </div>
                    </TableCell>
                    <TableCell>
                      {course.duration ? `${course.duration}h` : '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/courses/${course.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {!isEnrolled && (
                            <DropdownMenuItem
                              onClick={() => handleEnroll(course.id)}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Enroll
                            </DropdownMenuItem>
                          )}
                          {canManage && (
                            <>
                              <DropdownMenuItem
                                onClick={() => router.push(`/courses/${course.id}/edit`)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(course.id, course.name)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {filteredCourses.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? 'No courses match your search'
                : 'No courses found'}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </AppLayout>
  )
}