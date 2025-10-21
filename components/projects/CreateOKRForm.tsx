'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const keyResultSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  target: z.string().optional(),
  metric: z.string().optional(),
  dueDate: z.string().optional(),
})

const okrSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  metric: z.string().optional(),
  target: z.string().optional(),
  dueDate: z.string().optional(),
  keyResults: z.array(keyResultSchema).optional(),
})

type OKRFormData = z.infer<typeof okrSchema>

interface CreateOKRFormProps {
  projectId: string
  onSuccess?: () => void
}

export function CreateOKRForm({ projectId, onSuccess }: CreateOKRFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<OKRFormData>({
    resolver: zodResolver(okrSchema),
    defaultValues: {
      keyResults: [{ title: '', description: '', target: '', metric: '', dueDate: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'keyResults',
  })

  const createOkrMutation = trpc.projects.createOkr.useMutation()
  const createKeyResultMutation = trpc.projects.createKeyResult.useMutation()

  const onSubmit = async (data: OKRFormData) => {
    setIsSubmitting(true)
    try {
      // First create the OKR
      const okr = await createOkrMutation.mutateAsync({
        projectId,
        title: data.title,
        description: data.description,
        metric: data.metric || undefined,
        target: data.target || undefined,
        dueDate: data.dueDate,
      })

      // Then create the Key Results
      if (data.keyResults && data.keyResults.length > 0) {
        const keyResultPromises = data.keyResults
          .filter(kr => kr.title.trim()) // Only create Key Results with titles
          .map(keyResult =>
            createKeyResultMutation.mutateAsync({
              okrId: okr.id,
              title: keyResult.title,
              description: keyResult.description || undefined,
              target: keyResult.target || undefined,
              metric: keyResult.metric || undefined,
              dueDate: keyResult.dueDate && keyResult.dueDate.trim() ? keyResult.dueDate : undefined,
            })
          )
        
        await Promise.all(keyResultPromises)
      }

      reset({
        keyResults: [{ title: '', description: '', target: '', metric: '', dueDate: '' }],
      })
      onSuccess?.()
    } catch (error: any) {
      alert(error.message || 'Failed to create OKR')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Objective Title</Label>
        <Input
          id="title"
          placeholder="Enter objective title"
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
          placeholder="Describe the objective"
          rows={3}
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

      {/* Key Results Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Key Results</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ title: '', description: '', target: '', metric: '', dueDate: '' })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Key Result
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <Card key={field.id} className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-medium text-sm">Key Result {index + 1}</h4>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor={`keyResults.${index}.title`}>Title</Label>
                    <Input
                      id={`keyResults.${index}.title`}
                      placeholder="Enter key result title"
                      {...register(`keyResults.${index}.title`)}
                    />
                    {errors.keyResults?.[index]?.title && (
                      <p className="text-sm text-destructive">{errors.keyResults[index]?.title?.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`keyResults.${index}.description`}>Description (Optional)</Label>
                    <Textarea
                      id={`keyResults.${index}.description`}
                      placeholder="Describe this key result"
                      rows={2}
                      {...register(`keyResults.${index}.description`)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`keyResults.${index}.metric`}>Metric</Label>
                      <Input
                        id={`keyResults.${index}.metric`}
                        placeholder="Measurement"
                        {...register(`keyResults.${index}.metric`)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`keyResults.${index}.target`}>Target</Label>
                      <Input
                        id={`keyResults.${index}.target`}
                        placeholder="Target value"
                        {...register(`keyResults.${index}.target`)}
                      />
                    </div>
                    
                    
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor={`keyResults.${index}.dueDate`}>Due Date</Label>
                      <Input
                        id={`keyResults.${index}.dueDate`}
                        type="date"
                        {...register(`keyResults.${index}.dueDate`)}
                      />
                    </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

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
          Create OKR
        </Button>
      </div>
    </form>
  )
}