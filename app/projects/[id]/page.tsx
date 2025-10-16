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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
import { EditTaskForm } from '@/components/projects/EditTaskForm'
import { CreateKeyResultForm } from '@/components/projects/CreateKeyResultForm'
import { KeyResultCard } from '@/components/projects/KeyResultCard'
import { TaskFilters } from '@/components/projects/TaskFilters'
import { ProjectAnalytics } from '@/components/projects/ProjectAnalytics'
import { useToast } from '@/components/ui/toast'
import { AppLayout } from '@/components/layout/app-layout'

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
  const [editingTask, setEditingTask] = useState<any>(null)
  const [isEditOKRDialogOpen, setIsEditOKRDialogOpen] = useState(false)
  const [isEditResponsibilityDialogOpen, setIsEditResponsibilityDialogOpen] = useState(false)
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false)
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

  const deleteOKRMutation = trpc.projects.deleteOkr.useMutation({
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
  const canManage = session?.user?.role === 'PROJECT_MANAGER'

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

  const handleEditTask = (task: any) => {
    setEditingTask(task)
    setIsEditTaskDialogOpen(true)
  }

  const handleEditTaskSuccess = () => {
    setIsEditTaskDialogOpen(false)
    setEditingTask(null)
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
      <AppLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </AppLayout>
    )
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Project not found</h2>
          <p className="text-gray-600 mt-2">The project you&apos;re looking for doesn&apos;t exist.</p>
          <Button onClick={() => router.push('/projects')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </AppLayout>
    )
  }

  const completedTasks = project.tasks.filter(task => task.state === 'DONE').length
  const totalTasks = project.tasks.length
  const taskCompletion = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  return (
    <AppLayout>
      <div className="space-y-6">
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
              onClick={() => router.push(`/projects/${id}/edit`)}
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
                    projectId={id}
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
                    projectId={id}
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
                    projectId={id}
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
              tasks={project.tasks as any}
              onFilteredTasksChange={setFilteredTasks}
              people={people}
            />
          )}
          <KanbanBoard 
            tasks={filteredTasks} 
            projectId={id}
            onTaskUpdate={refetch}
          />
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Members & Responsibilities</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {project.responsibilities.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role/Responsibility</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Date Added</TableHead>
                      {canManage && <TableHead className="w-[70px]">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {project.responsibilities.map((responsibility) => (
                      <TableRow key={responsibility.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{responsibility.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {responsibility.description || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {responsibility.person ? (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              {responsibility.person.name}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(responsibility.createdAt).toLocaleDateString()}
                          </span>
                        </TableCell>
                        {canManage && (
                          <TableCell>
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
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
          {project.okrs.length > 0 ? (
            <div className="space-y-6">
              {project.okrs.map((okr) => {
                const keyResults = okr.keyResults || []
                const okrTasks = okr.tasks || []
                const completedKeyResults = keyResults.filter(kr => kr.progress === 100).length
                const avgCompletion = keyResults.length > 0 
                  ? Math.round(keyResults.reduce((sum, kr) => sum + kr.progress, 0) / keyResults.length)
                  : 0
                
                return (
                  <Card key={okr.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Target className="h-5 w-5 text-blue-500" />
                            <h3 className="text-lg font-semibold">{okr.title}</h3>
                            <Badge 
                              variant={avgCompletion === 100 ? 'default' : avgCompletion >= 70 ? 'secondary' : 'outline'}
                            >
                              {avgCompletion}% Complete
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{okr.description}</p>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {okr.metric && (
                              <span>Metric: <span className="font-medium text-foreground">{okr.metric}</span></span>
                            )}
                            {okr.target && (
                              <span>Target: <span className="font-medium text-foreground">{okr.target}</span></span>
                            )}
                            {okr.dueDate && (
                              <span>Due: <span className="font-medium text-foreground">{new Date(okr.dueDate).toLocaleDateString()}</span></span>
                            )}
                            <span>Key Results: <span className="font-medium text-foreground">{completedKeyResults}/{keyResults.length}</span></span>
                            <span>Tasks: <span className="font-medium text-foreground">{okrTasks.length}</span></span>
                          </div>
                        </div>
                        {canManage && (
                          <div className="flex space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Key Result
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Add Key Result</DialogTitle>
                                </DialogHeader>
                                <CreateKeyResultForm 
                                  okrId={okr.id}
                                  onSuccess={() => refetch()}
                                />
                              </DialogContent>
                            </Dialog>
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
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Key Results */}
                      {keyResults.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-3 flex items-center">
                            <CheckSquare className="h-4 w-4 mr-2 text-green-500" />
                            Key Results ({completedKeyResults}/{keyResults.length})
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                            {keyResults.map((keyResult) => (
                              <KeyResultCard
                                key={keyResult.id}
                                keyResult={keyResult}
                                canManage={canManage}
                                onUpdate={() => refetch()}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Associated Tasks */}
                      {okrTasks.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-3 flex items-center">
                            <CheckSquare className="h-4 w-4 mr-2 text-purple-500" />
                            Associated Tasks ({okrTasks.filter(t => t.state === 'DONE').length}/{okrTasks.length})
                          </h4>
                          <div className="w-full overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-8">Status</TableHead>
                                  <TableHead>Task</TableHead>
                                  <TableHead className="w-32">Assignee</TableHead>
                                  <TableHead className="w-24">State</TableHead>
                                  <TableHead className="w-20">Priority</TableHead>
                                  {canManage && <TableHead className="w-16">Actions</TableHead>}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {okrTasks.map((task) => (
                                  <TableRow key={task.id}>
                                    <TableCell>
                                      <div className={`w-3 h-3 rounded-full ${
                                        task.state === 'DONE' ? 'bg-green-500' :
                                        task.state === 'IN_PROGRESS' ? 'bg-blue-500' :
                                        task.state === 'BLOCKED' ? 'bg-red-500' :
                                        task.state === 'REVIEW' ? 'bg-purple-500' :
                                        'bg-gray-400'
                                      }`} />
                                    </TableCell>
                                    <TableCell>
                                      <span className="font-medium">{task.title}</span>
                                      {task.description && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                          {task.description}
                                        </p>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {task.assignee ? (
                                        <Badge variant="secondary" className="text-xs">
                                          {task.assignee.name}
                                        </Badge>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">Unassigned</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Badge 
                                        variant={task.state === 'DONE' ? 'default' : 'outline'}
                                        className={`text-xs capitalize ${
                                          task.state === 'DONE' ? 'bg-green-100 text-green-800' :
                                          task.state === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                          task.state === 'BLOCKED' ? 'bg-red-100 text-red-800' :
                                          task.state === 'REVIEW' ? 'bg-purple-100 text-purple-800' :
                                          'bg-gray-100 text-gray-800'
                                        }`}
                                      >
                                        {task.state.replace('_', ' ')}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {task.priority && (
                                        <Badge 
                                          variant="outline"
                                          className={`text-xs ${
                                            task.priority === 'HIGH' ? 'border-red-300 text-red-700' :
                                            task.priority === 'MEDIUM' ? 'border-yellow-300 text-yellow-700' :
                                            'border-green-300 text-green-700'
                                          }`}
                                        >
                                          {task.priority}
                                        </Badge>
                                      )}
                                    </TableCell>
                                    {canManage && (
                                      <TableCell>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleEditTask(task)}
                                          className="h-8 w-8 p-0"
                                        >
                                          <MoreVertical className="h-3 w-3" />
                                        </Button>
                                      </TableCell>
                                    )}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                      
                      {keyResults.length === 0 && okrTasks.length === 0 && (
                        <div className="text-center py-6 text-muted-foreground">
                          <div className="flex flex-col items-center space-y-3">
                            <Target className="h-8 w-8 text-muted-foreground/50" />
                            <div>
                              <p className="font-medium">No Key Results or Tasks Yet</p>
                              <p className="text-sm">Add key results to track progress on this objective</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No OKRs defined yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create objectives with key results to track progress on this project.
                </p>
                {canManage && (
                  <Button onClick={() => setCreateOKROpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First OKR
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <ProjectAnalytics project={project as any} />
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
              projectId={id}
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
              projectId={id}
              onSuccess={handleEditResponsibilitySuccess}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={isEditTaskDialogOpen} onOpenChange={setIsEditTaskDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <EditTaskForm
              task={editingTask}
              projectId={id}
              onSuccess={handleEditTaskSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
      </div>
    </AppLayout>
  )
}
