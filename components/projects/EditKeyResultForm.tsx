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
import { Slider } from '@/components/ui/slider'

const editKeyResultSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  progress: z.number().min(0).max(100),
  target: z.string().optional(),
  metric: z.string().optional(),
  dueDate: z.string().optional(),
})

type EditKeyResultFormData = z.infer<typeof editKeyResultSchema>

interface EditKeyResultFormProps {
  keyResult: {
    id: string
    title: string
    description?: string | null
    progress: number
    target?: string | null
    metric?: string | null
    dueDate?: Date | string | null
  }
  onSuccess?: () => void
}

export function EditKeyResultForm({ keyResult, onSuccess }: EditKeyResultFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState(keyResult.progress)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<EditKeyResultFormData>({
    resolver: zodResolver(editKeyResultSchema),
    defaultValues: {
      title: keyResult.title,
      description: keyResult.description || '',
      progress: keyResult.progress,
      target: keyResult.target || '',
      metric: keyResult.metric || '',
      dueDate: keyResult.dueDate 
        ? new Date(keyResult.dueDate).toISOString().split('T')[0] 
        : '',
    },
  })

  const updateMutation = trpc.projects.updateKeyResult.useMutation({
    onSuccess: () => {
      onSuccess?.()
    },
    onError: (error) => {
      alert(error.message || 'Failed to update Key Result')
    },
  })

  const onSubmit = async (data: EditKeyResultFormData) => {
    setIsSubmitting(true)
    try {
      await updateMutation.mutateAsync({
        id: keyResult.id,
        title: data.title,
        description: data.description || undefined,
        progress: data.progress,
        target: data.target || undefined,
        metric: data.metric || undefined,
        dueDate: data.dueDate && data.dueDate.trim() ? data.dueDate : undefined,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleProgressChange = (value: number[]) => {
    const newProgress = value[0]
    setProgress(newProgress)
    setValue('progress', newProgress)
  }

  useEffect(() => {
    setValue('progress', progress)
  }, [progress, setValue])

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

      {/* Progress */}
      <div className="space-y-3">
        <Label>Progress</Label>
        <div className="px-3">
          <Slider
            value={[progress]}
            onValueChange={handleProgressChange}
            max={100}
            min={0}
            step={5}
            className={`w-full ${
              progress >= 90 ? '[&>div>div]:bg-green-500 [&>div:last-child]:border-green-500' :
              progress >= 70 ? '[&>div>div]:bg-blue-500 [&>div:last-child]:border-blue-500' :
              progress >= 50 ? '[&>div>div]:bg-yellow-500 [&>div:last-child]:border-yellow-500' :
              '[&>div>div]:bg-red-400 [&>div:last-child]:border-red-400'
            }`}
          />
          <div className="flex justify-between text-sm text-muted-foreground mt-1">
            <span>0%</span>
            <span className="font-medium">{progress}%</span>
            <span>100%</span>
          </div>
        </div>
        <input type="hidden" {...register('progress')} />
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
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Update Key Result
        </Button>
      </div>
    </form>
  )
}