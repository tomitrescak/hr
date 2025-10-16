"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { CourseCard, CourseEnrollment } from "./CourseCard"
import { EditDatesDialog } from "./EditDatesDialog"
import { Plus, Search, Loader2 } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"

// Droppable area component for each column
function DroppableArea({ id, children }: { id: string; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  })

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[200px] p-1 rounded-lg transition-colors ${
        isOver ? "bg-blue-50 border-2 border-dashed border-blue-300" : ""
      }`}
    >
      {children}
    </div>
  )
}

interface DevelopmentPlanProps {
  personId: string
  canManage?: boolean
}

const statusLabels = {
  COMPLETED: "Completed Courses",
  IN_PROGRESS: "In-Progress Courses", 
  WISHLIST: "Wishlist"
}

const statusDescriptions = {
  COMPLETED: "Courses that have been finished",
  IN_PROGRESS: "Currently taking these courses",
  WISHLIST: "Courses planned for the future"
}

export function DevelopmentPlan({ personId, canManage = false }: DevelopmentPlanProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draggedEnrollment, setDraggedEnrollment] = useState<CourseEnrollment | null>(null)
  const [editingEnrollment, setEditingEnrollment] = useState<CourseEnrollment | null>(null)
  const [editDatesOpen, setEditDatesOpen] = useState(false)
  const [addCourseOpen, setAddCourseOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Queries
  const { data: developmentPlan, refetch } = trpc.courses.getDevelopmentPlan.useQuery({
    personId
  })
  
  const { data: availableCourses } = trpc.courses.list.useQuery({
    search: searchTerm
  })

  // Mutations
  const updateEnrollmentStatus = trpc.courses.updateEnrollmentStatus.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const updateEnrollmentDates = trpc.courses.updateEnrollmentDates.useMutation({
    onSuccess: () => {
      refetch()
      setEditDatesOpen(false)
      setEditingEnrollment(null)
    },
  })

  const addToWishlist = trpc.courses.addToWishlist.useMutation({
    onSuccess: () => {
      refetch()
      setAddCourseOpen(false)
      setSearchTerm("")
    },
  })

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)
    
    // Find the dragged enrollment
    const allEnrollments = [
      ...(developmentPlan?.wishlist || []),
      ...(developmentPlan?.inProgress || []),
      ...(developmentPlan?.completed || [])
    ]
    const enrollment = allEnrollments.find(e => e.id === active.id)
    setDraggedEnrollment(enrollment as any)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setDraggedEnrollment(null)

    if (!over || !canManage) return

    const activeId = active.id as string
    const overId = over.id as string

    // Find the enrollment being moved
    const allEnrollments = [
      ...(developmentPlan?.wishlist || []),
      ...(developmentPlan?.inProgress || []),
      ...(developmentPlan?.completed || [])
    ]
    const enrollment = allEnrollments.find(e => e.id === activeId)
    
    if (!enrollment) return

    // Determine target status based on drop zone
    let targetStatus: "WISHLIST" | "IN_PROGRESS" | "COMPLETED"
    if (overId.includes("completed")) {
      targetStatus = "COMPLETED"
    } else if (overId.includes("inProgress")) {
      targetStatus = "IN_PROGRESS"
    } else if (overId.includes("wishlist")) {
      targetStatus = "WISHLIST"
    } else {
      // If dropped on another card, determine status by which list it belongs to
      if ((developmentPlan?.completed || []).some(e => e.id === overId)) {
        targetStatus = "COMPLETED"
      } else if ((developmentPlan?.inProgress || []).some(e => e.id === overId)) {
        targetStatus = "IN_PROGRESS"
      } else {
        targetStatus = "WISHLIST"
      }
    }

    // Only update if status changed
    if (enrollment.status !== targetStatus) {
      updateEnrollmentStatus.mutate({
        courseId: enrollment.courseId,
        personId,
        status: targetStatus
      })
    }
  }

  const handleEditDates = (enrollment: CourseEnrollment) => {
    setEditingEnrollment(enrollment)
    setEditDatesOpen(true)
  }

  const handleSaveDates = (courseId: string, data: { startedAt?: string; completedAt?: string; progress?: number }) => {
    updateEnrollmentDates.mutate({
      courseId,
      personId,
      ...data
    })
  }

  const handleAddCourse = (courseId: string) => {
    addToWishlist.mutate({
      courseId,
      personId
    })
  }

  // Filter available courses to exclude already enrolled ones
  const filteredAvailableCourses = React.useMemo(() => {
    if (!availableCourses || !developmentPlan) return []
    
    const enrolledCourseIds = new Set([
      ...(developmentPlan.wishlist || []).map(e => e.courseId),
      ...(developmentPlan.inProgress || []).map(e => e.courseId),
      ...(developmentPlan.completed || []).map(e => e.courseId)
    ])

    return availableCourses.filter(course => !enrolledCourseIds.has(course.id))
  }, [availableCourses, developmentPlan])

  if (!developmentPlan) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  // Column order: wishlist -> in-progress -> completed
  const columns: Array<{
    key: keyof typeof developmentPlan
    status: "WISHLIST" | "IN_PROGRESS" | "COMPLETED"
  }> = [
    { key: "wishlist", status: "WISHLIST" },
    { key: "inProgress", status: "IN_PROGRESS" },
    { key: "completed", status: "COMPLETED" }
  ]

  return (
    <div className="space-y-6">
      {/* Header with Add Course button */}
      {canManage && (
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Development Plan</h2>
            <p className="text-sm text-muted-foreground">Drag courses between columns to update their status</p>
          </div>
          
          <Dialog open={addCourseOpen} onOpenChange={setAddCourseOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Course
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Course to Development Plan</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search for courses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Course List */}
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredAvailableCourses.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchTerm ? "No courses found matching your search" : "No available courses"}
                    </div>
                  ) : (
                    filteredAvailableCourses.map((course) => (
                      <div key={course.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                        <div>
                          <h4 className="font-medium">{course.name}</h4>
                          {course.description && (
                            <p className="text-sm text-muted-foreground mt-1">{course.description}</p>
                          )}
                          {course.duration && (
                            <p className="text-xs text-muted-foreground mt-1">{course.duration} hours</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddCourse(course.id)}
                          disabled={addToWishlist.isPending}
                        >
                          {addToWishlist.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Development Plan Columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {columns.map(({ key, status }) => (
            <Card key={key} className="h-fit">
              <CardHeader>
                <CardTitle className="text-base">{statusLabels[status]}</CardTitle>
                <CardDescription>{statusDescriptions[status]}</CardDescription>
              </CardHeader>
              
              <CardContent>
                <DroppableArea id={`${key}-dropzone`}>
                  <SortableContext
                    items={developmentPlan[key]?.map(e => e.id) || []}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {developmentPlan[key]?.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          {status === "WISHLIST" && "No courses in wishlist"}
                          {status === "IN_PROGRESS" && "No courses in progress"}
                          {status === "COMPLETED" && "No completed courses"}
                        </div>
                      ) : (
                        developmentPlan[key]?.map((enrollment) => (
                          <CourseCard
                            key={enrollment.id}
                            enrollment={enrollment as any}
                            isDragging={activeId === enrollment.id}
                            onEditDates={canManage ? handleEditDates : undefined}
                          />
                        ))
                      )}
                    </div>
                  </SortableContext>
                </DroppableArea>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedEnrollment ? (
            <CourseCard
              enrollment={draggedEnrollment}
              isDragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Edit Dates Dialog */}
      <EditDatesDialog
        enrollment={editingEnrollment}
        open={editDatesOpen}
        onOpenChange={setEditDatesOpen}
        onSave={handleSaveDates}
        isLoading={updateEnrollmentDates.isPending}
      />
    </div>
  )
}