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
  Save
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { AppLayout } from '@/components/layout/app-layout'
import { CourseCompetencyManager } from '@/components/courses/CourseCompetencyManager'
import { CompetencyExtractor } from '@/components/courses/CompetencyExtractor'

const courseSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  content: z.string().optional(),
  duration: z.string().transform(val => val ? parseInt(val, 10) : undefined).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
})

type CourseFormData = {
  name: string
  description?: string
  content?: string
  duration?: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
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

  const {
    data: course,
    isLoading,
    refetch,
  } = trpc.courses.getById.useQuery({ id })

  const { data: allCompetencies } = trpc.competencies.list.useQuery()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: '',
      description: '',
      content: '',
      duration: '',
      status: 'DRAFT' as const,
    },
  })

  // Update form when course data loads
  useEffect(() => {
    if (course) {
      reset({
        name: course.name,
        description: course.description || '',
        content: course.content || '',
        duration: course.duration?.toString() || '',
        status: course.status,
      })
    }
  }, [course, reset])

  const updateMutation = trpc.courses.update.useMutation({
    onSuccess: () => {
      refetch()
    },
    onError: (error) => {
      alert(error.message || 'Failed to update course')
    },
  })

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

  const onSubmit = async (data: CourseFormData) => {
    try {
      await updateMutationWithRedirect.mutateAsync({
        id,
        name: data.name,
        description: data.description,
        content: data.content,
        duration: data.duration ? parseInt(data.duration, 10) : undefined,
        status: data.status,
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label htmlFor="status">Status *</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRAFT">Draft</SelectItem>
                          <SelectItem value="PUBLISHED">Published</SelectItem>
                          <SelectItem value="ARCHIVED">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.status && (
                    <p className="text-sm text-destructive">{errors.status.message}</p>
                  )}
                </div>
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

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter course description"
                  rows={3}
                  {...register('description')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Course Content</Label>
                <Textarea
                  id="content"
                  placeholder="Enter detailed course content"
                  rows={6}
                  {...register('content')}
                />
              </div>
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
            onAddCompetency={async (competencyId: string, proficiency?: string) => {
              await addCompetencyMutation.mutateAsync({
                courseId: id,
                competencyId,
                proficiency: proficiency as any,
              })
            }}
            createCompetency={createCompetencyMutation}
            allCompetencies={allCompetencies || []}
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