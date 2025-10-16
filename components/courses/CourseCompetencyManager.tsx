'use client'

import React, { useState, useEffect } from 'react'
import { Plus, X, LayoutGrid, List, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CompetencySelector } from './CompetencySelector'

interface CourseCompetency {
  id: string
  proficiency?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
  competency: {
    id: string
    name: string
    type: 'KNOWLEDGE' | 'SKILL' | 'TECH_TOOL' | 'ABILITY' | 'VALUE' | 'BEHAVIOUR' | 'ENABLER'
    description?: string
  }
}

interface CourseCompetencyManagerProps {
  courseId: string
  competencies: CourseCompetency[]
  allCompetencies?: Array<{
    id: string
    name: string
    type: string
    description?: string
  }>
  onAdd?: (competencyId: string, proficiency?: string) => void
  onRemove?: (competencyId: string) => void
  onUpdateProficiency?: (competencyId: string, proficiency?: string) => void
  createCompetency?: any
  canManage: boolean
  readOnly?: boolean
  onCompetencyClick?: (competencyId: string) => void
}

const competencyTypeColors = {
  KNOWLEDGE: 'bg-blue-100 text-blue-800',
  SKILL: 'bg-green-100 text-green-800',
  TECH_TOOL: 'bg-purple-100 text-purple-800',
  ABILITY: 'bg-orange-100 text-orange-800',
  VALUE: 'bg-pink-100 text-pink-800',
  BEHAVIOUR: 'bg-indigo-100 text-indigo-800',
  ENABLER: 'bg-gray-100 text-gray-800',
}

const proficiencyColors = {
  BEGINNER: 'bg-red-100 text-red-800',
  INTERMEDIATE: 'bg-yellow-100 text-yellow-800',
  ADVANCED: 'bg-blue-100 text-blue-800',
  EXPERT: 'bg-green-100 text-green-800',
}

export function CourseCompetencyManager({
  courseId,
  competencies,
  allCompetencies,
  onAdd,
  onRemove,
  onUpdateProficiency,
  createCompetency,
  canManage,
  readOnly = false,
  onCompetencyClick,
}: CourseCompetencyManagerProps) {
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  const [showAddCompetency, setShowAddCompetency] = useState(false)
  const [editingProficiency, setEditingProficiency] = useState<string | null>(null)

  // Load view preference from cookie
  useEffect(() => {
    const savedView = document.cookie
      .split('; ')
      .find(row => row.startsWith('courseCompetencyView='))
      ?.split('=')[1] as 'card' | 'list'
    
    if (savedView) {
      setViewMode(savedView)
    }
  }, [])

  // Save view preference to cookie
  const handleViewModeChange = (mode: 'card' | 'list') => {
    setViewMode(mode)
    document.cookie = `courseCompetencyView=${mode}; path=/; max-age=${365 * 24 * 60 * 60}` // 1 year
  }

  const handleAddCompetency = async (competencyId: string, proficiency?: string) => {
    if (onAdd) {
      await onAdd(competencyId, proficiency)
    }
    setShowAddCompetency(false)
  }

  const handleUpdateProficiency = async (competencyId: string, proficiency?: string) => {
    if (!onUpdateProficiency) {
      console.warn('onUpdateProficiency handler is not provided')
      return
    }
    try {
      await onUpdateProficiency(competencyId, proficiency)
      setEditingProficiency(null)
    } catch (error) {
      console.error('Error updating proficiency:', error)
      setEditingProficiency(null) // Reset even on error
    }
  }

  const supportsProficiency = (type: string) => 
    ['SKILL', 'TECH_TOOL', 'ABILITY'].includes(type)

  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {competencies.map((courseCompetency) => (
        <Card key={courseCompetency.id} className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {onCompetencyClick ? (
                  <button
                    onClick={() => onCompetencyClick(courseCompetency.competency.id)}
                    className="font-medium hover:underline text-left"
                  >
                    {courseCompetency.competency.name}
                  </button>
                ) : (
                  <h4 className="font-medium">{courseCompetency.competency.name}</h4>
                )}
                <Badge
                  variant="outline"
                  className={`mt-1 ${competencyTypeColors[courseCompetency.competency.type]}`}
                >
                  {courseCompetency.competency.type.replace('_', ' ')}
                </Badge>
              </div>
              {canManage && !readOnly && onRemove && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(courseCompetency.competency.id)}
                  className="text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {courseCompetency.competency.description && (
              <p className="text-sm text-muted-foreground">
                {courseCompetency.competency.description}
              </p>
            )}

            {supportsProficiency(courseCompetency.competency.type) && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Proficiency:</span>
                {!readOnly && editingProficiency === courseCompetency.competency.id && onUpdateProficiency ? (
                  <div className="flex items-center gap-2">
                    <Select
                      value={courseCompetency.proficiency || 'NONE'}
                      onValueChange={(value) => handleUpdateProficiency(courseCompetency.competency.id, value === 'NONE' ? undefined : value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">None</SelectItem>
                        <SelectItem value="BEGINNER">Beginner</SelectItem>
                        <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                        <SelectItem value="ADVANCED">Advanced</SelectItem>
                        <SelectItem value="EXPERT">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingProficiency(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {courseCompetency.proficiency ? (
                      <Badge
                        variant="outline"
                        className={proficiencyColors[courseCompetency.proficiency]}
                      >
                        {courseCompetency.proficiency}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not set</span>
                    )}
                    {canManage && !readOnly && onUpdateProficiency && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingProficiency(courseCompetency.competency.id)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  )

  const renderListView = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Competency</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Proficiency</TableHead>
          {canManage && !readOnly && <TableHead></TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {competencies.map((courseCompetency) => (
          <TableRow key={courseCompetency.id}>
            <TableCell>
              <div>
                {onCompetencyClick ? (
                  <button
                    onClick={() => onCompetencyClick(courseCompetency.competency.id)}
                    className="font-medium hover:underline text-left"
                  >
                    {courseCompetency.competency.name}
                  </button>
                ) : (
                  <div className="font-medium">{courseCompetency.competency.name}</div>
                )}
                {courseCompetency.competency.description && (
                  <div className="text-sm text-muted-foreground max-w-xs truncate">
                    {courseCompetency.competency.description}
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={competencyTypeColors[courseCompetency.competency.type]}
              >
                {courseCompetency.competency.type.replace('_', ' ')}
              </Badge>
            </TableCell>
            <TableCell>
              {supportsProficiency(courseCompetency.competency.type) ? (
                !readOnly && editingProficiency === courseCompetency.competency.id && onUpdateProficiency ? (
                  <div className="flex items-center gap-2">
                    <Select
                      value={courseCompetency.proficiency || 'NONE'}
                      onValueChange={(value) => handleUpdateProficiency(courseCompetency.competency.id, value === 'NONE' ? undefined : value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">None</SelectItem>
                        <SelectItem value="BEGINNER">Beginner</SelectItem>
                        <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                        <SelectItem value="ADVANCED">Advanced</SelectItem>
                        <SelectItem value="EXPERT">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingProficiency(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {courseCompetency.proficiency ? (
                      <Badge
                        variant="outline"
                        className={proficiencyColors[courseCompetency.proficiency]}
                      >
                        {courseCompetency.proficiency}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not set</span>
                    )}
                    {canManage && !readOnly && onUpdateProficiency && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingProficiency(courseCompetency.competency.id)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              )}
            </TableCell>
            {canManage && !readOnly && onRemove && (
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(courseCompetency.competency.id)}
                  className="text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            Course Competencies ({competencies.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === 'card' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleViewModeChange('card')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleViewModeChange('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            
            {canManage && !readOnly && allCompetencies && onAdd && (
              <Dialog open={showAddCompetency} onOpenChange={setShowAddCompetency}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Competency
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add Competency to Course</DialogTitle>
                  </DialogHeader>
                  <CompetencySelector
                    availableCompetencies={allCompetencies as any}
                    existingCompetencies={competencies.map(c => c.competency)}
                    onAdd={handleAddCompetency}
                    onCancel={() => setShowAddCompetency(false)}
                    createCompetency={createCompetency}
                    canCreateCompetency={canManage}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {competencies.length > 0 ? (
          viewMode === 'card' ? renderCardView() : renderListView()
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No competencies associated with this course yet.
          </div>
        )}
      </CardContent>
    </Card>
  )
}