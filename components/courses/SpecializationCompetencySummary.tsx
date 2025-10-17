'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  ChevronDown, 
  ChevronRight, 
  Target, 
  BookOpen,
  TrendingUp,
  Users,
  Award
} from 'lucide-react'

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

interface SpecializationCompetency {
  id: string
  name: string
  type: string
  description?: string
  highestProficiency?: string | null
  occurrenceCount: number
  courseNames: string[]
  proficiencies: string[]
}

interface SpecializationCompetencySummaryProps {
  specializationData: {
    specializationName: string
    totalCourses: number
    totalUniqueCompetencies: number
    competenciesByType: Record<string, any[]>
    allCompetencies: any[]
  }
  onCompetencyClick?: (competencyId: string) => void
}

export function SpecializationCompetencySummary({ 
  specializationData, 
  onCompetencyClick 
}: SpecializationCompetencySummaryProps) {
  const router = useRouter()
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  const toggleSection = (type: string) => {
    setOpenSections(prev => ({
      ...prev,
      [type]: !prev[type]
    }))
  }

  const handleCompetencyClick = (competencyId: string) => {
    if (onCompetencyClick) {
      onCompetencyClick(competencyId)
    } else {
      router.push(`/competencies/${competencyId}`)
    }
  }

  const sortedTypes = Object.keys(specializationData.competenciesByType).sort()
  
  const getTypePriority = (type: string) => {
    const priorities = {
      'SKILL': 1,
      'TECH_TOOL': 2,
      'KNOWLEDGE': 3,
      'ABILITY': 4,
      'BEHAVIOUR': 5,
      'VALUE': 6,
      'ENABLER': 7,
    }
    return priorities[type as keyof typeof priorities] || 999
  }

  const prioritizedTypes = sortedTypes.sort((a, b) => getTypePriority(a) - getTypePriority(b))

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Courses</p>
                <p className="text-2xl font-bold">{specializationData.totalCourses}</p>
              </div>
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unique Competencies</p>
                <p className="text-2xl font-bold">{specializationData.totalUniqueCompetencies}</p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Competency Types</p>
                <p className="text-2xl font-bold">{prioritizedTypes.length}</p>
              </div>
              <Award className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Competencies by Type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Competencies Summary
          </CardTitle>
          <CardDescription>
            Unique competencies developed across all {specializationData.totalCourses} courses in this specialization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="by-type" className="space-y-4">
            <TabsList>
              <TabsTrigger value="by-type">By Type</TabsTrigger>
              <TabsTrigger value="all">All Competencies</TabsTrigger>
            </TabsList>

            <TabsContent value="by-type" className="space-y-4">
              {prioritizedTypes.map((type) => {
                const competencies = specializationData.competenciesByType[type]
                const isOpen = openSections[type] ?? true // Default to open
                
                return (
                  <Card key={type} className="border-l-4 border-l-blue-500">
                    <Collapsible
                      open={isOpen}
                      onOpenChange={() => toggleSection(type)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <Badge 
                                variant="secondary" 
                                className={competencyTypeColors[type as keyof typeof competencyTypeColors]}
                              >
                                {type.replace('_', ' ')}
                              </Badge>
                              <span className="text-lg font-semibold">
                                {competencies.length} competenc{competencies.length === 1 ? 'y' : 'ies'}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Click to {isOpen ? 'collapse' : 'expand'}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="grid gap-3">
                            {competencies.map((competency) => (
                              <div
                                key={competency.id}
                                className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <button
                                      onClick={() => handleCompetencyClick(competency.id)}
                                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                                    >
                                      {competency.name}
                                    </button>
                                    {competency.description && (
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {competency.description}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                      {competency.highestProficiency && (
                                        <Badge 
                                          variant="outline"
                                          className={`text-xs ${proficiencyColors[competency.highestProficiency as keyof typeof proficiencyColors]}`}
                                        >
                                          {competency.highestProficiency}
                                        </Badge>
                                      )}
                                      <span className="text-xs text-muted-foreground">
                                        Found in {competency.occurrenceCount} course{competency.occurrenceCount === 1 ? '' : 's'}
                                      </span>
                                    </div>
                                    {competency.courseNames.length > 0 && (
                                      <div className="mt-2">
                                        <p className="text-xs text-muted-foreground mb-1">Courses:</p>
                                        <div className="flex flex-wrap gap-1">
                                          {competency.courseNames.map((courseName: string, index: number) => (
                                            <Badge key={index} variant="outline" className="text-xs">
                                              {courseName}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                )
              })}
            </TabsContent>

            <TabsContent value="all" className="space-y-3">
              <div className="grid gap-3">
                {specializationData.allCompetencies.map((competency) => (
                  <div
                    key={competency.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${competencyTypeColors[competency.type as keyof typeof competencyTypeColors]}`}
                      >
                        {competency.type.replace('_', ' ')}
                      </Badge>
                      <button
                        onClick={() => handleCompetencyClick(competency.id)}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {competency.name}
                      </button>
                      {competency.highestProficiency && (
                        <Badge 
                          variant="outline"
                          className={`text-xs ${proficiencyColors[competency.highestProficiency as keyof typeof proficiencyColors]}`}
                        >
                          {competency.highestProficiency}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {competency.occurrenceCount} course{competency.occurrenceCount === 1 ? '' : 's'}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}