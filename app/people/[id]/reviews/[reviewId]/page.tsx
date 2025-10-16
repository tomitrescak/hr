"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { use } from "react"
import Link from "next/link"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { trpc } from "@/lib/trpc/client"
import { ArrowLeft, MessageSquare, Edit, Save, X, Trash2, User } from "lucide-react"
import { useSession } from "next-auth/react"
import { Loader2 as LoaderIcon } from "lucide-react"
import { marked } from "marked"

interface ReviewPageProps {
  params: Promise<{
    id: string
    reviewId: string
  }>
}

export default function ReviewPage({ params }: ReviewPageProps) {
  const { id: personId, reviewId } = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ recordingText: '', notes: '' })

  // Fetch person data
  const { data: person, isLoading: personLoading } = trpc.people.getById.useQuery({ id: personId })
  
  // Fetch reviews to find the specific review
  const { data: reviews, isLoading: reviewsLoading, refetch } = trpc.personReviews.getByPersonId.useQuery({ personId })
  
  // Find the specific review
  const review = reviews?.find(r => r.id === reviewId)

  // Mutations
  const updatePersonReview = trpc.personReviews.update.useMutation()
  const deletePersonReview = trpc.personReviews.delete.useMutation()

  // Check permissions
  const canManage = session?.user?.role === 'PROJECT_MANAGER' || 
    (session?.user?.id && person?.userId === session.user.id)

  // Initialize edit form when review is loaded
  useEffect(() => {
    if (review) {
      setEditForm({
        recordingText: review.recordingText || '',
        notes: review.notes || ''
      })
    }
  }, [review])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    if (review) {
      setEditForm({
        recordingText: review.recordingText || '',
        notes: review.notes || ''
      })
    }
  }

  const handleSaveEdit = async () => {
    if (!review) return

    try {
      await updatePersonReview.mutateAsync({
        id: review.id,
        recordingText: editForm.recordingText,
        notes: editForm.notes,
      })
      
      setIsEditing(false)
      refetch()
      alert('Review updated successfully!')
    } catch (error) {
      console.error('Error updating review:', error)
      alert('Failed to update review. Please try again.')
    }
  }

  const handleDelete = async () => {
    if (!review) return
    
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      return
    }

    try {
      await deletePersonReview.mutateAsync({ id: review.id })
      // Navigate back to person page with reviews tab open
      router.push(`/people/${personId}#reviews`)
      alert('Review deleted successfully!')
    } catch (error) {
      console.error('Error deleting review:', error)
      alert('Failed to delete review. Please try again.')
    }
  }

  const handleBackToPerson = () => {
    router.push(`/people/${personId}#reviews`)
  }

  // Simple markdown to HTML conversion

  if (personLoading || reviewsLoading) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </AppLayout>
    )
  }

  if (!person) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold">Person not found</h1>
          <Link href="/people">
            <Button className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to People
            </Button>
          </Link>
        </div>
      </AppLayout>
    )
  }

  if (!review) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold">Review not found</h1>
          <Button className="mt-4" onClick={handleBackToPerson}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {person.name}
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
            <Button variant="outline" size="icon" onClick={handleBackToPerson}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <MessageSquare className="h-6 w-6" />
                1:1 Review
              </h1>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="text-muted-foreground">{person.name}</span>
                </div>
                <Badge variant="outline">
                  {new Date(review.createdAt).toLocaleDateString()}
                </Badge>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {!isEditing && canManage && (
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Review
              </Button>
            )}
            {canManage && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deletePersonReview.isPending}
              >
                {deletePersonReview.isPending ? (
                  <><LoaderIcon className="h-4 w-4 mr-2 animate-spin" />Deleting...</>
                ) : (
                  <><Trash2 className="h-4 w-4 mr-2" />Delete</>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Review Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">CREATED</Label>
                <p className="text-sm">{new Date(review.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">LAST UPDATED</Label>
                <p className="text-sm">{new Date(review.updatedAt).toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">PERSON</Label>
                <p className="text-sm">{person.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recording Transcription */}
        <Card>
          <CardHeader>
            <CardTitle>Recording Transcription</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={editForm.recordingText}
                onChange={(e) => setEditForm(prev => ({...prev, recordingText: e.target.value}))}
                rows={12}
                placeholder="Transcribed conversation..."
                className="font-mono text-sm"
              />
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg border min-h-48">
                <p className="text-sm font-mono whitespace-pre-wrap">
                  {review.recordingText || 'No transcription available'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Review Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({...prev, notes: e.target.value}))}
                rows={12}
                placeholder="Review notes and key takeaways..."
                className="font-mono text-sm"
              />
            ) : (
              <div className="p-4 bg-white border rounded-lg prose prose-sm max-w-none min-h-32">
                {review.notes ? (
                  <div dangerouslySetInnerHTML={{ __html: marked(review.notes) }} />
                ) : (
                  <p className="text-muted-foreground">No notes available</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Mode Actions */}
        {isEditing && (
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={handleCancelEdit}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updatePersonReview.isPending}
            >
              {updatePersonReview.isPending ? (
                <><LoaderIcon className="h-4 w-4 mr-2 animate-spin" />Saving...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" />Save Changes</>
              )}
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}