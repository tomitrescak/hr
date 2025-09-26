'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { useSession } from 'next-auth/react'
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Users, 
  Target, 
  CheckSquare, 
  Calendar,
  Plus,
  MoreVertical,
  User
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { KanbanBoard } from '@/components/projects/KanbanBoard'
import { CreateTaskForm } from '@/components/projects/CreateTaskForm'
import { CreateOKRForm } from '@/components/projects/CreateOKRForm'
import { CreateResponsibilityForm } from '@/components/projects/CreateResponsibilityForm'
import { EditOKRForm } from '@/components/projects/EditOKRForm'
import { EditResponsibilityForm } from '@/components/projects/EditResponsibilityForm'
import { TaskFilters } from '@/components/projects/TaskFilters'
import { ProjectAnalytics } from '@/components/projects/ProjectAnalytics'
import { useToast } from '@/components/ui/toast'

const priorityColors = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-red-100 text-red-800',
}

interface ProjectDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const { addToast } = useToast()
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [createOKROpen, setCreateOKROpen] = useState(false)
  const [createResponsibilityOpen, setCreateResponsibilityOpen] = useState(false)
  const [editingOKR, setEditingOKR] = useState<any>(null)
  const [editingResponsibility, setEditingResponsibility] = useState<any>(null)
  const [isEditOKRDialogOpen, setIsEditOKRDialogOpen] = useState(false)
  const [isEditResponsibilityDialogOpen, setIsEditResponsibilityDialogOpen] = useState(false)
  const [filteredTasks, setFilteredTasks] = useState<any[]>([])

  const {
    data: project,
    isLoading,
    refetch,
  } = trpc.projects.getById.useQuery({ id })

  const { data: people } = trpc.projects.getPeople.useQuery()

  const deleteProject = trpc.projects.delete.useMutation({
    onSuccess: () => {
      router.push('/projects')
    },
  })

  const deleteOKRMutation = trpc.projects.deleteOKR.useMutation({
    onSuccess: () => {
      addToast('success', 'OKR deleted successfully')
      refetch()
    },
    onError: (error) => {
      addToast('error', error.message || 'Failed to delete OKR')
    },
  })

  const deleteResponsibilityMutation = trpc.projects.deleteResponsibility.useMutation({
    onSuccess: () => {
      addToast('success', 'Responsibility deleted successfully')
      refetch()
    },
    onError: (error) => {
      addToast('error', error.message || 'Failed to delete responsibility')
    },
  })

  // Check if current user can manage this project
  const canManage = session?.user?.role === 'ADMIN' || 
                   session?.user?.role === 'MANAGER' || 
                   project?.managerId === session?.user?.id

  const handleDelete = async () => {
    if (!project) return

    if (confirm(`Are you sure you want to delete the project "${project.name}"?`)) {
      try {
        await deleteProject.mutateAsync({ id })
        addToast('success', 'Project deleted successfully')
      } catch (error: any) {
        addToast('error', error.message || 'Failed to delete project')
      }
    }
  }

  const handleEditOKR = (okr: any) => {
    setEditingOKR(okr)
    setIsEditOKRDialogOpen(true)
  }

  const handleDeleteOKR = (okrId: string) => {
    if (confirm('Are you sure you want to delete this OKR?')) {
      deleteOKRMutation.mutate({ id: okrId })
    }
  }

  const handleEditResponsibility = (responsibility: any) => {
    setEditingResponsibility(responsibility)
    setIsEditResponsibilityDialogOpen(true)
  }

  const handleDeleteResponsibility = (responsibilityId: string) => {
    if (confirm('Are you sure you want to delete this responsibility?')) {
      deleteResponsibilityMutation.mutate({ id: responsibilityId })
    }
  }

  const handleEditOKRSuccess = () => {
    setIsEditOKRDialogOpen(false)
    setEditingOKR(null)
    refetch()
  }

  const handleEditResponsibilitySuccess = () => {
    setIsEditResponsibilityDialogOpen(false)
    setEditingResponsibility(null)
    refetch()
  }

  // Initialize filtered tasks when project loads
  useEffect(() => {
    if (project?.tasks) {
      setFilteredTasks(project.tasks)
    }
  }, [project?.tasks])

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

  if (!project) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Project not found</h2>
          <p className="text-gray-600 mt-2">The project you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/projects')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    )
  }

  const completedTasks = project.tasks.filter(task => task.state === 'DONE').length
  const totalTasks = project.tasks.length
  const taskCompletion = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/projects')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground mt-1">{project.description}</p>
          </div>
        </div>
        {canManage && (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/projects/${params.id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteProject.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tasks</p>
                <p className="text-2xl font-bold">{totalTasks}</p>
                <p className="text-xs text-muted-foreground">{completedTasks} completed</p>
              </div>
              <CheckSquare className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion</p>
                <p className="text-2xl font-bold">{taskCompletion.toFixed(0)}%</p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Team Members</p>
                <p className="text-2xl font-bold">{project.responsibilities.length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">OKRs</p>
                <p className="text-2xl font-bold">{project.okrs.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="kanban" className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="okrs">OKRs</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          
          {canManage && (
            <div className="flex space-x-2">
              <Dialog open={createTaskOpen} onOpenChange={setCreateTaskOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                  </DialogHeader>
                  <CreateTaskForm 
                    projectId={params.id}
                    onSuccess={() => {
                      setCreateTaskOpen(false)
                      refetch()
                    }}
                  />
                </DialogContent>
              </Dialog>

              <Dialog open={createOKROpen} onOpenChange={setCreateOKROpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add OKR
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New OKR</DialogTitle>
                  </DialogHeader>
                  <CreateOKRForm 
                    projectId={params.id}
                    onSuccess={() => {
                      setCreateOKROpen(false)
                      refetch()
                    }}
                  />
                </DialogContent>
              </Dialog>

              <Dialog open={createResponsibilityOpen} onOpenChange={setCreateResponsibilityOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Team Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
                  </DialogHeader>
                  <CreateResponsibilityForm 
                    projectId={params.id}
                    onSuccess={() => {
                      setCreateResponsibilityOpen(false)
                      refetch()
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Kanban Board Tab */}
        <TabsContent value="kanban" className="space-y-4">
          {people && (
            <TaskFilters
              tasks={project.tasks}
              onFilteredTasksChange={setFilteredTasks}
              people={people}
            />
          )}
          <KanbanBoard 
            tasks={filteredTasks} 
            projectId={params.id}
            onTaskUpdate={refetch}
          />
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Members & Responsibilities</CardTitle>
            </CardHeader>
            <CardContent>
              {project.responsibilities.length > 0 ? (
                <div className="grid gap-4">
                  {project.responsibilities.map((responsibility) => (
                    <div key={responsibility.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <User className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <h4 className="font-medium">{responsibility.title}</h4>
                            <p className="text-sm text-muted-foreground">{responsibility.description}</p>
                            {responsibility.person && (
                              <p className="text-sm font-medium text-blue-600 mt-1">
                                Assigned to: {responsibility.person.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditResponsibility(responsibility)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDeleteResponsibility(responsibility.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No team members assigned yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* OKRs Tab */}
        <TabsContent value="okrs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Objectives & Key Results</CardTitle>
            </CardHeader>
            <CardContent>
              {project.okrs.length > 0 ? (
                <div className="grid gap-4">
                  {project.okrs.map((okr) => (
                    <div key={okr.id} className="flex items-start justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{okr.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{okr.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm">
                          {okr.metric && (
                            <span className="text-muted-foreground">
                              Metric: <span className="font-medium">{okr.metric}</span>
                            </span>
                          )}
                          {okr.target && (
                            <span className="text-muted-foreground">
                              Target: <span className="font-medium">{okr.target}</span>
                            </span>
                          )}
                          {okr.dueDate && (
                            <span className="text-muted-foreground">
                              Due: <span className="font-medium">{new Date(okr.dueDate).toLocaleDateString()}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditOKR(okr)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDeleteOKR(okr.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No OKRs defined yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <ProjectAnalytics project={project} />
        </TabsContent>
      </Tabs>

      {/* Edit OKR Dialog */}
      <Dialog open={isEditOKRDialogOpen} onOpenChange={setIsEditOKRDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit OKR</DialogTitle>
          </DialogHeader>
          {editingOKR && (
            <EditOKRForm
              okr={editingOKR}
              projectId={params.id}
              onSuccess={handleEditOKRSuccess}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Responsibility Dialog */}
      <Dialog open={isEditResponsibilityDialogOpen} onOpenChange={setIsEditResponsibilityDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Responsibility</DialogTitle>
          </DialogHeader>
          {editingResponsibility && (
            <EditResponsibilityForm
              responsibility={editingResponsibility}
              projectId={params.id}
              onSuccess={handleEditResponsibilitySuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
