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
  personId: z.string(),
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
    person?: {
      id: string
      name: string
    } | null
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
    defaultValues: {
      title: responsibility.title,
      description: responsibility.description || '',
      personId: responsibility.personId || responsibility.person?.id || 'unassigned',
      capacityAllocation: responsibility.capacityAllocation || 0,
    },
  })

  const watchedPersonId = watch('personId')
  const watchedCapacityAllocation = watch('capacityAllocation')

  const { data: people, refetch: refetchPeople } = trpc.people.list.useQuery()
  
  // Refetch people data when form opens to ensure fresh capacity data
  useEffect(() => {
    refetchPeople()
  }, [])

  // Set initial values when responsibility changes
  useEffect(() => {
    setValue('title', responsibility.title)
    setValue('description', responsibility.description || '')
    // Handle person assignment - use 'unassigned' if no person is assigned
    const personId = responsibility.personId || responsibility.person?.id || 'unassigned'
    setValue('personId', personId)
    setValue('capacityAllocation', responsibility.capacityAllocation || 0)
  }, [responsibility, setValue])

  let selectedPersonCapacity = {
    total: 100,
    available: 100,
    current: 0,
  }

  // Update capacity info when person is selected
  
  if (watchedPersonId && watchedPersonId !== 'unassigned' && people) {
    const selectedPerson = people.find(p => p.id === watchedPersonId)
    if (selectedPerson) {
      const totalCapacity = selectedPerson.capacity || 100
      const currentAllocated = (selectedPerson.totalAllocatedCapacity || 0) + (watchedCapacityAllocation || 0)
      // Subtract current allocation from this responsibility to get available capacity
      const assignedPersonId = responsibility.personId || responsibility.person?.id
      const currentFromThisAllocation = assignedPersonId === selectedPerson.id ? (responsibility.capacityAllocation || 0) : 0
      const currentWithoutThisAllocation = Math.max(0, currentAllocated - currentFromThisAllocation)
      const availableCapacity = Math.max(0, totalCapacity - currentWithoutThisAllocation)
      
      selectedPersonCapacity = ({
        total: totalCapacity,
        current: currentWithoutThisAllocation,
        available: availableCapacity,
      })
    } 
  }

  const updateMutation = trpc.projects.updateAllocation.useMutation({
    onSuccess: () => {
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
      
      await updateMutation.mutateAsync({
        id: responsibility.id,
        title: data.title,
        description: data.description,
        personId: data.personId === 'unassigned' ? undefined : data.personId,
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
          onValueChange={(value) => setValue('personId', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select person to assign" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {people?.map(person => {
              const isOverCapacity = person.isOverCapacity
              const currentAllocated = person.totalAllocatedCapacity || 0
              // Subtract current allocation from this responsibility if it's the same person
              const assignedPersonId = responsibility.personId || responsibility.person?.id
              const currentFromThisAllocation = assignedPersonId === person.id ? (responsibility.capacityAllocation || 0) : 0
              const currentWithoutThisAllocation = Math.max(0, currentAllocated - currentFromThisAllocation)
              const available = Math.max(0, (person.capacity || 100) - currentWithoutThisAllocation)
              
              return (
                <SelectItem key={person.id} value={person.id}>
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <div className="font-medium">{person.name}</div>
                      {/* <div className="text-xs text-muted-foreground">{person.email}</div> */}
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
              placeholder="e.g., 25"
              {...register('capacityAllocation', { valueAsNumber: true })}
            />
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Capacity:</span>
                <span className="font-medium">{selectedPersonCapacity.total}% ({((selectedPersonCapacity.total / 100) * 43).toLocaleString(undefined, { maximumFractionDigits: 1 })}h)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Allocation:</span>
                <span className={selectedPersonCapacity.current > selectedPersonCapacity.total ? 'text-red-600 font-medium' : 'font-medium'}>
                  {(watchedCapacityAllocation || 0)}% ({((watchedCapacityAllocation || 0) / 100 * 43).toLocaleString(undefined, { maximumFractionDigits: 1 })}h)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Allocated:</span>
                <span className={selectedPersonCapacity.current > selectedPersonCapacity.total ? 'text-red-600 font-medium' : 'font-medium'}>
                  {selectedPersonCapacity.current}% ({((selectedPersonCapacity.current / 100) * 43).toLocaleString(undefined, { maximumFractionDigits: 1 })}h)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Available:</span>
                <span className={`font-medium ${
                  selectedPersonCapacity.available <= 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {selectedPersonCapacity.available}% ({((selectedPersonCapacity.available / 100) * 43).toLocaleString(undefined, { maximumFractionDigits: 1 })}h)
                </span>
              </div>
              {selectedPersonCapacity.current > 100 && (
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