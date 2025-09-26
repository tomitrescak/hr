'use client'

import { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  Calendar,
  Plus,
  Users,
  FolderKanban,
  BookOpen,
  AlertCircle,
  User,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'

// Helper function to get Monday of current week
function getCurrentWeekMonday(): Date {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(today.setDate(diff))
}

// Helper function to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// Helper function to add days to date
function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// Helper function to get week range display
function getWeekRange(mondayDate: Date): string {
  const friday = addDays(mondayDate, 4)
  return `${mondayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${friday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

export default function PlanningPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { addToast } = useToast()
  
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeekMonday())
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    personId: '',
    type: 'PROJECT' as 'PROJECT' | 'COURSE',
    projectId: '',
    courseId: '',
    startDate: formatDate(currentWeek),
    plannedEndDate: formatDate(addDays(currentWeek, 4)), // Default to Friday
  })

  // Redirect if not authenticated or not PM
  if (status === 'loading') {
    return <div className="p-6">Loading...</div>
  }

  if (!session || session.user.role !== 'PROJECT_MANAGER') {
    router.push('/')
    return <div className="p-6">Redirecting...</div>
  }

  // Calculate week range for queries (show 2 weeks: current and next)
  const weekStart = currentWeek
  const weekEnd = addDays(currentWeek, 13) // 2 weeks

  const { data: assignments, isLoading, refetch } = trpc.assignments.listForPlanning.useQuery({
    startDate: weekStart,
    endDate: weekEnd,
  })

  const { data: workload } = trpc.assignments.getWorkload.useQuery({
    startDate: weekStart,
    endDate: weekEnd,
  })

  const { data: people } = trpc.people.list.useQuery()
  const { data: projects } = trpc.projects.list.useQuery()
  const { data: courses } = trpc.courses.list.useQuery()

  const createAssignmentMutation = trpc.assignments.create.useMutation({
    onSuccess: () => {
      addToast('success', 'Assignment created successfully')
      refetch()
      setIsCreateDialogOpen(false)
      setCreateForm({
        personId: '',
        type: 'PROJECT',
        projectId: '',
        courseId: '',
        startDate: formatDate(currentWeek),
        plannedEndDate: formatDate(addDays(currentWeek, 4)),
      })
    },
    onError: (error) => {
      addToast('error', error.message || 'Failed to create assignment')
    },
  })

  const deleteAssignmentMutation = trpc.assignments.delete.useMutation({
    onSuccess: () => {
      addToast('success', 'Assignment deleted successfully')
      refetch()
    },
    onError: (error) => {
      addToast('error', error.message || 'Failed to delete assignment')
    },
  })

  // Navigate weeks
  const goToPreviousWeek = () => {
    setCurrentWeek(prev => addDays(prev, -7))
  }

  const goToNextWeek = () => {
    setCurrentWeek(prev => addDays(prev, 7))
  }

  const goToCurrentWeek = () => {
    setCurrentWeek(getCurrentWeekMonday())
  }

  // Handle form submission
  const handleCreateAssignment = async () => {
    if (!createForm.personId || (!createForm.projectId && !createForm.courseId)) {
      addToast('error', 'Please fill in all required fields')
      return
    }

    try {
      await createAssignmentMutation.mutateAsync({
        personId: createForm.personId,
        type: createForm.type,
        projectId: createForm.type === 'PROJECT' ? createForm.projectId : undefined,
        courseId: createForm.type === 'COURSE' ? createForm.courseId : undefined,
        startDate: new Date(createForm.startDate),
        plannedEndDate: new Date(createForm.plannedEndDate),
      })
    } catch (error) {
      // Error handled by mutation onError
    }
  }

  const handleDeleteAssignment = (assignmentId: string) => {
    if (confirm('Are you sure you want to delete this assignment?')) {
      deleteAssignmentMutation.mutate({ id: assignmentId })
    }
  }

  // Group assignments by person and week
  const assignmentsByPersonWeek = useMemo(() => {
    if (!assignments) return {}
    
    const grouped: Record<string, Record<string, typeof assignments>> = {}
    
    assignments.forEach(assignment => {
      const personId = assignment.person.id
      const assignmentStart = new Date(assignment.startDate)
      const assignmentEnd = new Date(assignment.plannedEndDate)
      
      // Determine which weeks this assignment spans
      for (let weekDate = new Date(weekStart); weekDate <= weekEnd; weekDate = addDays(weekDate, 7)) {
        const weekEndDate = addDays(weekDate, 6)
        
        // Check if assignment overlaps with this week
        if (assignmentStart <= weekEndDate && assignmentEnd >= weekDate) {
          const weekKey = formatDate(weekDate)
          
          if (!grouped[personId]) {
            grouped[personId] = {}
          }
          if (!grouped[personId][weekKey]) {
            grouped[personId][weekKey] = []
          }
          grouped[personId][weekKey].push(assignment)
        }
      }
    })
    
    return grouped
  }, [assignments, weekStart, weekEnd])

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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Weekly Planning
          </h1>
          <p className="text-muted-foreground">Assign people to projects and courses by week</p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Assignment</DialogTitle>
              <DialogDescription>
                Assign a person to a project or course for a specific week period.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Person Selection */}
              <div className="space-y-2">
                <Label htmlFor="person">Person</Label>
                <Select 
                  value={createForm.personId} 
                  onValueChange={(value) => setCreateForm(prev => ({ ...prev, personId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent>
                    {people?.map(person => (
                      <SelectItem key={person.id} value={person.id}>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{person.name}</div>
                            <div className="text-xs text-muted-foreground">{person.email}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assignment Type */}
              <div className="space-y-2">
                <Label>Assignment Type</Label>
                <Select 
                  value={createForm.type} 
                  onValueChange={(value: 'PROJECT' | 'COURSE') => setCreateForm(prev => ({ 
                    ...prev, 
                    type: value,
                    projectId: '',
                    courseId: ''
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROJECT">
                      <div className="flex items-center space-x-2">
                        <FolderKanban className="h-4 w-4" />
                        <span>Project</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="COURSE">
                      <div className="flex items-center space-x-2">
                        <BookOpen className="h-4 w-4" />
                        <span>Course</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Project/Course Selection */}
              {createForm.type === 'PROJECT' ? (
                <div className="space-y-2">
                  <Label htmlFor="project">Project</Label>
                  <Select 
                    value={createForm.projectId} 
                    onValueChange={(value) => setCreateForm(prev => ({ ...prev, projectId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects?.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="course">Course</Label>
                  <Select 
                    value={createForm.courseId} 
                    onValueChange={(value) => setCreateForm(prev => ({ ...prev, courseId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses?.map(course => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date (Monday)</Label>
                  <Input
                    type="date"
                    value={createForm.startDate}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plannedEndDate">End Date</Label>
                  <Input
                    type="date"
                    value={createForm.plannedEndDate}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, plannedEndDate: e.target.value }))}
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateAssignment}
                  disabled={createAssignmentMutation.isPending}
                >
                  {createAssignmentMutation.isPending ? 'Creating...' : 'Create Assignment'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous Week
            </Button>
            
            <div className="text-center">
              <div className="text-lg font-semibold">
                Week of {getWeekRange(currentWeek)}
              </div>
              <Button variant="ghost" size="sm" onClick={goToCurrentWeek}>
                Go to Current Week
              </Button>
            </div>
            
            <Button variant="outline" onClick={goToNextWeek}>
              Next Week
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Workload Summary */}
      {workload && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Team Workload</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workload.map(person => (
                <div key={person.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{person.name}</p>
                      <p className="text-xs text-muted-foreground">{person.assignments.length} assignments</p>
                    </div>
                  </div>
                  <Badge variant={person.workload > 2 ? 'destructive' : person.workload > 1 ? 'secondary' : 'default'}>
                    {person.workload === 0 ? 'Available' : 
                     person.workload === 1 ? 'Light' :
                     person.workload === 2 ? 'Moderate' : 'Heavy'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Planning Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Planning</CardTitle>
        </CardHeader>
        <CardContent>
          {people && people.length > 0 ? (
            <div className="space-y-4">
              {/* Week Headers */}
              <div className="grid grid-cols-3 gap-4">
                <div className="font-medium">Person</div>
                <div className="font-medium text-center">
                  {getWeekRange(currentWeek)}
                </div>
                <div className="font-medium text-center">
                  {getWeekRange(addDays(currentWeek, 7))}
                </div>
              </div>

              {/* People Rows */}
              {people.map(person => (
                <div key={person.id} className="grid grid-cols-3 gap-4 items-start border-t pt-4">
                  {/* Person Info */}
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-sm">{person.name}</div>
                      <div className="text-xs text-muted-foreground">{person.email}</div>
                    </div>
                  </div>

                  {/* Week 1 Assignments */}
                  <div className="space-y-2">
                    {assignmentsByPersonWeek[person.id]?.[formatDate(currentWeek)]?.map(assignment => (
                      <div key={assignment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center space-x-2">
                          {assignment.type === 'PROJECT' ? (
                            <FolderKanban className="h-4 w-4 text-blue-500" />
                          ) : (
                            <BookOpen className="h-4 w-4 text-green-500" />
                          )}
                          <div>
                            <div className="text-sm font-medium">
                              {assignment.project?.name || assignment.course?.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(assignment.startDate).toLocaleDateString()} - {new Date(assignment.plannedEndDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAssignment(assignment.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )) || <div className="text-sm text-muted-foreground text-center py-4">No assignments</div>}
                  </div>

                  {/* Week 2 Assignments */}
                  <div className="space-y-2">
                    {assignmentsByPersonWeek[person.id]?.[formatDate(addDays(currentWeek, 7))]?.map(assignment => (
                      <div key={assignment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center space-x-2">
                          {assignment.type === 'PROJECT' ? (
                            <FolderKanban className="h-4 w-4 text-blue-500" />
                          ) : (
                            <BookOpen className="h-4 w-4 text-green-500" />
                          )}
                          <div>
                            <div className="text-sm font-medium">
                              {assignment.project?.name || assignment.course?.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(assignment.startDate).toLocaleDateString()} - {new Date(assignment.plannedEndDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAssignment(assignment.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )) || <div className="text-sm text-muted-foreground text-center py-4">No assignments</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4" />
              <p>No people found. Add people to start planning assignments.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}