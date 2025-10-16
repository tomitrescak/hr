'use client'

import { useState } from 'react'
import { Search, Filter, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const competencyTypeColors = {
  KNOWLEDGE: 'bg-blue-100 text-blue-800',
  SKILL: 'bg-green-100 text-green-800',
  TECH_TOOL: 'bg-purple-100 text-purple-800',
  ABILITY: 'bg-orange-100 text-orange-800',
  VALUE: 'bg-pink-100 text-pink-800',
  BEHAVIOUR: 'bg-indigo-100 text-indigo-800',
  ENABLER: 'bg-gray-100 text-gray-800',
}

interface CompetencySearchProps {
  competencies: Array<{
    id: string
    name: string
    type: string
    description?: string | null
  }>
  selectedCompetencies: Array<{
    id: string
    name: string
    type: string
  }>
  onAddCompetency: (competency: { id: string; name: string; type: string }) => void
  onRemoveCompetency: (competencyId: string) => void
  placeholder?: string
  title?: string
  subtitle?: string
}

export function CompetencySearch({
  competencies,
  selectedCompetencies,
  onAddCompetency,
  onRemoveCompetency,
  placeholder = "Search for competencies to add...",
  title = "Search by Skills",
  subtitle = "Search for competencies and add them to find matches"
}: CompetencySearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // Filter competencies for search (exclude already selected ones)
  const searchableCompetencies = competencies.filter((competency) => {
    const matchesSearch = searchTerm === '' || competency.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'all' || competency.type === typeFilter
    const notSelected = !selectedCompetencies.some(selected => selected.id === competency.id)
    return matchesSearch && matchesType && notSelected
  })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <p className="text-muted-foreground mb-4">
          {subtitle}
        </p>
      </div>
      
      {/* Type Filter */}
      <div className="flex items-center gap-4">
        <label htmlFor="type-filter" className="text-sm font-medium">
          Filter by type:
        </label>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="KNOWLEDGE">Knowledge</SelectItem>
            <SelectItem value="SKILL">Skill</SelectItem>
            <SelectItem value="TECH_TOOL">Tech Tool</SelectItem>
            <SelectItem value="ABILITY">Ability</SelectItem>
            <SelectItem value="VALUE">Value</SelectItem>
            <SelectItem value="BEHAVIOUR">Behaviour</SelectItem>
            <SelectItem value="ENABLER">Enabler</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Search for competencies - Combined Input and Results */}
      <div className="relative">
        <div className="border rounded-md bg-background shadow-sm">
          {/* Search Input */}
          <div className="relative border-b">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-b-none"
            />
          </div>
          
          {/* Search Results */}
          {searchableCompetencies.length > 0 && (
            <div className="max-h-48 overflow-y-auto">
              <div className="p-1">
                {searchableCompetencies.slice(0, 10).map((competency, index) => (
                  <button
                    key={competency.id}
                    onClick={() => onAddCompetency({
                      id: competency.id,
                      name: competency.name,
                      type: competency.type
                    })}
                    className={`w-full text-left p-2 hover:bg-muted rounded flex items-center justify-between transition-colors ${
                      index === 0 ? 'rounded-t-none' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{competency.name}</span>
                      {competency.description && (
                        <p className="text-sm text-muted-foreground truncate pr-2">{competency.description}</p>
                      )}
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={`${competencyTypeColors[competency.type as keyof typeof competencyTypeColors]} flex-shrink-0`}
                    >
                      {competency.type.replace('_', ' ')}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* No results message */}
          {searchableCompetencies.length === 0 && searchTerm && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No competencies found matching &quot;{searchTerm}&quot;
              {typeFilter !== 'all' && (
                <span> in {typeFilter.replace('_', ' ').toLowerCase()} category</span>
              )}
            </div>
          )}
          
          {/* Empty state when no search term */}
          {searchableCompetencies.length === 0 && !searchTerm && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              {typeFilter === 'all' 
                ? 'All competencies are already selected or no competencies available'
                : `No ${typeFilter.replace('_', ' ').toLowerCase()} competencies available to add`
              }
            </div>
          )}
        </div>
      </div>
      
      {/* Selected competencies */}
      {selectedCompetencies.length > 0 && (
        <div>
          <h3 className="font-medium mb-2">Selected Skills ({selectedCompetencies.length})</h3>
          <div className="flex flex-wrap gap-2">
            {selectedCompetencies.map((competency) => (
              <Badge
                key={competency.id}
                variant="secondary"
                className="flex items-center gap-1 px-3 py-1"
              >
                {competency.name}
                <button
                  onClick={() => onRemoveCompetency(competency.id)}
                  className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}