'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const taskSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  assigneeId: z.string().optional(),
  okrId: z.string().optional(),
  dueDate: z.string().optional(),
  state: z.enum(['BACKLOG', 'READY', 'IN_PROGRESS', 'BLOCKED', 'REVIEW', 'DONE']),
})

type TaskFormData = z.infer<typeof taskSchema>

interface EditTaskFormProps {
  task: {
    id: string
    title: string
    description?: string | null
    priority: string
    assigneeId?: string | null
    okrId?: string | null
    okr?: {
      id: string
      title: string
    } | null
    dueDate?: Date | null
    state: string
  }
  projectId: string
  onSuccess?: () => void
}

export function EditTaskForm({ task, projectId, onSuccess }: EditTaskFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { addToast } = useToast()

  // Prepare default values from the task prop
  const defaultValues: TaskFormData = {
    title: task.title,
    description: task.description || '',
    priority: (task.priority as 'LOW' | 'MEDIUM' | 'HIGH') || 'MEDIUM',
    assigneeId: task.assigneeId || undefined,
    okrId: task.okrId || undefined,
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
    state: (task.state as 'BACKLOG' | 'READY' | 'IN_PROGRESS' | 'BLOCKED' | 'REVIEW' | 'DONE') || 'BACKLOG',
  }

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues,
  })

  const { data: people } = trpc.projects.getPeople.useQuery()
  const { data: project } = trpc.projects.getById.useQuery({ id: projectId })

  const updateMutation = trpc.projects.updateTask.useMutation({
    onSuccess: () => {
      addToast('success', 'Task updated successfully')
      onSuccess?.()
    },
    onError: (error) => {
      addToast('error', error.message || 'Failed to update task')
    },
  })

  const onSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true)
    try {
      await updateMutation.mutateAsync({
        id: task.id,
        title: data.title,
        description: data.description,
        priority: data.priority,
        assigneeId: data.assigneeId || undefined,
        okrId: data.okrId || undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        state: data.state,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Task Title</Label>
        <Input
          id="title"
          placeholder="Task title"
          {...register('title')}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Task description"
          rows={3}
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <Controller
          name="priority"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.priority && (
          <p className="text-sm text-destructive">{errors.priority.message}</p>
        )}
      </div>

      {/* State */}
      <div className="space-y-2">
        <Label htmlFor="state">Status</Label>
        <Controller
          name="state"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BACKLOG">Backlog</SelectItem>
                <SelectItem value="READY">Ready</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="BLOCKED">Blocked</SelectItem>
                <SelectItem value="REVIEW">Review</SelectItem>
                <SelectItem value="DONE">Done</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.state && (
          <p className="text-sm text-destructive">{errors.state.message}</p>
        )}
      </div>

      {/* Assignee */}
      <div className="space-y-2">
        <Label htmlFor="assigneeId">Assignee</Label>
        <Controller
          name="assigneeId"
          control={control}
          render={({ field }) => (
            <Select 
              value={field.value || "unassigned"} 
              onValueChange={(value) => field.onChange(value === 'unassigned' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {people?.map(person => (
                  <SelectItem key={person.id} value={person.id}>
                    <div>
                      <div className="font-medium">{person.name}</div>
                      <div className="text-xs text-muted-foreground">{person.email}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.assigneeId && (
          <p className="text-sm text-destructive">{errors.assigneeId.message}</p>
        )}
      </div>

      {/* OKR Assignment */}
      {project?.okrs && project.okrs.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="okrId">Assign to OKR (Optional)</Label>
          <Controller
            name="okrId"
            control={control}
            render={({ field }) => (
              <Select 
                value={field.value || "none"} 
                onValueChange={(value) => field.onChange(value === 'none' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select OKR" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No OKR</SelectItem>
                  {project.okrs.map(okr => (
                    <SelectItem key={okr.id} value={okr.id}>
                      {okr.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.okrId && (
            <p className="text-sm text-destructive">{errors.okrId.message}</p>
          )}
        </div>
      )}

      {/* Due Date */}
      <div className="space-y-2">
        <Label htmlFor="dueDate">Due Date (Optional)</Label>
        <Input
          id="dueDate"
          type="date"
          {...register('dueDate')}
        />
        {errors.dueDate && (
          <p className="text-sm text-destructive">{errors.dueDate.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Update Task
        </Button>
      </div>
    </form>
  )
}