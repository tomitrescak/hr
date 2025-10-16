'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoreVertical, User, Calendar, GripVertical } from 'lucide-react'
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
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Droppable column component
function DroppableKanbanColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  })

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[200px] space-y-3 transition-colors ${
        isOver ? "bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg" : ""
      }`}
    >
      {children}
    </div>
  )
}

// Sortable task card component
interface SortableTaskCardProps {
  task: Task
  isDragging?: boolean
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
}

function SortableTaskCard({ task, isDragging = false, onEdit, onDelete }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`cursor-pointer hover:shadow-md transition-shadow ${
        isDragging ? 'opacity-50 rotate-1 shadow-lg' : ''
      }`}
      {...attributes}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1">
            <div
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-gray-100"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <h4 className="font-medium text-sm line-clamp-2 flex-1">{task.title}</h4>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                Edit Task
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => onDelete(task.id)}
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
  )
}

const taskStateLabels = {
  BACKLOG: 'Backlog',
  READY: 'Ready',
  // IN_PROGRESS: 'In Progress',
  BLOCKED: 'Blocked',
  // REVIEW: 'Review',
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
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const { addToast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)
    
    // Find the dragged task
    const task = tasks.find(t => t.id === active.id)
    setDraggedTask(task || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setDraggedTask(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Find the task being moved
    const task = tasks.find(t => t.id === activeId)
    if (!task) return

    // Determine target state based on drop zone
    let targetState: Task['state']
    if (overId.includes('-column')) {
      // Dropped on column
      targetState = overId.replace('-column', '') as Task['state']
    } else {
      // Dropped on another task, determine which column it belongs to
      const targetTask = tasks.find(t => t.id === overId)
      if (!targetTask) return
      targetState = targetTask.state
    }

    // Only update if state changed
    if (task.state !== targetState) {
      updateTaskStateMutation.mutate({
        taskId: activeId,
        newState: targetState,
      })
    }
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex space-x-4 overflow-x-auto pb-4">
        {columns.map((state) => (
          <div
            key={state}
            className={`flex-shrink-0 w-80 ${taskStateColors[state]} rounded-lg p-4`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">
                {taskStateLabels[state]}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {tasksByState[state]?.length || 0}
              </Badge>
            </div>

            <DroppableKanbanColumn id={`${state}-column`}>
              <SortableContext
                items={tasksByState[state]?.map(task => task.id) || []}
                strategy={verticalListSortingStrategy}
              >
                {tasksByState[state]?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No tasks in {taskStateLabels[state].toLowerCase()}
                  </div>
                ) : (
                  tasksByState[state]?.map((task) => (
                    <SortableTaskCard
                      key={task.id}
                      task={task}
                      isDragging={activeId === task.id}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                    />
                  ))
                )}
              </SortableContext>
            </DroppableKanbanColumn>
          </div>
        ))}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {draggedTask ? (
          <SortableTaskCard
            task={draggedTask}
            isDragging
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
          />
        ) : null}
      </DragOverlay>
      
      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <EditTaskForm
              task={editingTask as any}
              projectId={projectId}
              onSuccess={handleEditSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </DndContext>
  )
}
