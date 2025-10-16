'use client'

import { useState } from 'react'
import { Edit, Trash2, MoreVertical, Target, Calendar, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EditKeyResultForm } from './EditKeyResultForm'
import { trpc } from '@/lib/trpc/client'
import { useToast } from '@/components/ui/toast'

interface KeyResult {
  id: string
  title: string
  description?: string | null
  progress: number
  target?: string | null
  metric?: string | null
  dueDate?: Date | string | null
  createdAt: Date | string
}

interface KeyResultCardProps {
  keyResult: KeyResult
  canManage?: boolean
  onUpdate?: () => void
}

export function KeyResultCard({ keyResult, canManage = false, onUpdate }: KeyResultCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const { addToast } = useToast()

  const deleteKeyResultMutation = trpc.projects.deleteKeyResult.useMutation({
    onSuccess: () => {
      addToast('success', 'Key Result deleted successfully')
      onUpdate?.()
    },
    onError: (error) => {
      addToast('error', error.message || 'Failed to delete Key Result')
    },
  })

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this Key Result?')) {
      deleteKeyResultMutation.mutate({ id: keyResult.id })
    }
  }

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false)
    onUpdate?.()
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'text-green-600'
    if (progress >= 70) return 'text-blue-600'
    if (progress >= 50) return 'text-yellow-600'
    return 'text-gray-600'
  }

  const getProgressBadgeVariant = (progress: number) => {
    if (progress === 100) return 'default'
    if (progress >= 70) return 'secondary'
    return 'outline'
  }

  const isOverdue = keyResult.dueDate && new Date(keyResult.dueDate) < new Date()

  return (
    <>
      <Card className="transition-shadow hover:shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm line-clamp-2 mb-1">
                {keyResult.title}
              </h4>
              {keyResult.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {keyResult.description}
                </p>
              )}
            </div>
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-2">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                    <Edit className="h-3 w-3 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Progress */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Progress</span>
              </div>
            <Badge 
              variant={getProgressBadgeVariant(keyResult.progress)}
              className="text-xs"
            >
              {keyResult.progress}%
            </Badge>
          </div>
          <Progress 
            value={keyResult.progress} 
            className={`h-2 ${
              keyResult.progress >= 90 ? '[&>div]:bg-green-500' :
              keyResult.progress >= 70 ? '[&>div]:bg-blue-500' :
              keyResult.progress >= 50 ? '[&>div]:bg-yellow-500' :
              '[&>div]:bg-red-400'
            }`}
          />
          </div>

          {/* Metadata */}
          <div className="space-y-1">
            {keyResult.target && (
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Target className="h-3 w-3" />
                <span>Target: {keyResult.target}</span>
              </div>
            )}
            {keyResult.metric && (
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                <span>Metric: {keyResult.metric}</span>
              </div>
            )}
            {keyResult.dueDate && (
              <div className={`flex items-center space-x-2 text-xs ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
                <Calendar className="h-3 w-3" />
                <span>
                  Due: {new Date(keyResult.dueDate).toLocaleDateString()}
                  {isOverdue && ' (Overdue)'}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Key Result</DialogTitle>
          </DialogHeader>
          <EditKeyResultForm
            keyResult={keyResult}
            onSuccess={handleEditSuccess}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}