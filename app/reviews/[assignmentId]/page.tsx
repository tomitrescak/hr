'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  FileText,
  Calendar,
  FolderKanban,
  BookOpen,
  User,
  CheckSquare,
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Minus,
  Target,
  TrendingUp,
  MessageSquare
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'

const reviewSchema = z.object({
  status: z.enum(['FINISHED', 'IN_PROGRESS', 'STALLED']),
  reflection: z.string().min(10, 'Reflection must be at least 10 characters'),
  positives: z.array(z.string().min(1)).min(1, 'At least one positive point is required'),
  negatives: z.array(z.string().min(1)).optional(),
  competencyDeltas: z.array(z.object({
    competencyId: z.string(),
    newProficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
  })).optional(),
})

type ReviewFormData = z.infer<typeof reviewSchema>

// Helper function to get Monday of current week
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

// Helper function to get week range display
function getWeekRange(mondayDate: Date): string {
  const friday = new Date(mondayDate)
  friday.setDate(friday.getDate() + 4)
  return `${mondayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${friday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

export default function ReviewPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()
  
  const weekParam = searchParams.get('week')
  const weekStartDate = weekParam ? getMondayOfWeek(new Date(weekParam)) : getMondayOfWeek(new Date())

  const [positiveItems, setPositiveItems] = useState<string[]>([''])
  const [negativeItems, setNegativeItems] = useState<string[]>([''])

  // Redirect if not authenticated
  if (status === 'loading') {
    return <div className="p-6">Loading...</div>
  }

  if (!session) {
    router.push('/auth/signin')
    return <div className="p-6">Redirecting...</div>
  }

  // Fetch assignment and existing review
  const { data: reviewData, isLoading, refetch } = trpc.reviews.getByAssignmentAndWeek.useQuery({
    assignmentId,
    weekStartDate,
  })

  // Fetch available competencies for review
  const { data: competencies } = trpc.reviews.getAvailableCompetencies.useQuery({
    personId: session.user.id,
  })

  const assignment = reviewData?.assignment
  const existingReview = reviewData?.review

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      status: 'IN_PROGRESS',
      reflection: '',
      positives: [''],
      negatives: [''],
      competencyDeltas: [],
    }
  })

  const watchedStatus = watch('status')

  // Load existing review data
  useEffect(() => {
    if (existingReview) {
      reset({
        status: existingReview.status as any,
        reflection: existingReview.reflection,
        positives: existingReview.positives.length > 0 ? existingReview.positives : [''],
        negatives: existingReview.negatives.length > 0 ? existingReview.negatives : [''],
        competencyDeltas: existingReview.competencyDeltas.map(delta => ({
          competencyId: delta.competencyId,
          newProficiency: delta.newProficiency as any,
        })) || [],
      })
      setPositiveItems(existingReview.positives.length > 0 ? existingReview.positives : [''])
      setNegativeItems(existingReview.negatives.length > 0 ? existingReview.negatives : [''])
    }
  }, [existingReview, reset])

  // Create/Update review mutation
  const createReviewMutation = trpc.reviews.createOrUpdate.useMutation({
    onSuccess: () => {
      addToast('success', existingReview ? 'Review updated successfully' : 'Review created successfully')
      refetch()
    },
    onError: (error) => {
      addToast('error', error.message || 'Failed to save review')
    },
  })

  // Approve review mutation (PM only)
  const approveReviewMutation = trpc.reviews.approve.useMutation({
    onSuccess: () => {
      addToast('success', 'Review approved successfully')
      refetch()
    },
    onError: (error) => {
      addToast('error', error.message || 'Failed to approve review')
    },
  })

  // Handle form submission
  const onSubmit = async (data: ReviewFormData) => {
    const filteredPositives = data.positives.filter(item => item.trim().length > 0)
    const filteredNegatives = data.negatives?.filter(item => item.trim().length > 0) || []

    try {
      await createReviewMutation.mutateAsync({
        assignmentId,
        weekStartDate,
        status: data.status,
        reflection: data.reflection,
        positives: filteredPositives,
        negatives: filteredNegatives,
        competencyDeltas: data.competencyDeltas,
      })
    } catch (error) {
      // Error handled by mutation onError
    }
  }

  // Handle approval
  const handleApprove = async () => {
    if (!existingReview) return

    try {
      await approveReviewMutation.mutateAsync({
        id: existingReview.id,
        comment: '', // Could add a comment field if needed
      })
    } catch (error) {
      // Error handled by mutation onError
    }
  }

  // Dynamic list management
  const addPositiveItem = () => {
    setPositiveItems(prev => [...prev, ''])
  }

  const removePositiveItem = (index: number) => {
    setPositiveItems(prev => prev.filter((_, i) => i !== index))
  }

  const updatePositiveItem = (index: number, value: string) => {
    setPositiveItems(prev => prev.map((item, i) => i === index ? value : item))
    setValue('positives', positiveItems.map((item, i) => i === index ? value : item))
  }

  const addNegativeItem = () => {
    setNegativeItems(prev => [...prev, ''])
  }

  const removeNegativeItem = (index: number) => {
    setNegativeItems(prev => prev.filter((_, i) => i !== index))
  }

  const updateNegativeItem = (index: number, value: string) => {
    setNegativeItems(prev => prev.map((item, i) => i === index ? value : item))
    setValue('negatives', negativeItems.map((item, i) => i === index ? value : item))
  }

  // Check permissions
  const canEdit = assignment && (
    session.user.role === 'PROJECT_MANAGER' || 
    assignment.person.userId === session.user.id
  )

  const canApprove = session.user.role === 'PROJECT_MANAGER' && existingReview && !existingReview.approvedAt

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

  if (!assignment) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Assignment not found</h2>
          <p className="text-gray-600 mt-2">The assignment you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/reviews')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reviews
          </Button>
        </div>
      </div>
    )
  }

  if (!canEdit) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-600 mt-2">You don't have permission to view this review.</p>
          <Button onClick={() => router.push('/reviews')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reviews
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/reviews')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Weekly Review</h1>
            <p className="text-muted-foreground">
              {assignment.project?.name || assignment.course?.name} • Week of {getWeekRange(weekStartDate)}
            </p>
          </div>
        </div>

        {canApprove && (
          <Button onClick={handleApprove} disabled={approveReviewMutation.isPending}>
            {approveReviewMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <CheckSquare className="h-4 w-4 mr-2" />
            Approve Review
          </Button>
        )}
      </div>

      {/* Assignment Info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              assignment.type === 'PROJECT' ? 'bg-blue-100' : 'bg-green-100'
            }`}>
              {assignment.type === 'PROJECT' ? (
                <FolderKanban className="h-6 w-6 text-blue-600" />
              ) : (
                <BookOpen className="h-6 w-6 text-green-600" />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-semibold">
                  {assignment.project?.name || assignment.course?.name}
                </h2>
                <Badge variant="outline">
                  {assignment.type === 'PROJECT' ? 'Project' : 'Course'}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {assignment.project?.description || assignment.course?.description}
              </p>
              <div className="text-sm text-muted-foreground mt-2">
                Assignment: {new Date(assignment.startDate).toLocaleDateString()} - {new Date(assignment.plannedEndDate).toLocaleDateString()}
              </div>
            </div>

            {existingReview && (
              <div className="text-right">
                <Badge variant={existingReview.status === 'FINISHED' ? 'default' : 
                              existingReview.status === 'IN_PROGRESS' ? 'secondary' : 'destructive'}>
                  {existingReview.status.toLowerCase().replace('_', ' ')}
                </Badge>
                <div className="text-sm text-muted-foreground mt-1">
                  {existingReview.approvedAt ? (
                    <span className="text-green-600">Approved</span>
                  ) : (
                    <span className="text-yellow-600">Pending approval</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Review Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={watchedStatus} 
              onValueChange={(value) => setValue('status', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FINISHED">Finished - Completed all planned work</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress - Work is ongoing</SelectItem>
                <SelectItem value="STALLED">Stalled - Blocked or delayed</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-sm text-destructive mt-1">{errors.status.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Competency Updates */}
        {competencies && competencies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Competency Updates</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Update your proficiency levels based on what you learned this week
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {competencies.map((competency) => {
                  const currentProficiency = competency.personCompetencies[0]?.proficiency
                  return (
                    <div key={competency.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{competency.name}</h4>
                          <Badge variant="secondary">{competency.type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{competency.description}</p>
                        <div className="text-xs text-muted-foreground mt-1">
                          Current: {currentProficiency || 'Not set'}
                        </div>
                      </div>
                      
                      <div className="w-48">
                        <Select 
                          onValueChange={(value) => {
                            const currentDeltas = watch('competencyDeltas') || []
                            const existingIndex = currentDeltas.findIndex(d => d.competencyId === competency.id)
                            
                            if (value === 'no-change') {
                              // Remove from deltas if exists
                              if (existingIndex !== -1) {
                                const newDeltas = currentDeltas.filter((_, i) => i !== existingIndex)
                                setValue('competencyDeltas', newDeltas)
                              }
                            } else {
                              // Add or update delta
                              const newDelta = {
                                competencyId: competency.id,
                                newProficiency: value as any,
                              }
                              
                              if (existingIndex !== -1) {
                                const newDeltas = [...currentDeltas]
                                newDeltas[existingIndex] = newDelta
                                setValue('competencyDeltas', newDeltas)
                              } else {
                                setValue('competencyDeltas', [...currentDeltas, newDelta])
                              }
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="No change" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no-change">No change</SelectItem>
                            <SelectItem value="BEGINNER">Beginner</SelectItem>
                            <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                            <SelectItem value="ADVANCED">Advanced</SelectItem>
                            <SelectItem value="EXPERT">Expert</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reflection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Reflection</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Reflect on your work this week, challenges faced, and lessons learned
            </p>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Describe your experience this week, what you accomplished, challenges you faced, and what you learned..."
              rows={6}
              {...register('reflection')}
            />
            {errors.reflection && (
              <p className="text-sm text-destructive mt-1">{errors.reflection.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Positives */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span>Positives</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              What went well this week?
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {positiveItems.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    placeholder={`Positive point ${index + 1}...`}
                    value={item}
                    onChange={(e) => updatePositiveItem(index, e.target.value)}
                  />
                  {positiveItems.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removePositiveItem(index)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPositiveItem}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Positive
              </Button>
            </div>
            {errors.positives && (
              <p className="text-sm text-destructive mt-1">{errors.positives.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Negatives/Improvements */}
        <Card>
          <CardHeader>
            <CardTitle>Areas for Improvement</CardTitle>
            <p className="text-sm text-muted-foreground">
              What could be improved or what challenges did you face?
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {negativeItems.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    placeholder={`Improvement area ${index + 1}...`}
                    value={item}
                    onChange={(e) => updateNegativeItem(index, e.target.value)}
                  />
                  {negativeItems.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeNegativeItem(index)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addNegativeItem}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Improvement Area
              </Button>
            </div>
            {errors.negatives && (
              <p className="text-sm text-destructive mt-1">{errors.negatives.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.push('/reviews')}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createReviewMutation.isPending}
          >
            {createReviewMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            {existingReview ? 'Update Review' : 'Submit Review'}
          </Button>
        </div>
      </form>

      {/* Approval Section for PMs */}
      {existingReview?.approvedAt && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Review Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This review was approved on {new Date(existingReview.approvedAt).toLocaleDateString()}
              {existingReview.approvedBy && ` by ${existingReview.approvedBy.name}`}
            </p>
            {existingReview.comment && (
              <div className="mt-2 p-3 bg-green-50 rounded-lg">
                <p className="text-sm">{existingReview.comment}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}