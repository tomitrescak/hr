'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const okrSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  metric: z.string().min(2, 'Metric must be at least 2 characters'),
  target: z.number().min(0, 'Target must be a positive number'),
  current: z.number().min(0, 'Current value must be a positive number'),
  dueDate: z.string().optional(),
})

type OKRFormData = z.infer<typeof okrSchema>

interface EditOKRFormProps {
  okr: {
    id: string
    title: string
    description?: string | null
    metric: string
    target: number
    current?: number | null
    dueDate?: Date | null
  }
  projectId: string
  onSuccess?: () => void
}

export function EditOKRForm({ okr, projectId, onSuccess }: EditOKRFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<OKRFormData>({
    resolver: zodResolver(okrSchema),
  })

  // Set initial values
  useEffect(() => {
    setValue('title', okr.title)
    setValue('description', okr.description || '')
    setValue('metric', okr.metric)
    setValue('target', okr.target)
    setValue('current', okr.current || 0)
    setValue('dueDate', okr.dueDate ? new Date(okr.dueDate).toISOString().split('T')[0] : '')
  }, [okr, setValue])

  const updateMutation = trpc.projects.updateOkr.useMutation({
    onSuccess: () => {
      onSuccess?.()
    },
    onError: (error) => {
      alert(error.message || 'Failed to update OKR')
    },
  })

  const onSubmit = async (data: OKRFormData) => {
    setIsSubmitting(true)
    try {
      await updateMutation.mutateAsync({
        id: okr.id,
        title: data.title,
        description: data.description,
        metric: data.metric,
        target: data.target.toString(),
        dueDate: data.dueDate,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">OKR Title</Label>
        <Input
          id="title"
          placeholder="e.g., Increase user engagement"
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
          placeholder="Describe the objective and key results"
          rows={3}
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Metric */}
      <div className="space-y-2">
        <Label htmlFor="metric">Metric</Label>
        <Input
          id="metric"
          placeholder="e.g., Daily active users, Revenue, etc."
          {...register('metric')}
        />
        {errors.metric && (
          <p className="text-sm text-destructive">{errors.metric.message}</p>
        )}
      </div>

      {/* Target and Current */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="target">Target Value</Label>
          <Input
            id="target"
            type="number"
            placeholder="Target value"
            {...register('target', { valueAsNumber: true })}
          />
          {errors.target && (
            <p className="text-sm text-destructive">{errors.target.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="current">Current Value</Label>
          <Input
            id="current"
            type="number"
            placeholder="Current value"
            {...register('current', { valueAsNumber: true })}
          />
          {errors.current && (
            <p className="text-sm text-destructive">{errors.current.message}</p>
          )}
        </div>
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
          Update OKR
        </Button>
      </div>
    </form>
  )
}