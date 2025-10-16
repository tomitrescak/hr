'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { useSession } from 'next-auth/react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AppLayout } from '@/components/layout/app-layout'

const competencySchema = z.object({
  type: z.enum(['KNOWLEDGE', 'SKILL', 'TECH_TOOL', 'ABILITY', 'VALUE', 'BEHAVIOUR', 'ENABLER']),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
})

type CompetencyFormData = z.infer<typeof competencySchema>

interface EditCompetencyPageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditCompetencyPage({ params }: EditCompetencyPageProps) {
  const { id } = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    data: competency,
    isLoading,
  } = trpc.competencies.getById.useQuery({ id })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CompetencyFormData>({
    resolver: zodResolver(competencySchema),
    defaultValues: {
      type: competency?.type,
      name: competency?.name,
      description: competency?.description || '',
    },
  })

  const watchedType = watch('type')

  // Update form when competency data loads
  useEffect(() => {
    if (competency) {
      setValue('type', competency.type)
      setValue('name', competency.name)
      setValue('description', competency.description || '')
    }
  }, [competency, setValue])

  const updateMutation = trpc.competencies.update.useMutation({
    onSuccess: () => {
      router.push(`/competencies/${id}`)
    },
    onError: (error) => {
      alert(error.message || 'Failed to update competency')
    },
  })

  const onSubmit = async (data: CompetencyFormData) => {
    setIsSubmitting(true)
    try {
      await updateMutation.mutateAsync({
        id,
        ...data,
      })
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

  // Check if user has permission to edit
  if (session?.user?.role !== 'PROJECT_MANAGER') {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-600 mt-2">You don&apos;t have permission to edit competencies.</p>
          <Button onClick={() => router.push('/competencies')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Competencies
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!competency) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Competency not found</h2>
          <p className="text-gray-600 mt-2">The competency you&apos;re trying to edit doesn&apos;t exist.</p>
          <Button onClick={() => router.push('/competencies')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Competencies
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/competencies/${id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Competency</h1>
            <p className="text-muted-foreground">
              Update competency information
            </p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Competency Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/competencies/${id}`)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Competency
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}