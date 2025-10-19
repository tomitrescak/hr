'use client'

import React, { useState } from 'react'
import { Brain, CheckCircle, XCircle, Loader2, Sparkles, Edit2, Check, X, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { trpc, trpcClient } from '@/lib/trpc/client'
import { CompetencyItem } from './CompetencyItem'
import { Competency, CompetencyType, Proficiency } from '@prisma/client'
import { set } from 'zod'

interface CompetencyOption {
  id: string
  name: string
  type: string
  description?: string
  similarity?: number
  suggestedProficiency?: Proficiency
}

interface ExtractedCompetency {
  name: string
  type: 'KNOWLEDGE' | 'SKILL' | 'TECH_TOOL' | 'ABILITY' | 'VALUE' | 'BEHAVIOUR' | 'ENABLER'
  description: string
  suggestedProficiency: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
  id: string
  similar: CompetencyOption[]
}

export type CompetencyHandler = ({
  entityId,
  name,
  competencyId,
  description,
  type,
  proficiency,
}: {
  entityId: string
  name?: string
  competencyId: string
  description?: string
  type?: CompetencyType
  proficiency: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT" | undefined
}) => Promise<void>  // TRPC mutation

interface CompetencyExtractorProps {
  entityId: string
  entityName: string
  content: string
  contextMessage: string
  canManage: boolean
  iconColor: string
  buttonColor: string
  onAddCompetency: CompetencyHandler
  onCompetencyAdded: () => void
  allCompetencies: { id: string, name: string, type: CompetencyType }[] // List of all available competencies
  existingCompetencies?: { competencyId: string, id: string }[] // List of competencies already assigned to this entity
}

function isNewCompetency(id: string) {
  return id.startsWith('+')
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
  allCompetencies,
  existingCompetencies = []
}: CompetencyExtractorProps) {
  const [extractedCompetencies, setExtractedCompetencies] = useState<(ExtractedCompetency & { reactId: string })[]>([])
  const [competencyStates, setCompetencyStates] = useState<Record<string, {
    proficiency: Proficiency
    action: 'pending' | 'adding' | 'added' | 'ignored'
  }>>({})
  const [editingStates, setEditingStates] = useState<Record<string, {
    isEditing: boolean
  }>>({})
  const [similarCompetencies, setSimilarCompetencies] = useState<Record<string, CompetencyOption[]>>({})
  const [processedSimilarCompetencies, setProcessedSimilarCompetencies] = useState<Record<string, string>>({})
  const [selectedCompetencies, setSelectedCompetencies] = useState<Record<string, string>>({})
  const [isExtracting, setIsExtracting] = useState(false)
  const [showIgnored, setShowIgnored] = useState(false)
  const [message, setMessage] = useState<string>('')


  // Helper function to check if a competency is already added to this entity
  const isCompetencyAlreadyAdded = (competencyId: string): boolean => {
    return existingCompetencies.some(c => c.competencyId === competencyId || c.id === competencyId)
  }

  async function extractMutation(value: {
    content: string,
    contextMessage: string,
    entityName: string
  }) {
    let iterable = await trpcClient.extraction.extractCompetencies.mutate({
      ...value,
      excludeCompetencies: existingCompetencies.map(c => ({
        id: c.competencyId,
        name: allCompetencies.find(ac => ac.id === c.competencyId)?.name || '',
        type: allCompetencies.find(ac => ac.id === c.competencyId)?.type || '',
      }))
    });
    for await (const value of iterable) {
      setMessage(value.message);

      // if we finished we see what is going on
      if (value.type === 'result' && 'extractedCompetencies' in value) {
        // Use competencies with their database IDs and similar data
        const competenciesWithIds = value.extractedCompetencies.map((comp: ExtractedCompetency, index: number) => ({
          ...comp,
          // Use a unique key for React rendering (different from database ID)
          reactId: `${comp.id}-${index}-${Date.now()}`
        }))
        setExtractedCompetencies(competenciesWithIds)

        // Initialize states for each competency using reactId for React state management
        const initialStates = competenciesWithIds.reduce((acc: Record<string, { proficiency: Proficiency; action: 'pending' }>, comp) => {
          acc[comp.reactId] = {
            proficiency: comp.suggestedProficiency,
            action: 'pending'
          }
          return acc
        }, {} as Record<string, { proficiency: Proficiency; action: 'pending' }>)
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
        const similarResults: Record<string, CompetencyOption[]> = {}
        const initialSelectedStates: Record<string, string> = {}
        for (const comp of competenciesWithIds) {
          // Create unified competency options - main competency first, then similar ones
          const allOptions: CompetencyOption[] = [
            {
              id: comp.id,
              name: comp.name,
              type: comp.type,
              description: comp.description,
              suggestedProficiency: comp.suggestedProficiency
            },
            ...comp.similar
          ]
          similarResults[comp.reactId] = allOptions
          // Pre-select the first option (main competency) by default
          initialSelectedStates[comp.reactId] = comp.id
        }
        setSimilarCompetencies(similarResults)
        setSelectedCompetencies(initialSelectedStates)

        setIsExtracting(false)
      }

    }
  }


  // Use the passed-in competency mutation directly

  const handleExtract = async () => {
    setIsExtracting(true)
    setExtractedCompetencies([])
    setCompetencyStates({})
    setEditingStates({})
    setSimilarCompetencies({})
    setProcessedSimilarCompetencies({})
    setSelectedCompetencies({})
    extractMutation({
      content,
      contextMessage,
      entityName
    })
  }

  const handleAddCompetency = async (competency: ExtractedCompetency & { reactId: string }) => {
    const state = competencyStates[competency.reactId]
    const selectedCompetencyId = selectedCompetencies[competency.reactId]
    if (!state || state.action !== 'pending' || !selectedCompetencyId) return

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

      if (isNewCompetency(selectedCompetencyId)) {
        // Create new competency first - use the current competency data
        await onAddCompetency({
          entityId: entityId,
          name: competency.name,
          description: competency.description,
          type: competency.type,
          competencyId: selectedCompetencyId, // Indicate new competency creation
          proficiency: state.proficiency,
        })
      } else {
        await onAddCompetency({
          entityId: entityId,
          competencyId: selectedCompetencyId,
          proficiency: state.proficiency,
        })
      }

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

  const updateProficiency = (competencyId: string, proficiency: Proficiency) => {
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

  const handleSelectCompetency = (reactId: string, competencyId: string) => {
    setSelectedCompetencies(prev => ({
      ...prev,
      [reactId]: competencyId
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
                  { message ? message : 'Extracting...' }
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
                    <CompetencyItem
                      key={competency.reactId}
                      competency={competency}
                      state={state}
                      editState={editState}
                      selectedCompetencyId={selectedCompetencies[competency.reactId]}
                      competencyOptions={similarCompetencies[competency.reactId] || []}
                      isCompetencyAlreadyAdded={isCompetencyAlreadyAdded}
                      onSelectCompetency={(competencyId) => handleSelectCompetency(competency.reactId, competencyId)}
                      onUpdateCompetency={(field, value) => updateCompetency(competency.reactId, field, value)}
                      onUpdateProficiency={(proficiency) => updateProficiency(competency.reactId, proficiency)}
                      onToggleEdit={() => toggleEdit(competency.reactId)}
                      onAddCompetency={() => handleAddCompetency(competency)}
                      onIgnoreCompetency={() => handleIgnoreCompetency(competency)}
                      getCompetencyTypeColor={getCompetencyTypeColor}
                      getProficiencyColor={getProficiencyColor}
                    />
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