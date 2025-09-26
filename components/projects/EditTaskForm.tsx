'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
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
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  state: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']),
})

type TaskFormData = z.infer<typeof taskSchema>

interface EditTaskFormProps {
  task: {
    id: string
    title: string
    description?: string | null
    priority: string
    assigneeId?: string | null
    dueDate?: Date | null
    state: string
  }
  projectId: string
  onSuccess?: () => void
}

export function EditTaskForm({ task, projectId, onSuccess }: EditTaskFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { addToast } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
  })

  const watchedPriority = watch('priority')
  const watchedAssigneeId = watch('assigneeId')
  const watchedState = watch('state')

  const { data: people } = trpc.projects.getPeople.useQuery()

  // Set initial values
  useEffect(() => {
    setValue('title', task.title)
    setValue('description', task.description || '')
    setValue('priority', task.priority as any)
    setValue('assigneeId', task.assigneeId || undefined)
    setValue('dueDate', task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '')
    setValue('state', task.state as any)
  }, [task, setValue])

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
        <Select
          value={watchedPriority}
          onValueChange={(value) => setValue('priority', value as any)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
          </SelectContent>
        </Select>
        {errors.priority && (
          <p className="text-sm text-destructive">{errors.priority.message}</p>
        )}
      </div>

      {/* State */}
      <div className="space-y-2">
        <Label htmlFor="state">Status</Label>
        <Select
          value={watchedState}
          onValueChange={(value) => setValue('state', value as any)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODO">To Do</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="IN_REVIEW">In Review</SelectItem>
            <SelectItem value="DONE">Done</SelectItem>
          </SelectContent>
        </Select>
        {errors.state && (
          <p className="text-sm text-destructive">{errors.state.message}</p>
        )}
      </div>

      {/* Assignee */}
      <div className="space-y-2">
        <Label htmlFor="assigneeId">Assignee</Label>
        <Select
          value={watchedAssigneeId}
          onValueChange={(value) => setValue('assigneeId', value === 'unassigned' ? undefined : value)}
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
        {errors.assigneeId && (
          <p className="text-sm text-destructive">{errors.assigneeId.message}</p>
        )}
      </div>

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