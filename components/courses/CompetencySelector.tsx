'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Competency {
  id: string
  name: string
  type: 'KNOWLEDGE' | 'SKILL' | 'TECH_TOOL' | 'ABILITY' | 'VALUE' | 'BEHAVIOUR' | 'ENABLER'
  description?: string
}

interface CompetencySelectorProps {
  availableCompetencies: Competency[]
  existingCompetencies: Competency[]
  onAdd: (competencyId: string, proficiency?: string) => void
  onCancel: () => void
  createCompetency: any
  canCreateCompetency: boolean
}

export function CompetencySelector({ 
  availableCompetencies, 
  existingCompetencies,
  onAdd, 
  onCancel, 
  createCompetency,
  canCreateCompetency 
}: CompetencySelectorProps) {
  const [selectedType, setSelectedType] = useState('')
  const [selectedCompetencyId, setSelectedCompetencyId] = useState('')
  const [competencySearch, setCompetencySearch] = useState('')
  const [showCompetencyList, setShowCompetencyList] = useState(false)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newCompetencyName, setNewCompetencyName] = useState('')
  const [newCompetencyDescription, setNewCompetencyDescription] = useState('')
  const [proficiency, setProficiency] = useState('')
  
  const competencyTypes = [
    { value: 'KNOWLEDGE', label: 'Knowledge' },
    { value: 'SKILL', label: 'Skill' },
    { value: 'TECH_TOOL', label: 'Tech Tool' },
    { value: 'ABILITY', label: 'Ability' },
    { value: 'VALUE', label: 'Value' },
    { value: 'BEHAVIOUR', label: 'Behaviour' },
    { value: 'ENABLER', label: 'Enabler' },
  ].sort((a, b) => a.label.localeCompare(b.label))
  
  // Filter competencies by type and exclude already assigned ones
  const filteredCompetencies = React.useMemo(() => {
    if (!availableCompetencies || availableCompetencies.length === 0) {
      return []
    }
    
    let filtered = [...availableCompetencies]
    
    // Filter by type if selected
    if (selectedType) {
      filtered = filtered.filter(comp => comp.type === selectedType)
    }
    
    // Exclude already assigned competencies
    filtered = filtered.filter(comp => 
      !existingCompetencies.some(existing => existing.id === comp.id)
    )
    
    // Filter by search term if provided
    if (competencySearch.trim()) {
      const searchLower = competencySearch.toLowerCase()
      filtered = filtered.filter(comp => 
        comp.name.toLowerCase().includes(searchLower) ||
        (comp.description && comp.description.toLowerCase().includes(searchLower))
      )
    }
    
    // Sort alphabetically
    filtered.sort((a, b) => a.name.localeCompare(b.name))
    
    // Limit to 10 if no search term
    if (!competencySearch.trim()) {
      filtered = filtered.slice(0, 10)
    }
    
    return filtered
  }, [availableCompetencies, selectedType, existingCompetencies, competencySearch])
  
  const selectedCompetency = availableCompetencies.find(c => c.id === selectedCompetencyId)
  const supportsProficiency = (selectedCompetency?.type || selectedType) && 
    ['SKILL', 'TECH_TOOL', 'ABILITY'].includes(selectedCompetency?.type || selectedType)
  
  const handleCreateNew = async () => {
    if (!newCompetencyName.trim() || !selectedType) return
    
    try {
      const newCompetency = await createCompetency.mutateAsync({
        type: selectedType as any,
        name: newCompetencyName.trim(),
        description: newCompetencyDescription.trim() || undefined
      })
      
      // Add the newly created competency
      await onAdd(newCompetency.id, supportsProficiency && proficiency ? proficiency : undefined)
      
      // Reset form
      setSelectedType('')
      setSelectedCompetencyId('')
      setProficiency('')
      setNewCompetencyName('')
      setNewCompetencyDescription('')
      setIsCreatingNew(false)
    } catch (error) {
      console.error('Failed to create competency:', error)
    }
  }
  
  const handleSubmit = async () => {
    if (isCreatingNew) {
      await handleCreateNew()
    } else if (selectedCompetencyId) {
      await onAdd(selectedCompetencyId, supportsProficiency && proficiency ? proficiency : undefined)
      // Reset form
      setSelectedType('')
      setSelectedCompetencyId('')
      setProficiency('')
      setCompetencySearch('')
    }
  }
  
  const handleSelectCompetency = (competency: Competency) => {
    setSelectedCompetencyId(competency.id)
    setShowCompetencyList(false)
    setCompetencySearch('') // Clear search when selecting
  }
  
  const canSubmit = isCreatingNew ? 
    (newCompetencyName.trim() && selectedType) : 
    selectedCompetencyId
  
  // Show competency list when type is selected and no competency is chosen
  useEffect(() => {
    if (selectedType && !selectedCompetencyId && !isCreatingNew) {
      setShowCompetencyList(true)
    }
  }, [selectedType, selectedCompetencyId, isCreatingNew])
  
  return (
    <div className="space-y-4">
      {/* Type Selection */}
      <div className="space-y-2">
        <Label>Competency Type</Label>
        <Select value={selectedType} onValueChange={(value) => {
          setSelectedType(value)
          setSelectedCompetencyId('') // Reset competency selection when type changes
          setIsCreatingNew(false)
          setCompetencySearch('')
          // Automatically show the competency list after selecting type
          setTimeout(() => setShowCompetencyList(true), 100)
        }}>
          <SelectTrigger>
            <SelectValue placeholder="Select competency type" />
          </SelectTrigger>
          <SelectContent>
            {competencyTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {selectedType && (
        <div className="space-y-2">
          <Label>Competency</Label>
          {isCreatingNew ? (
            <div className="space-y-3 p-3 border rounded-md bg-muted/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Create New Competency</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setIsCreatingNew(false)
                    setNewCompetencyName('')
                    setNewCompetencyDescription('')
                  }}
                >
                  Cancel
                </Button>
              </div>
              
              <div className="space-y-2">
                <Input
                  placeholder="Competency name"
                  value={newCompetencyName}
                  onChange={(e) => setNewCompetencyName(e.target.value)}
                />
                <Input
                  placeholder="Description (optional)"
                  value={newCompetencyDescription}
                  onChange={(e) => setNewCompetencyDescription(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2 relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search competencies or type to create new..."
                  value={selectedCompetencyId ? selectedCompetency?.name || '' : competencySearch}
                  onChange={(e) => {
                    const value = e.target.value
                    setCompetencySearch(value)
                    if (selectedCompetencyId) {
                      setSelectedCompetencyId('')
                    }
                    setShowCompetencyList(true)
                  }}
                  onFocus={() => {
                    // If a competency is selected, clear it to start searching
                    if (selectedCompetencyId) {
                      setSelectedCompetencyId('')
                      setCompetencySearch('')
                    }
                    setShowCompetencyList(true)
                  }}
                  className="pl-10"
                  readOnly={false}
                />
              </div>
              
              {showCompetencyList && (
                <div className="absolute z-50 w-full">
                  <Card className="max-h-60 overflow-y-auto shadow-lg">
                    <CardContent className="p-2">
                      {filteredCompetencies.length > 0 ? (
                        <div className="space-y-1">
                          {filteredCompetencies.map((competency) => (
                            <div
                              key={competency.id}
                              className="p-2 hover:bg-muted rounded-sm cursor-pointer transition-colors"
                              onClick={() => handleSelectCompetency(competency)}
                            >
                              <div className="flex items-center gap-2">
                                <span className="flex-1 font-medium">{competency.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {competency.type.replace('_', ' ')}
                                </Badge>
                              </div>
                              {competency.description && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                  {competency.description}
                                </p>
                              )}
                            </div>
                          ))}
                          
                          {/* Show create option at the bottom */}
                          {canCreateCompetency && (
                            <div className="border-t pt-2 mt-2">
                              <div
                                className="p-2 hover:bg-muted rounded-sm cursor-pointer flex items-center gap-2 text-sm transition-colors"
                                onClick={() => {
                                  if (competencySearch.trim()) {
                                    setNewCompetencyName(competencySearch.trim())
                                  }
                                  setIsCreatingNew(true)
                                  setShowCompetencyList(false)
                                  setCompetencySearch('')
                                }}
                              >
                                <Plus className="h-4 w-4" />
                                {competencySearch.trim() ? 
                                  `Create &quot;${competencySearch.trim()}&quot;` :
                                  'Create new competency'
                                }
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 text-center">
                          <p className="text-sm text-muted-foreground mb-3">
                            {competencySearch.trim() ? 
                              `No competencies found matching &quot;${competencySearch}&quot;` :
                              'No available competencies of this type'
                            }
                          </p>
                          {canCreateCompetency && competencySearch?.trim() && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setNewCompetencyName(competencySearch.trim())
                                setIsCreatingNew(true)
                                setShowCompetencyList(false)
                                setCompetencySearch('')
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Create &quot;{competencySearch.trim()}&quot;
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {/* Click outside handler */}
              {showCompetencyList && (
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowCompetencyList(false)}
                />
              )}
            </div>
          )}
        </div>
      )}
      
      {supportsProficiency && (selectedCompetencyId || isCreatingNew) && (
        <div className="space-y-2">
          <Label>Proficiency Level</Label>
          <Select value={proficiency || 'NONE'} onValueChange={(value) => setProficiency(value === 'NONE' ? '' : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select proficiency (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">None (optional)</SelectItem>
              <SelectItem value="BEGINNER">Beginner</SelectItem>
              <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
              <SelectItem value="ADVANCED">Advanced</SelectItem>
              <SelectItem value="EXPERT">Expert</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      
      <div className="flex gap-2 pt-4">
        <Button 
          onClick={handleSubmit} 
          disabled={!canSubmit || createCompetency.isPending}
        >
          {createCompetency.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isCreatingNew ? 'Create & Add' : 'Add Competency'}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}