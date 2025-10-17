'use client'

import React, { useState } from 'react'
import { Brain, CheckCircle, XCircle, Loader2, Sparkles, Edit2, Check, X, Eye, EyeOff, AlertCircle } from 'lucide-react'
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
  id: string
  similar: SimilarCompetency[]
}

interface SimilarCompetency {
  id: string
  name: string
  type: string
  description?: string
  similarity: number
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
  existingCompetencies?: any[] // List of competencies already assigned to this entity
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
  allCompetencies,
  existingCompetencies = []
}: CompetencyExtractorProps) {
  const [extractedCompetencies, setExtractedCompetencies] = useState<(ExtractedCompetency & { reactId: string })[]>([])
  const [competencyStates, setCompetencyStates] = useState<Record<string, {
    proficiency: string
    action: 'pending' | 'adding' | 'added' | 'ignored'
  }>>({})
  const [editingStates, setEditingStates] = useState<Record<string, {
    isEditing: boolean
  }>>({})
  const [similarCompetencies, setSimilarCompetencies] = useState<Record<string, SimilarCompetency[]>>({})
  const [processedSimilarCompetencies, setProcessedSimilarCompetencies] = useState<Record<string, string>>({})
  const [isExtracting, setIsExtracting] = useState(false)
  const [showIgnored, setShowIgnored] = useState(false)

  const markAsUsedMutation = trpc.competencies.markAsUsed.useMutation()

  // Helper function to check if a competency is already added to this entity
  const isCompetencyAlreadyAdded = (competencyId: string): boolean => {
    return existingCompetencies.some(c => c.competencyId === competencyId || c.id === competencyId || (c.competency && c.competency.id === competencyId))
  }

  const extractMutation = trpc.extraction.extractCompetencies.useMutation({
    onSuccess: async (data) => {
      // Use competencies with their database IDs and similar data
      const competenciesWithIds = data.extractedCompetencies.map((comp: ExtractedCompetency, index: number) => ({
        ...comp,
        // Use a unique key for React rendering (different from database ID)
        reactId: `${comp.id}-${index}-${Date.now()}`
      }))
      setExtractedCompetencies(competenciesWithIds)
      
      // Initialize states for each competency using reactId for React state management
      const initialStates = competenciesWithIds.reduce((acc: Record<string, { proficiency: string; action: 'pending' }>, comp) => {
        acc[comp.reactId] = {
          proficiency: comp.suggestedProficiency,
          action: 'pending'
        }
        return acc
      }, {} as Record<string, { proficiency: string; action: 'pending' }>)
      setCompetencyStates(initialStates)
      
      // Initialize editing states
      const initialEditingStates = competenciesWithIds.reduce((acc: Record<string, { isEditing: boolean }>, comp) => {
        acc[comp.reactId] = {
          isEditing: false
        }
        return acc
      }, {} as Record<string, { isEditing: boolean }>)
      setEditingStates(initialEditingStates)
      
      // Set similar competencies from extraction results
      const similarResults: Record<string, SimilarCompetency[]> = {}
      for (const comp of competenciesWithIds) {
        similarResults[comp.reactId] = comp.similar
      }
      setSimilarCompetencies(similarResults)
      
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
    setSimilarCompetencies({})
    setProcessedSimilarCompetencies({})
    extractMutation.mutate({ 
      content, 
      contextMessage, 
      entityName 
    })
  }

  const handleAddCompetency = async (competency: ExtractedCompetency & { reactId: string }) => {
    const state = competencyStates[competency.reactId]
    if (!state || state.action !== 'pending') return

    // Update state to show loading
    setCompetencyStates(prev => ({
      ...prev,
      [competency.reactId]: { ...prev[competency.reactId], action: 'adding' }
    }))

    try {
      // Check if a similar competency was already processed
      const processedSimilarId = processedSimilarCompetencies[competency.reactId]
      if (processedSimilarId) {
        // If already processed, just mark as added without doing anything
        setCompetencyStates(prev => ({
          ...prev,
          [competency.reactId]: { ...prev[competency.reactId], action: 'added' }
        }))
        return
      }
      
      // Competency already has database ID from extraction, check if it's draft
      const fullCompetency = allCompetencies?.find(c => c.id === competency.id)
      if (fullCompetency?.isDraft) {
        // Mark draft competency as used (non-draft)
        try {
          await markAsUsedMutation.mutateAsync({
            id: competency.id,
            name: competency.name,
          })
        } catch (markError) {
          console.error('Failed to mark competency as used:', markError)
          // Continue anyway - the competency exists
        }
      }

      // Add competency to entity with selected proficiency using callback
      await onAddCompetency(competency.id, state.proficiency)

      // Update state to show success
      setCompetencyStates(prev => ({
        ...prev,
        [competency.reactId]: { ...prev[competency.reactId], action: 'added' }
      }))

      onCompetencyAdded()
    } catch (error: any) {
      console.error('Failed to add competency:', error)
      alert(error.message || 'Failed to add competency')
      
      // Reset state back to pending
      setCompetencyStates(prev => ({
        ...prev,
        [competency.reactId]: { ...prev[competency.reactId], action: 'pending' }
      }))
    }
  }

  const handleIgnoreCompetency = (competency: ExtractedCompetency & { reactId: string }) => {
    setCompetencyStates(prev => ({
      ...prev,
      [competency.reactId]: { ...prev[competency.reactId], action: 'ignored' }
    }))
  }

  const updateProficiency = (competencyId: string, proficiency: string) => {
    setCompetencyStates(prev => ({
      ...prev,
      [competencyId]: { ...prev[competencyId], proficiency }
    }))
  }

  const updateCompetency = (reactId: string, field: 'name' | 'type' | 'description', value: string) => {
    setExtractedCompetencies(prev => prev.map(comp => {
      if (comp.reactId === reactId) {
        return { ...comp, [field]: value }
      }
      return comp
    }))
  }

  const toggleEdit = (reactId: string) => {
    setEditingStates(prev => ({
      ...prev,
      [reactId]: {
        ...prev[reactId],
        isEditing: !prev[reactId]?.isEditing
      }
    }))
  }

  const handleAddSimilarCompetency = async (reactId: string, similarCompetencyId: string) => {
    const state = competencyStates[reactId]
    if (!state || state.action !== 'pending') return

    // Update state to show loading
    setCompetencyStates(prev => ({
      ...prev,
      [reactId]: { ...prev[reactId], action: 'adding' }
    }))

    try {
      // First check if the similar competency is draft and mark as used
      const similarCompetency = similarCompetencies[reactId]?.find(s => s.id === similarCompetencyId)
      if (similarCompetency) {
        // Check if it's a draft in allCompetencies
        const fullCompetency = allCompetencies?.find(c => c.id === similarCompetencyId)
        if (fullCompetency?.isDraft) {
          try {
            await markAsUsedMutation.mutateAsync({
              id: similarCompetencyId,
              name: similarCompetency.name,
            })
          } catch (markError) {
            console.error('Failed to mark similar competency as used:', markError)
            // Continue anyway
          }
        }
      }
      
      // Add the similar competency to entity with selected proficiency
      await onAddCompetency(similarCompetencyId, state.proficiency)

      // Mark this similar competency as processed
      setProcessedSimilarCompetencies(prev => ({
        ...prev,
        [reactId]: similarCompetencyId
      }))

      // Update state to show success
      setCompetencyStates(prev => ({
        ...prev,
        [reactId]: { ...prev[reactId], action: 'added' }
      }))

      onCompetencyAdded()
    } catch (error: any) {
      console.error('Failed to add similar competency:', error)
      alert(error.message || 'Failed to add competency')
      
      // Reset state back to pending
      setCompetencyStates(prev => ({
        ...prev,
        [reactId]: { ...prev[reactId], action: 'pending' }
      }))
    }
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
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Extracting and Finding Similarities ...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Re-Extract
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              {extractedCompetencies
                .filter((competency) => {
                  const state = competencyStates[competency.reactId]
                  if (!state) return false
                  // Show all if showIgnored is true, otherwise hide ignored ones
                  return showIgnored || state.action !== 'ignored'
                })
                .map((competency) => {
                const state = competencyStates[competency.reactId]
                const editState = editingStates[competency.reactId]
                if (!state || !editState) return null

                return (
                  <div
                    key={competency.reactId}
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
                                onChange={(e) => updateCompetency(competency.reactId, 'name', e.target.value)}
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
                              onValueChange={(value) => updateCompetency(competency.reactId, 'type', value)}
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
                              onChange={(e) => updateCompetency(competency.reactId, 'description', e.target.value)}
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
                          <div className="flex items-center gap-3 mb-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700">
                                Proficiency Level:
                              </span>
                              {editState.isEditing ? (
                                <Select
                                  value={state.proficiency}
                                  onValueChange={(value) => updateProficiency(competency.reactId, value)}
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

                        {/* Similar Competencies Section */}
                        {(state.action === 'pending' || state.action === 'adding') && 
                         similarCompetencies[competency.reactId] && 
                         similarCompetencies[competency.reactId].length > 0 && 
                         !processedSimilarCompetencies[competency.reactId] && (
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-3">
                              <AlertCircle className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-gray-800">
                                Similar competencies found ({similarCompetencies[competency.reactId].length})
                              </span>
                            </div>
                            <div className="space-y-2">
                              {similarCompetencies[competency.reactId].map((similar) => {
                                const isAlreadyAdded = isCompetencyAlreadyAdded(similar.id)
                                return (
                                  <div 
                                    key={similar.id} 
                                    className={`w-full flex items-start justify-between p-3 border rounded transition-colors ${
                                      isAlreadyAdded 
                                        ? 'border-green-300 bg-green-50' 
                                        : 'border-gray-200 bg-white hover:bg-gray-50'
                                    }`}
                                  >
                                    <div className="flex-1 min-w-0 mr-4">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-sm font-medium ${
                                          isAlreadyAdded ? 'text-green-900' : 'text-gray-900'
                                        }`}>
                                          {similar.name}
                                        </span>
                                        <Badge className={getCompetencyTypeColor(similar.type)} variant="outline">
                                          {similar.type.replace('_', ' ')}
                                        </Badge>
                                        <span className="text-xs text-gray-500">
                                          {Math.round(similar.similarity * 100)}% match
                                        </span>
                                        {isAlreadyAdded && (
                                          <CheckCircle className="h-4 w-4 text-green-600" />
                                        )}
                                      </div>
                                      {similar.description && (
                                        <p className={`text-xs overflow-hidden text-ellipsis ${
                                          isAlreadyAdded ? 'text-green-700' : 'text-gray-600'
                                        }`} style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>
                                          {similar.description}
                                        </p>
                                      )}
                                    </div>
                                    {!isAlreadyAdded && (
                                      <Button
                                        size="sm"
                                        onClick={() => handleAddSimilarCompetency(competency.reactId, similar.id)}
                                        disabled={state.action === 'adding'}
                                        className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
                                      >
                                        Add
                                      </Button>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {state.action === 'added' && (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-700">
                              {processedSimilarCompetencies[competency.reactId] ? (
                                <>Added &quot;{similarCompetencies[competency.reactId]?.find(s => s.id === processedSimilarCompetencies[competency.reactId])?.name || 'competency'}&quot; with {state.proficiency} proficiency</>
                              ) : (
                                <>Added with {state.proficiency} proficiency</>
                              )}
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
                                onClick={() => toggleEdit(competency.reactId)}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Done
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleEdit(competency.reactId)}
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
                {extractedCompetencies.filter(c => competencyStates[c.reactId]?.action === 'added').length} added,{' '}
                {extractedCompetencies.filter(c => competencyStates[c.reactId]?.action === 'ignored').length} ignored,{' '}
                {extractedCompetencies.filter(c => competencyStates[c.reactId]?.action === 'pending').length} pending
                {!showIgnored && extractedCompetencies.filter(c => competencyStates[c.reactId]?.action === 'ignored').length > 0 && (
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