'use client'

import React, { useState } from 'react'
import { Brain, CheckCircle, XCircle, Loader2, Sparkles, Edit2, Check, X, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/lib/trpc/client'

interface ExtractedCompetency {
  name: string
  type: 'KNOWLEDGE' | 'SKILL' | 'TECH_TOOL' | 'ABILITY' | 'VALUE' | 'BEHAVIOUR' | 'ENABLER'
  description: string
  suggestedProficiency: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
}

interface CompetencyExtractorProps {
  entityId: string
  entityName: string
  content: string
  contextMessage: string
  onCompetencyAdded: () => void
  canManage: boolean
  iconColor: string
  buttonColor: string
  // Callback functions for entity-specific operations
  onAddCompetency: (competencyId: string, proficiency?: string) => Promise<void>
  createCompetency: any // TRPC mutation
  allCompetencies: any[] // List of all available competencies
}

export function CompetencyExtractor({ 
  entityId, 
  entityName, 
  content, 
  contextMessage, 
  onCompetencyAdded, 
  canManage, 
  iconColor, 
  buttonColor, 
  onAddCompetency, 
  createCompetency, 
  allCompetencies 
}: CompetencyExtractorProps) {
  const [extractedCompetencies, setExtractedCompetencies] = useState<ExtractedCompetency[]>([])
  const [competencyStates, setCompetencyStates] = useState<Record<string, {
    proficiency: string
    action: 'pending' | 'adding' | 'added' | 'ignored'
  }>>({})
  const [editingStates, setEditingStates] = useState<Record<string, {
    isEditing: boolean
  }>>({})
  const [isExtracting, setIsExtracting] = useState(false)
  const [showIgnored, setShowIgnored] = useState(false)

  const extractMutation = trpc.extraction.extractCompetencies.useMutation({
    onSuccess: (data) => {
      setExtractedCompetencies(data.extractedCompetencies)
      // Initialize states for each competency
      const initialStates = data.extractedCompetencies.reduce((acc: Record<string, { proficiency: string; action: 'pending' }>, comp: ExtractedCompetency) => {
        acc[comp.name] = {
          proficiency: comp.suggestedProficiency,
          action: 'pending'
        }
        return acc
      }, {} as Record<string, { proficiency: string; action: 'pending' }>)
      setCompetencyStates(initialStates)
      
      // Initialize editing states
      const initialEditingStates = data.extractedCompetencies.reduce((acc: Record<string, { isEditing: boolean }>, comp: ExtractedCompetency) => {
        acc[comp.name] = {
          isEditing: false
        }
        return acc
      }, {} as Record<string, { isEditing: boolean }>)
      setEditingStates(initialEditingStates)
      setIsExtracting(false)
    },
    onError: (error) => {
      alert(error.message || 'Failed to extract competencies')
      setIsExtracting(false)
    },
  })

  // Use the passed-in competency mutation directly

  const handleExtract = async () => {
    setIsExtracting(true)
    setExtractedCompetencies([])
    setCompetencyStates({})
    setEditingStates({})
    extractMutation.mutate({ 
      content, 
      contextMessage, 
      entityName 
    })
  }

  const handleAddCompetency = async (competency: ExtractedCompetency) => {
    const state = competencyStates[competency.name]
    if (!state || state.action !== 'pending') return

    // Update state to show loading
    setCompetencyStates(prev => ({
      ...prev,
      [competency.name]: { ...prev[competency.name], action: 'adding' }
    }))

    try {
      // First, check if competency already exists
      let competencyId: string | null = null
      
      if (allCompetencies) {
        const existingCompetency = allCompetencies.find(
          c => c.name.toLowerCase() === competency.name.toLowerCase() && c.type === competency.type
        )
        
        if (existingCompetency) {
          competencyId = existingCompetency.id
        }
      }
      
      // If not found, create it
      if (!competencyId) {
        try {
          const newCompetency = await createCompetency.mutateAsync({
            name: competency.name,
            type: competency.type,
            description: competency.description,
          })
          competencyId = newCompetency.id
        } catch (createError: any) {
          if (createError.message?.includes('already exists')) {
            throw new Error(`Competency "${competency.name}" already exists but couldn't be found. Please refresh and try again.`)
          }
          throw createError
        }
      }

      if (competencyId) {
        // Add competency to entity with selected proficiency using callback
        await onAddCompetency(competencyId, state.proficiency)

        // Update state to show success
        setCompetencyStates(prev => ({
          ...prev,
          [competency.name]: { ...prev[competency.name], action: 'added' }
        }))

        onCompetencyAdded()
      }
    } catch (error: any) {
      console.error('Failed to add competency:', error)
      alert(error.message || 'Failed to add competency')
      
      // Reset state back to pending
      setCompetencyStates(prev => ({
        ...prev,
        [competency.name]: { ...prev[competency.name], action: 'pending' }
      }))
    }
  }

  const handleIgnoreCompetency = (competency: ExtractedCompetency) => {
    setCompetencyStates(prev => ({
      ...prev,
      [competency.name]: { ...prev[competency.name], action: 'ignored' }
    }))
  }

  const updateProficiency = (competencyName: string, proficiency: string) => {
    setCompetencyStates(prev => ({
      ...prev,
      [competencyName]: { ...prev[competencyName], proficiency }
    }))
  }

  const updateCompetency = (oldName: string, field: 'name' | 'type' | 'description', value: string) => {
    setExtractedCompetencies(prev => prev.map(comp => {
      if (comp.name === oldName) {
        const updated = { ...comp, [field]: value }
        
        // If name changed, update the states with new key
        if (field === 'name' && value !== oldName) {
          setCompetencyStates(prevStates => {
            const { [oldName]: oldState, ...rest } = prevStates
            return { ...rest, [value]: oldState }
          })
          setEditingStates(prevEditStates => {
            const { [oldName]: oldEditState, ...rest } = prevEditStates
            return { ...rest, [value]: oldEditState }
          })
        }
        
        return updated
      }
      return comp
    }))
  }

  const toggleEdit = (competencyName: string) => {
    setEditingStates(prev => ({
      ...prev,
      [competencyName]: {
        ...prev[competencyName],
        isEditing: !prev[competencyName]?.isEditing
      }
    }))
  }

  const getCompetencyTypeColor = (type: string) => {
    const colors = {
      KNOWLEDGE: 'bg-blue-100 text-blue-800',
      SKILL: 'bg-green-100 text-green-800',
      TECH_TOOL: 'bg-purple-100 text-purple-800',
      ABILITY: 'bg-orange-100 text-orange-800',
      VALUE: 'bg-pink-100 text-pink-800',
      BEHAVIOUR: 'bg-teal-100 text-teal-800',
      ENABLER: 'bg-gray-100 text-gray-800',
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getProficiencyColor = (proficiency: string) => {
    const colors = {
      BEGINNER: 'bg-yellow-100 text-yellow-800',
      INTERMEDIATE: 'bg-orange-100 text-orange-800',
      ADVANCED: 'bg-red-100 text-red-800',
      EXPERT: 'bg-purple-100 text-purple-800',
    }
    return colors[proficiency as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (!canManage) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className={`h-5 w-5 ${iconColor}`} />
          AI Competency Extraction
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {extractedCompetencies.length === 0 ? (
          <div className="text-center py-6">
            <Sparkles className={`h-12 w-12 ${iconColor.replace('text-', 'text-').replace('-600', '-400')} mx-auto mb-4`} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Extract Competencies with AI
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {contextMessage}
            </p>
            <Button
              onClick={handleExtract}
              disabled={isExtracting}
              className={`${buttonColor} text-white`}
            >
              {isExtracting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Extract Competencies
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">
                Extracted Competencies for {entityName} ({extractedCompetencies.length})
              </h4>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowIgnored(!showIgnored)}
                  className={showIgnored ? 'bg-gray-100' : ''}
                >
                  {showIgnored ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Hide Ignored
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Show Ignored
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExtract}
                  disabled={isExtracting}
                >
                  {isExtracting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Brain className="h-4 w-4 mr-2" />
                  )}
                  Re-extract
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              {extractedCompetencies
                .filter((competency) => {
                  const state = competencyStates[competency.name]
                  if (!state) return false
                  // Show all if showIgnored is true, otherwise hide ignored ones
                  return showIgnored || state.action !== 'ignored'
                })
                .map((competency) => {
                const state = competencyStates[competency.name]
                const editState = editingStates[competency.name]
                if (!state || !editState) return null

                return (
                  <div
                    key={competency.name}
                    className={`border rounded-lg p-4 ${
                      state.action === 'added' 
                        ? 'bg-green-50 border-green-200' 
                        : state.action === 'ignored'
                        ? 'bg-gray-50 border-gray-200 opacity-75'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {editState.isEditing ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={competency.name}
                                onChange={(e) => updateCompetency(competency.name, 'name', e.target.value)}
                                className="text-base font-medium"
                                placeholder="Competency name"
                              />
                            </div>
                          ) : (
                            <h5 className="font-medium text-gray-900 truncate">
                              {competency.name}
                            </h5>
                          )}
                          
                          {editState.isEditing ? (
                            <Select
                              value={competency.type}
                              onValueChange={(value) => updateCompetency(competency.name, 'type', value)}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="KNOWLEDGE">Knowledge</SelectItem>
                                <SelectItem value="SKILL">Skill</SelectItem>
                                <SelectItem value="TECH_TOOL">Tech Tool</SelectItem>
                                <SelectItem value="ABILITY">Ability</SelectItem>
                                <SelectItem value="VALUE">Value</SelectItem>
                                <SelectItem value="BEHAVIOUR">Behaviour</SelectItem>
                                <SelectItem value="ENABLER">Enabler</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge className={getCompetencyTypeColor(competency.type)}>
                              {competency.type.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                        
                        {editState.isEditing ? (
                          <div className="mb-3">
                            <Textarea
                              value={competency.description}
                              onChange={(e) => updateCompetency(competency.name, 'description', e.target.value)}
                              className="text-sm"
                              rows={2}
                              placeholder="Competency description"
                            />
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600 mb-3">
                            {competency.description}
                          </p>
                        )}
                        
                        {(state.action === 'pending' || state.action === 'adding') && (
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700">
                                Proficiency Level:
                              </span>
                              {editState.isEditing ? (
                                <Select
                                  value={state.proficiency}
                                  onValueChange={(value) => updateProficiency(competency.name, value)}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="BEGINNER">Beginner</SelectItem>
                                    <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                                    <SelectItem value="ADVANCED">Advanced</SelectItem>
                                    <SelectItem value="EXPERT">Expert</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge className={getProficiencyColor(state.proficiency)}>
                                  {state.proficiency}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {state.action === 'added' && (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-700">
                              Added with {state.proficiency} proficiency
                            </span>
                          </div>
                        )}

                        {state.action === 'ignored' && (
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">Ignored</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {(state.action === 'pending' || state.action === 'adding') && (
                          <>
                            {editState.isEditing ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleEdit(competency.name)}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Done
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleEdit(competency.name)}
                              >
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleAddCompetency(competency)}
                              disabled={state.action === 'adding'}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              {state.action === 'adding' ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Add'
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleIgnoreCompetency(competency)}
                              disabled={state.action === 'adding'}
                            >
                              Ignore
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-gray-600">
                {extractedCompetencies.filter(c => competencyStates[c.name]?.action === 'added').length} added,{' '}
                {extractedCompetencies.filter(c => competencyStates[c.name]?.action === 'ignored').length} ignored,{' '}
                {extractedCompetencies.filter(c => competencyStates[c.name]?.action === 'pending').length} pending
                {!showIgnored && extractedCompetencies.filter(c => competencyStates[c.name]?.action === 'ignored').length > 0 && (
                  <span className="ml-2 text-gray-500">(ignored hidden)</span>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}