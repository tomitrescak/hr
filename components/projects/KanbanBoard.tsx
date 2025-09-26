'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoreVertical, User, Calendar } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EditTaskForm } from './EditTaskForm'
import { useToast } from '@/components/ui/toast'

const taskStateLabels = {
  BACKLOG: 'Backlog',
  READY: 'Ready',
  IN_PROGRESS: 'In Progress',
  BLOCKED: 'Blocked',
  REVIEW: 'Review',
  DONE: 'Done',
}

const taskStateColors = {
  BACKLOG: 'bg-gray-100',
  READY: 'bg-blue-100',
  IN_PROGRESS: 'bg-yellow-100',
  BLOCKED: 'bg-red-100',
  REVIEW: 'bg-purple-100',
  DONE: 'bg-green-100',
}

const priorityColors = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-red-100 text-red-800',
}

interface Task {
  id: string
  title: string
  description?: string | null
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null
  state: 'BACKLOG' | 'READY' | 'IN_PROGRESS' | 'BLOCKED' | 'REVIEW' | 'DONE'
  dueDate?: Date | null
  assignee?: {
    id: string
    name: string
  } | null
}

interface KanbanBoardProps {
  tasks: Task[]
  projectId: string
  onTaskUpdate?: () => void
}

export function KanbanBoard({ tasks, projectId, onTaskUpdate }: KanbanBoardProps) {
  const [draggingTask, setDraggingTask] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const { addToast } = useToast()

  const updateTaskStateMutation = trpc.projects.updateTaskState.useMutation({
    onSuccess: () => {
      onTaskUpdate?.()
    },
  })

  const deleteTaskMutation = trpc.projects.deleteTask.useMutation({
    onSuccess: () => {
      addToast('success', 'Task deleted successfully')
      onTaskUpdate?.()
    },
    onError: (error) => {
      addToast('error', error.message || 'Failed to delete task')
    },
  })

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggingTask(taskId)
    e.dataTransfer.setData('text/plain', taskId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, newState: keyof typeof taskStateLabels) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain')
    
    if (taskId && taskId !== draggingTask) return

    const task = tasks.find(t => t.id === taskId)
    if (task && task.state !== newState) {
      updateTaskStateMutation.mutate({
        taskId,
        newState,
      })
    }
    
    setDraggingTask(null)
  }

  const handleDragEnd = () => {
    setDraggingTask(null)
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setIsEditDialogOpen(true)
  }

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate({ id: taskId })
    }
  }

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false)
    setEditingTask(null)
    onTaskUpdate?.()
  }

  const tasksByState = tasks.reduce((acc, task) => {
    if (!acc[task.state]) {
      acc[task.state] = []
    }
    acc[task.state].push(task)
    return acc
  }, {} as Record<string, Task[]>)

  const columns = Object.keys(taskStateLabels) as (keyof typeof taskStateLabels)[]

  return (
    <div className="flex space-x-4 overflow-x-auto pb-4">
      {columns.map((state) => (
        <div
          key={state}
          className={`flex-shrink-0 w-80 ${taskStateColors[state]} rounded-lg p-4`}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, state)}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">
              {taskStateLabels[state]}
            </h3>
            <Badge variant="secondary" className="text-xs">
              {tasksByState[state]?.length || 0}
            </Badge>
          </div>

          <div className="space-y-3 min-h-[200px]">
            {tasksByState[state]?.map((task) => (
              <Card
                key={task.id}
                className={`cursor-move hover:shadow-md transition-shadow ${
                  draggingTask === task.id ? 'opacity-50' : ''
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragEnd={handleDragEnd}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditTask(task)}>
                          Edit Task
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          Delete Task
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {task.description && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {task.priority && (
                        <Badge
                          variant="secondary"
                          className={`text-xs ${priorityColors[task.priority]}`}
                        >
                          {task.priority}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      {task.assignee && (
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span className="truncate max-w-[80px]">
                            {task.assignee.name}
                          </span>
                        </div>
                      )}
                      {task.dueDate && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
      
      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <EditTaskForm
              task={editingTask}
              projectId={projectId}
              onSuccess={handleEditSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
