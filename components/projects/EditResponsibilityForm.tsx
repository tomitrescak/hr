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
  capacityAllocation: z.number().int().min(0).max(100).optional(),
})

type ResponsibilityFormData = z.infer<typeof responsibilitySchema>

interface EditResponsibilityFormProps {
  responsibility: {
    id: string
    title: string
    description?: string | null
    personId?: string | null
    capacityAllocation?: number
  }
  projectId: string
  onSuccess?: () => void
}

export function EditResponsibilityForm({ responsibility, projectId, onSuccess }: EditResponsibilityFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedPersonCapacity, setSelectedPersonCapacity] = useState<{
    total: number
    available: number
    current: number
  } | null>(null)

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
  const watchedCapacityAllocation = watch('capacityAllocation')

  const { data: people } = trpc.people.list.useQuery()

  // Set initial values
  useEffect(() => {
    setValue('title', responsibility.title)
    setValue('description', responsibility.description || '')
    setValue('personId', responsibility.personId || undefined)
    setValue('capacityAllocation', responsibility.capacityAllocation || 0)
  }, [responsibility, setValue])

  // Update capacity info when person is selected
  useEffect(() => {
    if (watchedPersonId && people) {
      const selectedPerson = people.find(p => p.id === watchedPersonId)
      if (selectedPerson) {
        const totalCapacity = selectedPerson.capacity || 100
        const currentAllocated = selectedPerson.totalAllocatedCapacity || 0
        // Subtract current allocation from this responsibility
        const currentFromThisAllocation = responsibility.capacityAllocation || 0
        const availableCapacity = Math.max(0, totalCapacity - currentAllocated + currentFromThisAllocation)
        
        setSelectedPersonCapacity({
          total: totalCapacity,
          current: currentAllocated - currentFromThisAllocation,
          available: availableCapacity,
        })
      } else {
        setSelectedPersonCapacity(null)
      }
    } else {
      setSelectedPersonCapacity(null)
    }
  }, [watchedPersonId, people, responsibility.capacityAllocation])

  const updateMutation = trpc.projects.updateAllocation.useMutation({
    onSuccess: () => {
      setSelectedPersonCapacity(null)
      onSuccess?.()
    },
    onError: (error) => {
      alert(error.message || 'Failed to update allocation')
    },
  })

  const onSubmit = async (data: ResponsibilityFormData) => {
    setIsSubmitting(true)
    try {
      // Validate capacity allocation if person is selected
      if (data.personId && data.capacityAllocation && selectedPersonCapacity) {
        if (data.capacityAllocation > selectedPersonCapacity.available) {
          alert(`Cannot allocate ${data.capacityAllocation}%. Only ${selectedPersonCapacity.available}% capacity available.`)
          return
        }
      }
      
      await updateMutation.mutateAsync({
        id: responsibility.id,
        title: data.title,
        description: data.description,
        personId: data.personId || undefined,
        capacityAllocation: data.capacityAllocation,
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
            {people?.map(person => {
              const isOverCapacity = person.isOverCapacity
              const available = Math.max(0, (person.capacity || 100) - (person.totalAllocatedCapacity || 0))
              
              return (
                <SelectItem key={person.id} value={person.id}>
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <div className="font-medium">{person.name}</div>
                      <div className="text-xs text-muted-foreground">{person.email}</div>
                    </div>
                    <div className="text-xs ml-2">
                      <span className={isOverCapacity ? 'text-red-600' : 'text-green-600'}>
                        {available}% available
                      </span>
                    </div>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        {errors.personId && (
          <p className="text-sm text-destructive">{errors.personId.message}</p>
        )}
      </div>

      {/* Capacity Allocation - only show if person is selected */}
      {watchedPersonId && watchedPersonId !== 'unassigned' && selectedPersonCapacity && (
        <div className="space-y-2">
          <Label htmlFor="capacityAllocation">Capacity Allocation (%)</Label>
          <div className="space-y-2">
            <Input
              id="capacityAllocation"
              type="number"
              min="0"
              max={selectedPersonCapacity.available}
              placeholder="e.g., 25"
              {...register('capacityAllocation', { valueAsNumber: true })}
            />
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Capacity:</span>
                <span className="font-medium">{selectedPersonCapacity.total}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Currently Allocated:</span>
                <span className={selectedPersonCapacity.current > selectedPersonCapacity.total ? 'text-red-600 font-medium' : 'font-medium'}>
                  {selectedPersonCapacity.current}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Available:</span>
                <span className={`font-medium ${
                  selectedPersonCapacity.available <= 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {selectedPersonCapacity.available}%
                </span>
              </div>
              {watchedCapacityAllocation && watchedCapacityAllocation > selectedPersonCapacity.available && (
                <div className="text-red-600 text-xs mt-1">
                  ⚠ Allocation exceeds available capacity
                </div>
              )}
            </div>
          </div>
          {errors.capacityAllocation && (
            <p className="text-sm text-destructive">{errors.capacityAllocation.message}</p>
          )}
        </div>
      )}

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