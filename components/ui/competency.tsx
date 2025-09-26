import * as React from "react"
import { Badge } from "./badge"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { cn } from "@/lib/utils"

interface CompetencyProps {
  id: string
  name: string
  type: 'KNOWLEDGE' | 'SKILL' | 'TECH_TOOL' | 'ABILITY' | 'VALUE' | 'BEHAVIOUR' | 'ENABLER'
  description?: string
  proficiency?: 'BEGINNER' | 'NOVICE' | 'COMPETENT' | 'PROFICIENT' | 'EXPERT'
  lastUpdated?: Date
}

interface CompetencyCardProps {
  competency: CompetencyProps
  showProficiency?: boolean
  onProficiencyChange?: (id: string, newProficiency: CompetencyProps['proficiency']) => void
  className?: string
}

interface CompetencyGridProps {
  competencies: CompetencyProps[]
  groupByType?: boolean
  showProficiency?: boolean
  onProficiencyChange?: (id: string, newProficiency: CompetencyProps['proficiency']) => void
  className?: string
}

const proficiencyLevels = {
  BEGINNER: { level: 1, color: "bg-red-100 text-red-800", label: "Beginner (1)" },
  NOVICE: { level: 2, color: "bg-orange-100 text-orange-800", label: "Novice (2)" },
  COMPETENT: { level: 3, color: "bg-yellow-100 text-yellow-800", label: "Competent (3)" },
  PROFICIENT: { level: 4, color: "bg-blue-100 text-blue-800", label: "Proficient (4)" },
  EXPERT: { level: 5, color: "bg-green-100 text-green-800", label: "Expert (5)" },
}

const typeColors = {
  KNOWLEDGE: "bg-blue-50 text-blue-700",
  SKILL: "bg-green-50 text-green-700",
  TECH_TOOL: "bg-purple-50 text-purple-700",
  ABILITY: "bg-indigo-50 text-indigo-700",
  VALUE: "bg-pink-50 text-pink-700",
  BEHAVIOUR: "bg-orange-50 text-orange-700",
  ENABLER: "bg-gray-50 text-gray-700",
}

function ProficiencyBadge({ proficiency }: { proficiency?: CompetencyProps['proficiency'] }) {
  if (!proficiency) return null
  
  const config = proficiencyLevels[proficiency]
  return (
    <Badge variant="outline" className={config.color}>
      {config.label}
    </Badge>
  )
}

function TypeBadge({ type }: { type: CompetencyProps['type'] }) {
  return (
    <Badge variant="outline" className={typeColors[type]}>
      {type.replace('_', ' ')}
    </Badge>
  )
}

export function CompetencyCard({ 
  competency, 
  showProficiency = true, 
  onProficiencyChange, 
  className 
}: CompetencyCardProps) {
  const showProficiencyForType = showProficiency && 
    ['SKILL', 'TECH_TOOL', 'ABILITY'].includes(competency.type)
  
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium">{competency.name}</CardTitle>
          <div className="flex flex-col gap-1">
            <TypeBadge type={competency.type} />
            {showProficiencyForType && (
              <ProficiencyBadge proficiency={competency.proficiency} />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {competency.description && (
          <p className="text-sm text-muted-foreground mb-2">
            {competency.description}
          </p>
        )}
        {competency.lastUpdated && (
          <p className="text-xs text-muted-foreground">
            Updated: {competency.lastUpdated.toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function CompetencyGrid({ 
  competencies, 
  groupByType = false, 
  showProficiency = true,
  onProficiencyChange,
  className 
}: CompetencyGridProps) {
  if (groupByType) {
    const groupedCompetencies = competencies.reduce((acc, competency) => {
      if (!acc[competency.type]) {
        acc[competency.type] = []
      }
      acc[competency.type].push(competency)
      return acc
    }, {} as Record<string, CompetencyProps[]>)
    
    return (
      <div className={cn("space-y-6", className)}>
        {Object.entries(groupedCompetencies).map(([type, items]) => (
          <div key={type}>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              {type.replace('_', ' ')}
              <Badge variant="secondary">{items.length}</Badge>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((competency) => (
                <CompetencyCard
                  key={competency.id}
                  competency={competency}
                  showProficiency={showProficiency}
                  onProficiencyChange={onProficiencyChange}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }
  
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {competencies.map((competency) => (
        <CompetencyCard
          key={competency.id}
          competency={competency}
          showProficiency={showProficiency}
          onProficiencyChange={onProficiencyChange}
        />
      ))}
    </div>
  )
}