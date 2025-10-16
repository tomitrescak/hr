'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

const courseSchema = z.object({
  name: z.string().min(2, 'Course name must be at least 2 characters'),
  description: z.string().optional(),
  content: z.string().optional(),
  duration: z.coerce.number().int().positive().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  competencyIds: z.array(z.string()).optional().default([]),
})

type CourseFormData = z.infer<typeof courseSchema>

const competencyTypeColors = {
  KNOWLEDGE: 'bg-blue-100 text-blue-800',
  SKILL: 'bg-green-100 text-green-800',
  TECH_TOOL: 'bg-purple-100 text-purple-800',
  ABILITY: 'bg-orange-100 text-orange-800',
  VALUE: 'bg-pink-100 text-pink-800',
  BEHAVIOUR: 'bg-indigo-100 text-indigo-800',
  ENABLER: 'bg-gray-100 text-gray-800',
}

interface CreateCourseFormProps {
  onSuccess?: () => void
}

export function CreateCourseForm({ onSuccess }: CreateCourseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCompetencies, setSelectedCompetencies] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      status: 'DRAFT',
      competencyIds: [],
    },
  })

  const watchedStatus = watch('status')

  // Get all competencies for selection
  const { data: competencies } = trpc.competencies.list.useQuery()

  const createMutation = trpc.courses.create.useMutation({
    onSuccess: () => {
      reset()
      setSelectedCompetencies([])
      onSuccess?.()
    },
    onError: (error) => {
      alert(error.message || 'Failed to create course')
    },
  })

  const onSubmit = async (data: CourseFormData) => {
    setIsSubmitting(true)
    try {
      await createMutation.mutateAsync({
        ...data,
        competencyIds: selectedCompetencies,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCompetencyToggle = (competencyId: string) => {
    setSelectedCompetencies(prev => {
      const newSelection = prev.includes(competencyId)
        ? prev.filter(id => id !== competencyId)
        : [...prev, competencyId]
      
      setValue('competencyIds', newSelection)
      return newSelection
    })
  }

  const removeCompetency = (competencyId: string) => {
    setSelectedCompetencies(prev => {
      const newSelection = prev.filter(id => id !== competencyId)
      setValue('competencyIds', newSelection)
      return newSelection
    })
  }

  const selectedCompetencyObjects = competencies?.filter(c => 
    selectedCompetencies.includes(c.id)
  ) || []

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Course Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Course Name</Label>
          <Input
            id="name"
            placeholder="Enter course name"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={watchedStatus}
            onValueChange={(value) => setValue('status', value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
            </SelectContent>
          </Select>
          {errors.status && (
            <p className="text-sm text-destructive">{errors.status.message}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Enter course description"
          rows={3}
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Course Content */}
      <div className="space-y-2">
        <Label htmlFor="content">Course Content</Label>
        <Textarea
          id="content"
          placeholder="Enter course content, curriculum, or outline"
          rows={6}
          {...register('content')}
        />
        {errors.content && (
          <p className="text-sm text-destructive">{errors.content.message}</p>
        )}
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <Label htmlFor="duration">Duration (hours)</Label>
        <Input
          id="duration"
          type="number"
          min="1"
          placeholder="e.g., 10"
          {...register('duration')}
        />
        {errors.duration && (
          <p className="text-sm text-destructive">{errors.duration.message}</p>
        )}
      </div>

      {/* Competencies Selection */}
      <div className="space-y-4">
        <div>
          <Label>Associated Competencies</Label>
          <p className="text-sm text-muted-foreground">
            Select competencies that this course will help develop
          </p>
        </div>

        {/* Selected Competencies */}
        {selectedCompetencyObjects.length > 0 && (
          <div className="space-y-2">
            <Label>Selected Competencies ({selectedCompetencyObjects.length})</Label>
            <div className="flex flex-wrap gap-2 p-3 border rounded-lg max-h-32 overflow-y-auto">
              {selectedCompetencyObjects.map((competency) => (
                <Badge
                  key={competency.id}
                  variant="secondary"
                  className={competencyTypeColors[competency.type]}
                >
                  {competency.name}
                  <button
                    type="button"
                    onClick={() => removeCompetency(competency.id)}
                    className="ml-2 hover:bg-black/10 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Competencies List */}
        <div className="space-y-2">
          <Label>Available Competencies</Label>
          <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
            {competencies?.length === 0 && (
              <p className="text-sm text-muted-foreground">No competencies available</p>
            )}
            {competencies?.map((competency) => (
              <div key={competency.id} className="flex items-center space-x-2 py-2">
                <Checkbox
                  id={`competency-${competency.id}`}
                  checked={selectedCompetencies.includes(competency.id)}
                  onCheckedChange={() => handleCompetencyToggle(competency.id)}
                />
                <label
                  htmlFor={`competency-${competency.id}`}
                  className="flex-1 text-sm cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{competency.name}</span>
                    <Badge
                      variant="outline"
                      className={competencyTypeColors[competency.type]}
                    >
                      {competency.type.replace('_', ' ')}
                    </Badge>
                  </div>
                  {competency.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {competency.description}
                    </p>
                  )}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            reset()
            setSelectedCompetencies([])
          }}
          disabled={isSubmitting}
        >
          Reset
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create Course
        </Button>
      </div>
    </form>
  )
}