'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { supportsProficiency } from '@/lib/utils/competency'
import { processCourseDescription, removeMarkdown } from '@/lib/utils'
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
  url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  type: z.enum(['COURSE', 'SPECIALISATION']).default('COURSE'),
  duration: z.coerce.number().int().positive().optional(),
  competencyIds: z.array(z.string()).optional().default([]),
  specialisationCourses: z.array(z.string()).optional().default([]),
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
  onSuccess?: (courseId: string) => void
}

export function CreateCourseForm({ onSuccess }: CreateCourseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCompetencies, setSelectedCompetencies] = useState<string[]>([])
  const [selectedSpecialisationCourses, setSelectedSpecialisationCourses] = useState<string[]>([])
  const [descriptionLength, setDescriptionLength] = useState(0)
  const [courseType, setCourseType] = useState<'COURSE' | 'SPECIALISATION'>('COURSE')

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
      type: 'COURSE',
      competencyIds: [],
      specialisationCourses: [],
    },
  })


  // Get all competencies for selection
  const { data: competencies } = trpc.competencies.list.useQuery()
  
  // Get all courses for specialisation course selection
  const { data: allCourses } = trpc.courses.list.useQuery()

  const createMutation = trpc.courses.create.useMutation({
    onSuccess: (data) => {
      reset()
      setSelectedCompetencies([])
      setSelectedSpecialisationCourses([])
      setDescriptionLength(0)
      setCourseType('COURSE')
      onSuccess?.(data.id)
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
        specialisationCourses: courseType === 'SPECIALISATION' ? selectedSpecialisationCourses : [],
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
  
  const handleSpecialisationCourseToggle = (courseId: string) => {
    setSelectedSpecialisationCourses(prev => {
      const newSelection = prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
      
      setValue('specialisationCourses', newSelection)
      return newSelection
    })
  }

  const removeSpecialisationCourse = (courseId: string) => {
    setSelectedSpecialisationCourses(prev => {
      const newSelection = prev.filter(id => id !== courseId)
      setValue('specialisationCourses', newSelection)
      return newSelection
    })
  }
  
  const selectedSpecialisationCourseObjects = allCourses?.filter(c => 
    selectedSpecialisationCourses.includes(c.id) && c.type === 'COURSE'
  ) || []

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

      {/* Course Type */}
      <div className="space-y-2">
        <Label htmlFor="type">Course Type</Label>
        <Select
          value={courseType}
          onValueChange={(value: 'COURSE' | 'SPECIALISATION') => {
            setCourseType(value)
            setValue('type', value)
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select course type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="COURSE">Course</SelectItem>
            <SelectItem value="SPECIALISATION">Specialisation</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {courseType === 'COURSE' 
            ? 'A standalone course with its own content and competencies'
            : 'A collection of multiple courses that form a learning path'
          }
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="description">Description</Label>
          <span className={`text-xs ${
            descriptionLength > 150 ? 'text-destructive' : 'text-muted-foreground'
          }`}>
            {descriptionLength}/150 characters
          </span>
        </div>
        <Textarea
          id="description"
          placeholder="Enter course description (max 150 characters when processed)"
          rows={3}
          {...register('description')}
          onChange={(e) => {
            const value = e.target.value
            // Calculate processed length (after markdown removal)
            const processedLength = removeMarkdown(value).length
            setDescriptionLength(processedLength)
            register('description').onChange(e)
          }}
        />
        {descriptionLength > 150 && (
          <p className="text-sm text-destructive">
            Description is too long. Current: {descriptionLength} characters, limit: 150 characters (after markdown processing)
          </p>
        )}
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Markdown formatting will be automatically removed in course cards
        </p>
      </div>

      {/* Course URL */}
      <div className="space-y-2">
        <Label htmlFor="url">Course URL</Label>
        <Input
          id="url"
          type="url"
          placeholder="https://example.com/course"
          {...register('url')}
        />
        {errors.url && (
          <p className="text-sm text-destructive">{errors.url.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          External link to the course content (optional)
        </p>
      </div>

      {/* Course Content - Only for regular courses */}
      {courseType === 'COURSE' && (
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
      )}

      {/* Specialisation Courses - Only for specialisations */}
      {courseType === 'SPECIALISATION' && (
        <div className="space-y-4">
          <div>
            <Label>Included Courses</Label>
            <p className="text-sm text-muted-foreground">
              Select courses that are part of this specialisation
            </p>
          </div>

          {/* Selected Specialisation Courses */}
          {selectedSpecialisationCourseObjects.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Courses ({selectedSpecialisationCourseObjects.length})</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg max-h-32 overflow-y-auto">
                {selectedSpecialisationCourseObjects.map((course) => (
                  <Badge
                    key={course.id}
                    variant="secondary"
                    className="bg-blue-100 text-blue-800"
                  >
                    {course.name}
                    <button
                      type="button"
                      onClick={() => removeSpecialisationCourse(course.id)}
                      className="ml-2 hover:bg-black/10 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Available Courses List */}
          <div className="space-y-2">
            <Label>Available Courses</Label>
            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
              {allCourses?.filter(c => c.type === 'COURSE').length === 0 && (
                <p className="text-sm text-muted-foreground">No courses available</p>
              )}
              {allCourses?.filter(c => c.type === 'COURSE').map((course) => (
                <div key={course.id} className="flex items-center space-x-2 py-2">
                  <Checkbox
                    id={`specialisation-course-${course.id}`}
                    checked={selectedSpecialisationCourses.includes(course.id)}
                    onCheckedChange={() => handleSpecialisationCourseToggle(course.id)}
                  />
                  <label
                    htmlFor={`specialisation-course-${course.id}`}
                    className="flex-1 text-sm cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{course.name}</span>
                      {course.duration && (
                        <Badge variant="outline" className="text-xs">
                          {course.duration}h
                        </Badge>
                      )}
                    </div>
                    {course.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {course.description.substring(0, 100)}...
                      </p>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
            setSelectedSpecialisationCourses([])
            setDescriptionLength(0)
            setCourseType('COURSE')
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