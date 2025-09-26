'use client'

import { useState, useMemo } from 'react'
import { Search, Filter, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface Task {
  id: string
  title: string
  description?: string | null
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | null
  state: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'
  dueDate?: Date | null
  assignee?: {
    id: string
    name: string
  } | null
}

interface TaskFiltersProps {
  tasks: Task[]
  onFilteredTasksChange: (tasks: Task[]) => void
  people: Array<{
    id: string
    name: string
    email: string
  }>
}

interface FilterOptions {
  search: string
  assignee: string
  priority: string
  state: string
  overdue: boolean
}

export function TaskFilters({ tasks, onFilteredTasksChange, people }: TaskFiltersProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    assignee: '',
    priority: '',
    state: '',
    overdue: false,
  })

  const filteredTasks = useMemo(() => {
    let filtered = [...tasks]

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower)
      )
    }

    // Assignee filter
    if (filters.assignee) {
      filtered = filtered.filter(task => 
        filters.assignee === 'unassigned' 
          ? !task.assignee
          : task.assignee?.id === filters.assignee
      )
    }

    // Priority filter
    if (filters.priority) {
      filtered = filtered.filter(task => task.priority === filters.priority)
    }

    // State filter
    if (filters.state) {
      filtered = filtered.filter(task => task.state === filters.state)
    }

    // Overdue filter
    if (filters.overdue) {
      const now = new Date()
      filtered = filtered.filter(task => 
        task.dueDate && new Date(task.dueDate) < now && task.state !== 'DONE'
      )
    }

    return filtered
  }, [tasks, filters])

  // Update parent component when filtered tasks change
  useMemo(() => {
    onFilteredTasksChange(filteredTasks)
  }, [filteredTasks, onFilteredTasksChange])

  const updateFilter = (key: keyof FilterOptions, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearAllFilters = () => {
    setFilters({
      search: '',
      assignee: '',
      priority: '',
      state: '',
      overdue: false,
    })
  }

  const activeFiltersCount = Object.values(filters).filter(value => 
    typeof value === 'boolean' ? value : value !== ''
  ).length

  const hasActiveFilters = activeFiltersCount > 0

  return (
    <div className="space-y-4">
      {/* Search and Filter Actions */}
      <div className="flex items-center space-x-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filters</h4>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Assignee Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Assignee</label>
                <Select value={filters.assignee} onValueChange={(value) => updateFilter('assignee', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All assignees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All assignees</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {people.map(person => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select value={filters.priority} onValueChange={(value) => updateFilter('priority', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All priorities</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={filters.state} onValueChange={(value) => updateFilter('state', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="TODO">To Do</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="IN_REVIEW">In Review</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Overdue Filter */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="overdue"
                  checked={filters.overdue}
                  onChange={(e) => updateFilter('overdue', e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="overdue" className="text-sm font-medium cursor-pointer">
                  Show overdue tasks only
                </label>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-muted-foreground">Active filters:</span>
          {filters.search && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <span>Search: "{filters.search}"</span>
              <button onClick={() => updateFilter('search', '')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.assignee && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <span>
                Assignee: {filters.assignee === 'unassigned' 
                  ? 'Unassigned' 
                  : people.find(p => p.id === filters.assignee)?.name || 'Unknown'
                }
              </span>
              <button onClick={() => updateFilter('assignee', '')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.priority && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <span>Priority: {filters.priority}</span>
              <button onClick={() => updateFilter('priority', '')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.state && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <span>
                Status: {filters.state === 'TODO' ? 'To Do' : 
                        filters.state === 'IN_PROGRESS' ? 'In Progress' :
                        filters.state === 'IN_REVIEW' ? 'In Review' : 'Done'}
              </span>
              <button onClick={() => updateFilter('state', '')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.overdue && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <span>Overdue only</span>
              <button onClick={() => updateFilter('overdue', false)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredTasks.length} of {tasks.length} tasks
      </div>
    </div>
  )
}