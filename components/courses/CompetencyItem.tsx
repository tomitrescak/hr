'use client'

import React from 'react'
import { CheckCircle, XCircle, Loader2, Edit2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CompetencyEditor } from './CompetencyEditor'
import { Proficiency } from '@prisma/client'

interface CompetencyOption {
  id: string
  name: string
  type: string
  description?: string
  similarity?: number
  suggestedProficiency?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
}

interface ExtractedCompetency {
  name: string
  type: 'KNOWLEDGE' | 'SKILL' | 'TECH_TOOL' | 'ABILITY' | 'VALUE' | 'BEHAVIOUR' | 'ENABLER'
  description: string
  suggestedProficiency: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
  id: string
  similar: CompetencyOption[]
}

interface CompetencyItemProps {
  competency: ExtractedCompetency & { reactId: string }
  state: {
    proficiency: string
    action: 'pending' | 'adding' | 'added' | 'ignored'
  }
  editState: {
    isEditing: boolean
  }
  selectedCompetencyId?: string
  competencyOptions: CompetencyOption[]
  isCompetencyAlreadyAdded: (competencyId: string) => boolean
  onSelectCompetency: (competencyId: string) => void
  onUpdateCompetency: (field: 'name' | 'type' | 'description', value: string) => void
  onUpdateProficiency: (proficiency: Proficiency) => void
  onToggleEdit: () => void
  onAddCompetency: () => void
  onIgnoreCompetency: () => void
  getCompetencyTypeColor: (type: string) => string
  getProficiencyColor: (proficiency: Proficiency) => string
}

function isNewCompetency(id: string) {
  return id.startsWith('+')
}

export function CompetencyItem({
  competency,
  state,
  editState,
  selectedCompetencyId,
  competencyOptions,
  isCompetencyAlreadyAdded,
  onSelectCompetency,
  onUpdateCompetency,
  onUpdateProficiency,
  onToggleEdit,
  onAddCompetency,
  onIgnoreCompetency,
  getCompetencyTypeColor,
  getProficiencyColor
}: CompetencyItemProps) {
  return (
    <div
      className={`border rounded-lg p-4 ${state.action === 'added'
          ? 'bg-green-50 border-green-200'
          : state.action === 'ignored'
            ? 'bg-gray-50 border-gray-200 opacity-75'
            : 'bg-white border-gray-200'
        }`}
    >
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          {/* Competency Options with Radio Buttons */}
          {(state.action === 'pending' || state.action === 'adding') &&
            competencyOptions.length > 0 && (
              <div>
                <div className="space-y-0">
                  {competencyOptions.map((option, index) => {
                    const isSelected = selectedCompetencyId === option.id
                    const isAlreadyAdded = isCompetencyAlreadyAdded(option.id)
                    const isMainCompetency = index === 0

                    return (
                      <div key={option.id}>
                        <div
                          className={`flex items-start gap-3 px-3 py-4 transition-colors ${isAlreadyAdded
                              ? 'bg-green-50'
                              : 'bg-white hover:bg-gray-50'
                            }`}
                        >
                          <div className="flex items-center mt-1">
                            <input
                              type="radio"
                              name={`competency-${competency.reactId}`}
                              value={option.id}
                              checked={isSelected}
                              onChange={() => onSelectCompetency(option.id)}
                              disabled={isAlreadyAdded}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${isAlreadyAdded ? 'text-green-900' : 'text-gray-900'
                                  }`}>
                                  {option.name}
                                </span>
                                <Badge className={getCompetencyTypeColor(option.type)} variant="outline">
                                  {option.type.replace('_', ' ')}
                                </Badge>

                                {isMainCompetency ? (
                                  isNewCompetency(option.id) && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300"
                                    >
                                      New
                                    </Badge>
                                  )
                                ) : (
                                  option.similarity && (
                                    <span className="text-xs text-gray-500">
                                      {Math.round(option.similarity * 100)}% match
                                    </span>
                                  )
                                )}

                                {isAlreadyAdded && (
                                  <span className='flex items-center gap-1 text-green-800 text-xs'><CheckCircle className="h-4 w-4 text-green-600" /> Already Added</span>
                                )}
                              </div>

                              {/* Edit button for new competencies - inline with the competency name */}
                              {isSelected && isMainCompetency && isNewCompetency(option.id) && !isAlreadyAdded && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={onToggleEdit}
                                  className="h-6 px-2 text-xs"
                                >
                                  {editState.isEditing ? (
                                    <>
                                      <Check className="h-3 w-3 mr-1" />
                                      Done
                                    </>
                                  ) : (
                                    <>
                                      <Edit2 className="h-3 w-3 mr-1" />
                                      Edit
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                            {option.description && (
                              <p className={`text-xs overflow-hidden text-ellipsis ${isAlreadyAdded ? 'text-green-700' : 'text-gray-600'
                                }`} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                {option.description}
                              </p>
                            )}

                            {/* Competency Editor - only for main competency if it's new */}
                            {isSelected && isMainCompetency && isNewCompetency(option.id) && (
                              <div className="mt-3">
                                <CompetencyEditor
                                  name={competency.name}
                                  type={competency.type}
                                  description={competency.description}
                                  isEditing={editState.isEditing}
                                  onUpdate={onUpdateCompetency}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Dotted line separator - don't show after the last option */}
                        {index < competencyOptions.length - 1 && (
                          <div className="border-b border-dotted border-gray-300 mx-4"></div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          {/* Proficiency Level and Add Button */}
          {(state.action === 'pending' || state.action === 'adding') && (
            <div className="flex items-center justify-between gap-4 pt-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  Proficiency Level:
                </span>
                <Select
                  value={state.proficiency}
                  onValueChange={onUpdateProficiency}
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
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={onAddCompetency}
                  disabled={state.action === 'adding' || !selectedCompetencyId}
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
                  onClick={onIgnoreCompetency}
                  disabled={state.action === 'adding'}
                >
                  Ignore
                </Button>
              </div>
            </div>
          )}

          {/* Success State */}
          {state.action === 'added' && (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">
                Added &quot;{selectedCompetencyId == competency.id ? competency.name : competencyOptions.find(c => c.id === selectedCompetencyId)?.name}&quot; with {state.proficiency} proficiency
              </span>
            </div>
          )}

          {/* Ignored State */}
          {state.action === 'ignored' && (
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Ignored</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}