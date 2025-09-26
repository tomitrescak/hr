'use client'

import { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  FileText,
  Calendar,
  FolderKanban,
  BookOpen,
  CheckSquare,
  AlertCircle,
  User,
  Edit,
  Plus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Helper function to get Monday of current week
function getCurrentWeekMonday(): Date {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(today.setDate(diff))
}

// Helper function to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// Helper function to add days to date
function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// Helper function to get week range display
function getWeekRange(mondayDate: Date): string {
  const friday = addDays(mondayDate, 4)
  return `${mondayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${friday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

export default function ReviewsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeekMonday())

  // Redirect if not authenticated
  if (status === 'loading') {
    return <div className="p-6">Loading...</div>
  }

  if (!session) {
    router.push('/auth/signin')
    return <div className="p-6">Redirecting...</div>
  }

  // Calculate date ranges
  const weekStart = addDays(currentWeek, -28) // Show 4 weeks back
  const weekEnd = addDays(currentWeek, 14) // Show 2 weeks forward

  // Fetch user's assignments
  const { data: assignments, isLoading } = trpc.assignments.listForPerson.useQuery({
    personId: session.user.id,
    startDate: weekStart,
    endDate: weekEnd,
  })

  // Fetch user's reviews
  const { data: reviews, isLoading: reviewsLoading } = trpc.reviews.listForPerson.useQuery({
    personId: session.user.id,
    startDate: weekStart,
    endDate: weekEnd,
  })

  // For PMs, also fetch reviews for approval
  const { data: reviewsForApproval } = trpc.reviews.listForApproval.useQuery(
    { approvedOnly: false },
    { enabled: session.user.role === 'PROJECT_MANAGER' }
  )

  // Navigate weeks
  const goToPreviousWeek = () => {
    setCurrentWeek(prev => addDays(prev, -7))
  }

  const goToNextWeek = () => {
    setCurrentWeek(prev => addDays(prev, 7))
  }

  const goToCurrentWeek = () => {
    setCurrentWeek(getCurrentWeekMonday())
  }

  // Generate weekly review opportunities
  const reviewOpportunities = useMemo(() => {
    if (!assignments) return []

    const opportunities: Array<{
      assignmentId: string
      assignment: typeof assignments[0]
      weekStartDate: Date
      hasReview: boolean
      review?: typeof reviews[0]
    }> = []

    assignments.forEach(assignment => {
      const assignmentStart = new Date(assignment.startDate)
      const assignmentEnd = new Date(assignment.plannedEndDate)

      // Generate weeks within assignment period
      for (let weekDate = new Date(weekStart); weekDate <= weekEnd; weekDate = addDays(weekDate, 7)) {
        const weekEndDate = addDays(weekDate, 6)
        
        // Check if this week overlaps with assignment
        if (assignmentStart <= weekEndDate && assignmentEnd >= weekDate) {
          const mondayDate = new Date(weekDate)
          
          // Check if there's already a review for this week
          const existingReview = reviews?.find(review => 
            review.assignmentId === assignment.id && 
            new Date(review.weekStartDate).getTime() === mondayDate.getTime()
          )

          opportunities.push({
            assignmentId: assignment.id,
            assignment,
            weekStartDate: mondayDate,
            hasReview: !!existingReview,
            review: existingReview,
          })
        }
      }
    })

    return opportunities.sort((a, b) => b.weekStartDate.getTime() - a.weekStartDate.getTime())
  }, [assignments, reviews, weekStart, weekEnd])

  if (isLoading || reviewsLoading) {
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Weekly Reviews
          </h1>
          <p className="text-muted-foreground">
            Submit weekly reviews for your assignments and track competency progress
          </p>
        </div>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous Week
            </Button>
            
            <div className="text-center">
              <div className="text-lg font-semibold">
                Week of {getWeekRange(currentWeek)}
              </div>
              <Button variant="ghost" size="sm" onClick={goToCurrentWeek}>
                Go to Current Week
              </Button>
            </div>
            
            <Button variant="outline" onClick={goToNextWeek}>
              Next Week
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="my-reviews" className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-reviews">My Reviews</TabsTrigger>
          {session.user.role === 'PROJECT_MANAGER' && (
            <TabsTrigger value="approval">For Approval</TabsTrigger>
          )}
        </TabsList>

        {/* My Reviews Tab */}
        <TabsContent value="my-reviews" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assignment Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              {reviewOpportunities.length > 0 ? (
                <div className="space-y-4">
                  {reviewOpportunities.map((opportunity, index) => (
                    <div key={`${opportunity.assignmentId}-${opportunity.weekStartDate.getTime()}`} 
                         className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        {/* Assignment Type Icon */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          opportunity.assignment.type === 'PROJECT' ? 'bg-blue-100' : 'bg-green-100'
                        }`}>
                          {opportunity.assignment.type === 'PROJECT' ? (
                            <FolderKanban className={`h-5 w-5 ${
                              opportunity.assignment.type === 'PROJECT' ? 'text-blue-600' : 'text-green-600'
                            }`} />
                          ) : (
                            <BookOpen className={`h-5 w-5 ${
                              opportunity.assignment.type === 'PROJECT' ? 'text-blue-600' : 'text-green-600'
                            }`} />
                          )}
                        </div>

                        {/* Assignment Details */}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">
                              {opportunity.assignment.project?.name || opportunity.assignment.course?.name}
                            </h3>
                            <Badge variant="outline">
                              {opportunity.assignment.type === 'PROJECT' ? 'Project' : 'Course'}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Week of {getWeekRange(opportunity.weekStartDate)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Assignment: {new Date(opportunity.assignment.startDate).toLocaleDateString()} - {new Date(opportunity.assignment.plannedEndDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {/* Review Status & Action */}
                      <div className="flex items-center space-x-3">
                        {opportunity.hasReview ? (
                          <div className="text-right">
                            <div className="flex items-center space-x-2">
                              <CheckSquare className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-green-600">Submitted</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {opportunity.review?.approvedAt ? 'Approved' : 'Pending approval'}
                            </div>
                            <Badge variant={opportunity.review?.status === 'FINISHED' ? 'default' : 
                                          opportunity.review?.status === 'IN_PROGRESS' ? 'secondary' : 'destructive'}>
                              {opportunity.review?.status?.toLowerCase().replace('_', ' ')}
                            </Badge>
                          </div>
                        ) : (
                          <div className="text-right">
                            <div className="flex items-center space-x-2">
                              <AlertCircle className="h-4 w-4 text-yellow-600" />
                              <span className="text-sm font-medium text-yellow-600">Pending</span>
                            </div>
                            <div className="text-xs text-muted-foreground">Review needed</div>
                          </div>
                        )}
                        
                        <Link 
                          href={`/reviews/${opportunity.assignmentId}?week=${formatDate(opportunity.weekStartDate)}`}
                        >
                          <Button size="sm" variant={opportunity.hasReview ? "outline" : "default"}>
                            {opportunity.hasReview ? (
                              <>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-2" />
                                Create
                              </>
                            )}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No review opportunities</h3>
                  <p>You don't have any assignments that require reviews in this time period.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* For Approval Tab (PM only) */}
        {session.user.role === 'PROJECT_MANAGER' && (
          <TabsContent value="approval" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Reviews Pending Approval</CardTitle>
              </CardHeader>
              <CardContent>
                {reviewsForApproval && reviewsForApproval.length > 0 ? (
                  <div className="space-y-4">
                    {reviewsForApproval.filter(review => !review.approvedAt).map((review) => (
                      <div key={review.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-orange-600" />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium">{review.assignment.person.name}</h3>
                              <Badge variant="outline">
                                {review.assignment.type === 'PROJECT' ? 'Project' : 'Course'}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {review.assignment.project?.name || review.assignment.course?.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Week of {getWeekRange(new Date(review.weekStartDate))} • 
                              Submitted {new Date(review.submittedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <Badge variant={review.status === 'FINISHED' ? 'default' : 
                                        review.status === 'IN_PROGRESS' ? 'secondary' : 'destructive'}>
                            {review.status?.toLowerCase().replace('_', ' ')}
                          </Badge>
                          
                          <Link href={`/reviews/${review.assignmentId}?week=${formatDate(new Date(review.weekStartDate))}`}>
                            <Button size="sm">
                              <Edit className="h-4 w-4 mr-2" />
                              Review
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckSquare className="h-12 w-12 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                    <p>No reviews are currently pending approval.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}