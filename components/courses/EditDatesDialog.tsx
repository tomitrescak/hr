"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CourseEnrollment } from "./CourseCard"
import { Calendar, Save, X } from "lucide-react"

interface EditDatesDialogProps {
  enrollment: CourseEnrollment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (courseId: string, data: { startedAt?: string; completedAt?: string; progress?: number }) => void
  isLoading?: boolean
}

export function EditDatesDialog({
  enrollment,
  open,
  onOpenChange,
  onSave,
  isLoading = false
}: EditDatesDialogProps) {
  const [startedAt, setStartedAt] = useState("")
  const [completedAt, setCompletedAt] = useState("")
  const [progress, setProgress] = useState<number>(0)

  React.useEffect(() => {
    if (enrollment) {
      setStartedAt(
        enrollment.startedAt
          ? new Date(enrollment.startedAt).toISOString().split('T')[0]
          : ""
      )
      setCompletedAt(
        enrollment.completedAt
          ? new Date(enrollment.completedAt).toISOString().split('T')[0]
          : ""
      )
      setProgress(enrollment.progress || 0)
    }
  }, [enrollment])

  const handleSave = () => {
    if (!enrollment) return

    const data: { startedAt?: string; completedAt?: string; progress?: number } = {}
    
    // Only include dates if they have values
    if (startedAt && startedAt.trim()) {
      data.startedAt = startedAt
    }
    
    if (completedAt && completedAt.trim()) {
      data.completedAt = completedAt
    }

    // Include progress
    data.progress = progress

    onSave(enrollment.courseId, data)
  }

  const handleClose = () => {
    onOpenChange(false)
    setStartedAt("")
    setCompletedAt("")
    setProgress(0)
  }

  if (!enrollment) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Edit Course Dates
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Course Info */}
          <div className="p-3 bg-muted rounded-lg">
            <h4 className="font-medium">{enrollment.course.name}</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Status: {enrollment.status.replace("_", " ")}
            </p>
          </div>

          {/* Start Date */}
          {(enrollment.status === "IN_PROGRESS" || enrollment.status === "COMPLETED") && (
            <div className="space-y-2">
              <Label htmlFor="startedAt">Start Date</Label>
              <Input
                id="startedAt"
                type="date"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
              />
            </div>
          )}

          {/* Progress */}
          {(enrollment.status === "IN_PROGRESS" || enrollment.status === "COMPLETED") && (
            <div className="space-y-2">
              <Label htmlFor="progress">Progress ({progress}%)</Label>
              <div className="space-y-2">
                <Input
                  id="progress"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          )}

          {/* Completion Date */}
          {enrollment.status === "COMPLETED" && (
            <div className="space-y-2">
              <Label htmlFor="completedAt">Completion Date</Label>
              <Input
                id="completedAt"
                type="date"
                value={completedAt}
                onChange={(e) => setCompletedAt(e.target.value)}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}