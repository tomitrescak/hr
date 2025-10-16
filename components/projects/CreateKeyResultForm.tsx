'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const keyResultSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  target: z.string().optional(),
  metric: z.string().optional(),
  dueDate: z.string().optional(),
})

type KeyResultFormData = z.infer<typeof keyResultSchema>

interface CreateKeyResultFormProps {
  okrId: string
  onSuccess?: () => void
}

export function CreateKeyResultForm({ okrId, onSuccess }: CreateKeyResultFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<KeyResultFormData>({
    resolver: zodResolver(keyResultSchema),
  })

  const createMutation = trpc.projects.createKeyResult.useMutation({
    onSuccess: () => {
      reset()
      onSuccess?.()
    },
    onError: (error) => {
      alert(error.message || 'Failed to create Key Result')
    },
  })

  const onSubmit = async (data: KeyResultFormData) => {
    setIsSubmitting(true)
    try {
      await createMutation.mutateAsync({
        okrId,
        title: data.title,
        description: data.description || undefined,
        target: data.target || undefined,
        metric: data.metric || undefined,
        dueDate: data.dueDate && data.dueDate.trim() ? data.dueDate : undefined,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Key Result Title</Label>
        <Input
          id="title"
          placeholder="Enter key result title"
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
          placeholder="Describe the key result"
          rows={2}
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Metric */}
        <div className="space-y-2">
          <Label htmlFor="metric">Metric (Optional)</Label>
          <Input
            id="metric"
            placeholder="How will you measure this?"
            {...register('metric')}
          />
          {errors.metric && (
            <p className="text-sm text-destructive">{errors.metric.message}</p>
          )}
        </div>

        {/* Target */}
        <div className="space-y-2">
          <Label htmlFor="target">Target (Optional)</Label>
          <Input
            id="target"
            placeholder="What's the target?"
            {...register('target')}
          />
          {errors.target && (
            <p className="text-sm text-destructive">{errors.target.message}</p>
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
          Create Key Result
        </Button>
      </div>
    </form>
  )
}