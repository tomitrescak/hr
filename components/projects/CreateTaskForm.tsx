'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
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
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  assigneeId: z.string().optional(),
  okrId: z.string().optional(),
  dueDate: z.string().optional(),
})

type TaskFormData = z.infer<typeof taskSchema>

interface CreateTaskFormProps {
  projectId: string
  onSuccess?: () => void
}

export function CreateTaskForm({ projectId, onSuccess }: CreateTaskFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      priority: 'MEDIUM',
    },
  })

  const { data: people } = trpc.projects.getPeople.useQuery()
  const { data: project } = trpc.projects.getById.useQuery({ id: projectId })

  const createMutation = trpc.projects.createTask.useMutation({
    onSuccess: () => {
      reset()
      onSuccess?.()
    },
    onError: (error) => {
      alert(error.message || 'Failed to create task')
    },
  })

  const onSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true)
    try {
      await createMutation.mutateAsync({
        projectId,
        title: data.title,
        description: data.description || undefined,
        priority: data.priority,
        assigneeId: data.assigneeId || undefined,
        okrId: data.okrId || undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Task Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Task Title</Label>
        <Input
          id="title"
          placeholder="Enter task title"
          {...register('title')}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          placeholder="Describe the task"
          rows={3}
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      {person.name}
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
        <Button
          type="button"
          variant="outline"
          onClick={() => reset()}
          disabled={isSubmitting}
        >
          Reset
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create Task
        </Button>
      </div>
    </form>
  )
}