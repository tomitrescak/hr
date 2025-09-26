'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { Loader2 } from 'lucide-react'

const competencySchema = z.object({
  type: z.enum(['KNOWLEDGE', 'SKILL', 'TECH_TOOL', 'ABILITY', 'VALUE', 'BEHAVIOUR', 'ENABLER']),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
})

type CompetencyFormData = z.infer<typeof competencySchema>

interface CreateCompetencyFormProps {
  onSuccess?: () => void
}

export function CreateCompetencyForm({ onSuccess }: CreateCompetencyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CompetencyFormData>({
    resolver: zodResolver(competencySchema),
  })

  const watchedType = watch('type')

  const createMutation = trpc.competencies.create.useMutation({
    onSuccess: () => {
      reset()
      onSuccess?.()
    },
    onError: (error) => {
      alert(error.message || 'Failed to create competency')
    },
  })

  const onSubmit = async (data: CompetencyFormData) => {
    setIsSubmitting(true)
    try {
      await createMutation.mutateAsync(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  const competencyTypeOptions = [
    { value: 'KNOWLEDGE', label: 'Knowledge', description: 'Information, facts, or understanding' },
    { value: 'SKILL', label: 'Skill', description: 'Ability to perform tasks or activities' },
    { value: 'TECH_TOOL', label: 'Tech Tool', description: 'Software, frameworks, or technologies' },
    { value: 'ABILITY', label: 'Ability', description: 'Natural talent or capacity' },
    { value: 'VALUE', label: 'Value', description: 'Principles or beliefs' },
    { value: 'BEHAVIOUR', label: 'Behaviour', description: 'Observable actions or conduct' },
    { value: 'ENABLER', label: 'Enabler', description: 'Supporting skills or capabilities' },
  ]

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Type Selection */}
      <div className="space-y-2">
        <Label htmlFor="type">Competency Type</Label>
        <Select
          value={watchedType}
          onValueChange={(value) => setValue('type', value as any)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select competency type" />
          </SelectTrigger>
          <SelectContent>
            {competencyTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.type && (
          <p className="text-sm text-destructive">{errors.type.message}</p>
        )}
      </div>

      {/* Name Input */}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          placeholder="Enter competency name"
          {...register('name')}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Description Input */}
      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          placeholder="Enter competency description"
          rows={3}
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
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
          Create Competency
        </Button>
      </div>
    </form>
  )
}