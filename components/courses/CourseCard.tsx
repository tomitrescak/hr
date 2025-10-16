"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Settings, GripVertical } from "lucide-react"
import Link from "next/link"
import { CSS } from "@dnd-kit/utilities"
import { useSortable } from "@dnd-kit/sortable"

export interface CourseEnrollment {
  id: string
  courseId: string
  personId: string
  status: "WISHLIST" | "IN_PROGRESS" | "COMPLETED"
  progress?: number
  completed: boolean
  enrolledAt: Date
  startedAt?: Date
  completedAt?: Date
  course: {
    id: string
    name: string
    description?: string
    duration?: number
    status: string
    competencies?: Array<{
      competency: {
        id: string
        name: string
        type: string
      }
    }>
  }
}

interface CourseCardProps {
  enrollment: CourseEnrollment
  isDragging?: boolean
  onEditDates?: (enrollment: CourseEnrollment) => void
}

export function CourseCard({ enrollment, isDragging = false, onEditDates }: CourseCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: enrollment.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const statusColors = {
    WISHLIST: "bg-gray-50 border-gray-200",
    IN_PROGRESS: "bg-blue-50 border-blue-200",
    COMPLETED: "bg-green-50 border-green-200",
  }

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "Not set"
    return new Date(date).toLocaleDateString()
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`${statusColors[enrollment.status]} ${
        isDragging ? "opacity-50 rotate-2 shadow-lg" : "hover:shadow-md"
      } transition-all duration-200 cursor-pointer`}
      {...attributes}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <div
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-white/50"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              <Link href={`/courses/${enrollment.course.id}`} className="hover:text-blue-600">
                {enrollment.course.name}
              </Link>
            </CardTitle>
            {enrollment.course.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {enrollment.course.description}
              </CardDescription>
            )}
          </div>
          {onEditDates && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onEditDates(enrollment)
              }}
              className="ml-2"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={
            enrollment.status === "COMPLETED" ? "bg-green-100 text-green-800" :
            enrollment.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-800" :
            "bg-gray-100 text-gray-800"
          }>
            {enrollment.status.replace("_", " ")}
          </Badge>
          
          {enrollment.course.duration && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {enrollment.course.duration}h
            </div>
          )}
        </div>

        {/* Progress Bar for In-Progress courses */}
        {enrollment.status === "IN_PROGRESS" && enrollment.progress !== undefined && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Progress</span>
              <span>{enrollment.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${enrollment.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="space-y-1 text-xs text-muted-foreground">
          {enrollment.status === "IN_PROGRESS" && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Started: {formatDate(enrollment.startedAt)}
            </div>
          )}
          {enrollment.status === "COMPLETED" && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Completed: {formatDate(enrollment.completedAt)}
            </div>
          )}
          {enrollment.status === "WISHLIST" && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Added: {formatDate(enrollment.enrolledAt)}
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  )
}