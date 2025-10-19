'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { useSession } from 'next-auth/react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  ArrowLeft, 
  Save,
  X
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AppLayout } from '@/components/layout/app-layout'
import { CourseCompetencyManager } from '@/components/courses/CourseCompetencyManager'
import { CompetencyExtractor } from '@/components/courses/CompetencyExtractor'
import { removeMarkdown } from '@/lib/utils'

const courseSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  content: z.string().optional(),
  url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  type: z.enum(['COURSE', 'SPECIALISATION']).default('COURSE'),
  duration: z.string().transform(val => val ? parseInt(val, 10) : undefined).optional(),
})

type CourseFormData = {
  name: string
  description?: string
  content?: string
  url?: string
  type: 'COURSE' | 'SPECIALISATION'
  duration?: string
}

interface CourseEditPageProps {
  params: Promise<{
    id: string
  }>
}

export default function CourseEditPage({ params }: CourseEditPageProps) {
  const { id } = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const [selectedSpecialisationCourses, setSelectedSpecialisationCourses] = useState<string[]>([])

  const {
    data: course,
    isLoading,
    refetch,
  } = trpc.courses.getById.useQuery({ id })

  const { data: allCompetencies } = trpc.competencies.list.useQuery()
  const { data: allCourses } = trpc.courses.list.useQuery()

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      content: '',
      url: '',
      type: 'COURSE',
      duration: '',
    },
  })

  // Watch the type field to get the current form value
  const formType = watch('type')

  // Update form when course data loads
  useEffect(() => {
    if (course) {
      const courseType = course.type || 'COURSE'
      reset({
        name: course.name,
        description: course.description || '',
        content: course.content || '',
        url: course.url || '',
        type: courseType,
        duration: course.duration?.toString() || '',
      })
      // Update state variables
      setSelectedSpecialisationCourses(
        course.specialisationCourses?.map(sc => sc.courseId) || []
      )
    }
  }, [course, reset])

  const updateMutationWithRedirect = trpc.courses.update.useMutation({
    onSuccess: () => {
      refetch()
      router.push(`/courses/${id}`)
    },
    onError: (error) => {
      alert(error.message || 'Failed to update course')
    },
  })

  const createCompetencyMutation = trpc.competencies.create.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const addCompetencyMutation = trpc.courses.addCompetency.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const removeCompetencyMutation = trpc.courses.removeCompetency.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const updateCompetencyProficiencyMutation = trpc.courses.updateCompetencyProficiency.useMutation({
    onSuccess: () => {
      refetch()
    },
    onError: (error) => {
      alert(error.message || 'Failed to update proficiency')
    },
  })

  const canManage = session?.user?.role === 'PROJECT_MANAGER'
  
  const handleSpecialisationCourseToggle = (courseId: string) => {
    setSelectedSpecialisationCourses(prev => {
      const newSelection = prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
      
      return newSelection
    })
  }

  const removeSpecialisationCourse = (courseId: string) => {
    setSelectedSpecialisationCourses(prev => {
      const newSelection = prev.filter(id => id !== courseId)
      return newSelection
    })
  }
  
  const selectedSpecialisationCourseObjects = allCourses?.filter(c => 
    selectedSpecialisationCourses.includes(c.id) && c.type === 'COURSE'
  ) || []

  const onSubmit = async (data: CourseFormData) => {
    try {
      await updateMutationWithRedirect.mutateAsync({
        id,
        name: data.name,
        description: data.description,
        content: data.content,
        url: data.url,
        type: data.type,
        duration: data.duration ? parseInt(data.duration, 10) : undefined,
        specialisationCourses: data.type === 'SPECIALISATION' ? selectedSpecialisationCourses : [],
      })
    } catch (error) {
      console.error('Failed to update course:', error)
    }
  }

  const handleAddCompetency = async (competencyId: string, proficiency?: string) => {
    try {
      await addCompetencyMutation.mutateAsync({
        courseId: id,
        competencyId,
        proficiency: proficiency as any,
      })
    } catch (error) {
      console.error('Failed to add competency:', error)
    }
  }

  const handleRemoveCompetency = async (competencyId: string) => {
    try {
      await removeCompetencyMutation.mutateAsync({
        courseId: id,
        competencyId,
      })
    } catch (error) {
      console.error('Failed to remove competency:', error)
    }
  }

  const handleUpdateProficiency = async (competencyId: string, proficiency?: string) => {
    try {
      await updateCompetencyProficiencyMutation.mutateAsync({
        courseId: id,
        competencyId,
        proficiency: proficiency as any,
      })
    } catch (error) {
      console.error('Failed to update proficiency:', error)
    }
  }

  if (!canManage) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-600 mt-2">Only Project Managers can edit courses.</p>
          <Button onClick={() => router.push(`/courses/${id}`)} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Button>
        </div>
      </AppLayout>
    )
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </AppLayout>
    )
  }

  if (!course) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Course not found</h2>
          <p className="text-gray-600 mt-2">The course you&apos;re looking for doesn&apos;t exist.</p>
          <Button onClick={() => router.push('/courses')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push(`/courses/${id}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Edit Course</h1>
              <p className="text-muted-foreground">
                Update course details and manage competencies
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Course Information */}
          <Card>
            <CardHeader>
              <CardTitle>Course Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Course Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter course name"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (hours)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="Enter duration in hours"
                  {...register('duration')}
                />
                {errors.duration && (
                  <p className="text-sm text-destructive">{errors.duration.message}</p>
                )}
              </div>

              {/* Course Type */}
              <div className="space-y-2">
                <Label htmlFor="type">Course Type</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || 'COURSE'}
                      onValueChange={(value: 'COURSE' | 'SPECIALISATION' | "") => {
                        if (value !== "") {
                          field.onChange(value)
                        }
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
                  )}
                />
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
                
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="description">Description</Label>
                  
                </div>
                <Textarea
                  id="description"
                  placeholder="Enter course description"
                  rows={3}
                  {...register('description', {
                    onChange: (e) => {
                      const value = e.target.value
                      const processedLength = removeMarkdown(value).length
                    }
                  })}
                />
                
                
              </div>

              {/* Course Content - Only for regular courses */}
              {formType === 'COURSE' && (
                <div className="space-y-2">
                  <Label htmlFor="content">Course Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Enter detailed course content"
                    rows={6}
                    {...register('content')}
                  />
                </div>
              )}

              {/* Specialisation Courses - Only for specialisations */}
              {formType === 'SPECIALISATION' && (
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
                      {allCourses?.filter(c => c.type === 'COURSE' && c.id !== id).length === 0 && (
                        <p className="text-sm text-muted-foreground">No courses available</p>
                      )}
                      {allCourses?.filter(c => c.type === 'COURSE' && c.id !== id).map((course) => (
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
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={updateMutationWithRedirect.isPending || !isDirty}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/courses/${id}`)}
            >
              Cancel
            </Button>
          </div>
        </form>

        {/* AI Competency Extraction - Outside of form to prevent form submission conflicts */}
        {(course.content || course.description) && (
          <CompetencyExtractor
            entityId={id}
            entityName={course.name}
            content={`Course: ${course.name}

<description>
${course.description  || ''}
</description>

<course_content>
${course.content || ''}
</course_content>
`}
            contextMessage="Use AI to automatically identify and extract competencies from this course. The analysis will examine the course description and detailed content to suggest relevant competencies and skills."
            onCompetencyAdded={() => refetch()}
            canManage={canManage}
            iconColor="text-purple-600"
            buttonColor="bg-purple-600 hover:bg-purple-700"
            onAddCompetency={async (competency) => {
              await addCompetencyMutation.mutateAsync({
                courseId: competency.entityId,
                competencyId: competency.competencyId,
                proficiency: competency.proficiency,
                description: competency.description,
                name: competency.name,
                type: competency.type
              })
            }}
            allCompetencies={allCompetencies || []}
            existingCompetencies={course.competencies || []}
          />
        )}

        {/* Course Competencies - Outside of form to prevent form submission conflicts */}
        {allCompetencies && (
          <CourseCompetencyManager
            courseId={id}
            competencies={course.competencies.map(c => ({...c, proficiency: c.proficiency || undefined})) as any}
            allCompetencies={allCompetencies?.map(c => ({...c, description: c.description || undefined})) as any}
            onAdd={handleAddCompetency}
            onRemove={handleRemoveCompetency}
            onUpdateProficiency={handleUpdateProficiency}
            createCompetency={createCompetencyMutation}
            canManage={canManage}
          />
        )}
      </div>
    </AppLayout>
  )
}