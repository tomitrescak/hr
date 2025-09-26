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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const responsibilitySchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  personId: z.string().optional(),
})

type ResponsibilityFormData = z.infer<typeof responsibilitySchema>

interface EditResponsibilityFormProps {
  responsibility: {
    id: string
    title: string
    description?: string | null
    personId?: string | null
  }
  projectId: string
  onSuccess?: () => void
}

export function EditResponsibilityForm({ responsibility, projectId, onSuccess }: EditResponsibilityFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ResponsibilityFormData>({
    resolver: zodResolver(responsibilitySchema),
  })

  const watchedPersonId = watch('personId')

  const { data: people } = trpc.projects.getPeople.useQuery()

  // Set initial values
  useEffect(() => {
    setValue('title', responsibility.title)
    setValue('description', responsibility.description || '')
    setValue('personId', responsibility.personId || undefined)
  }, [responsibility, setValue])

  const updateMutation = trpc.projects.updateResponsibility.useMutation({
    onSuccess: () => {
      onSuccess?.()
    },
    onError: (error) => {
      alert(error.message || 'Failed to update responsibility')
    },
  })

  const onSubmit = async (data: ResponsibilityFormData) => {
    setIsSubmitting(true)
    try {
      await updateMutation.mutateAsync({
        id: responsibility.id,
        title: data.title,
        description: data.description,
        personId: data.personId || undefined,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Responsibility Title</Label>
        <Input
          id="title"
          placeholder="e.g., Frontend Development Lead"
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
          placeholder="Describe the responsibilities and expectations"
          rows={3}
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Person Assignment */}
      <div className="space-y-2">
        <Label htmlFor="personId">Assign to Person (Optional)</Label>
        <Select
          value={watchedPersonId}
          onValueChange={(value) => setValue('personId', value === 'unassigned' ? undefined : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select person to assign" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {people?.map(person => (
              <SelectItem key={person.id} value={person.id}>
                <div>
                  <div className="font-medium">{person.name}</div>
                  <div className="text-xs text-muted-foreground">{person.email}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.personId && (
          <p className="text-sm text-destructive">{errors.personId.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Update Responsibility
        </Button>
      </div>
    </form>
  )
}