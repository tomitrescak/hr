'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Plus, Search, Filter, MoreVertical, Users, BookOpen, Eye, Edit, Trash2, Grid3X3, List, X, User, ChevronUp, ChevronDown } from 'lucide-react'
import { useViewPreference } from '@/lib/use-view-preference'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CreateCompetencyForm } from '@/components/competencies/CreateCompetencyForm'
import { AppLayout } from '@/components/layout/app-layout'

const competencyTypeColors = {
  KNOWLEDGE: 'bg-blue-100 text-blue-800',
  SKILL: 'bg-green-100 text-green-800',
  TECH_TOOL: 'bg-purple-100 text-purple-800',
  ABILITY: 'bg-orange-100 text-orange-800',
  VALUE: 'bg-pink-100 text-pink-800',
  BEHAVIOUR: 'bg-indigo-100 text-indigo-800',
  ENABLER: 'bg-gray-100 text-gray-800',
}

export default function CompetenciesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [view, setView] = useViewPreference('competencies-view', 'cards')
  
  // People search state
  const [competencySearchTerm, setCompetencySearchTerm] = useState('')
  const [selectedCompetencies, setSelectedCompetencies] = useState<Array<{id: string, name: string, type: string}>>([])  
  const [activeTab, setActiveTab] = useState('competencies')
  const [peopleSearchTypeFilter, setPeopleSearchTypeFilter] = useState<string>('all')
  
  // Sorting state
  const [sortField, setSortField] = useState<'name' | 'type' | 'description' | 'people' | 'courses'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const {
    data: competencies,
    isLoading,
    refetch,
  } = trpc.competencies.list.useQuery({
    type: typeFilter === 'all' ? undefined : typeFilter as any,
  })

  const { data: stats } = trpc.competencies.getStats.useQuery()
  
  const { data: peopleResults, isLoading: peopleLoading } = trpc.people.searchByCompetencies.useQuery(
    {
      competencyIds: selectedCompetencies.map(c => c.id),
      minMatchPercentage: 75,
    },
    {
      enabled: selectedCompetencies.length > 0,
    }
  )

  const deleteMutation = trpc.competencies.delete.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const filteredAndSortedCompetencies = (() => {
    const filtered = competencies?.filter((competency) =>
      competency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (competency.description && competency.description.toLowerCase().includes(searchTerm.toLowerCase()))
    ) || []
    
    return filtered.sort((a, b) => {
      let aValue: string | number
      let bValue: string | number
      
      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'type':
          aValue = a.type
          bValue = b.type
          break
        case 'description':
          aValue = (a.description || '').toLowerCase()
          bValue = (b.description || '').toLowerCase()
          break
        case 'people':
          aValue = a._count.personCompetencies
          bValue = b._count.personCompetencies
          break
        case 'courses':
          aValue = a._count.courseCompetencies
          bValue = b._count.courseCompetencies
          break
        default:
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      } else {
        return sortDirection === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number)
      }
    })
  })()
  
  // Filter competencies for search (exclude already selected ones)
  const searchableCompetencies = competencies?.filter((competency) => {
    const matchesSearch = competencySearchTerm === '' || competency.name.toLowerCase().includes(competencySearchTerm.toLowerCase())
    const matchesType = peopleSearchTypeFilter === 'all' || competency.type === peopleSearchTypeFilter
    const notSelected = !selectedCompetencies.some(selected => selected.id === competency.id)
    return matchesSearch && matchesType && notSelected
  }) || []

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the competency "${name}"?`)) {
      try {
        await deleteMutation.mutateAsync({ id })
      } catch (error: any) {
        alert(error.message || 'Failed to delete competency')
      }
    }
  }
  
  const handleAddCompetency = (competency: {id: string, name: string, type: string}) => {
    setSelectedCompetencies(prev => [...prev, competency])
    setCompetencySearchTerm('')
  }
  
  const handleRemoveCompetency = (competencyId: string) => {
    setSelectedCompetencies(prev => prev.filter(c => c.id !== competencyId))
  }
  
  const handleSort = (field: 'name' | 'type' | 'description' | 'people' | 'courses') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }
  
  const SortableHeader = ({ field, children }: { field: 'name' | 'type' | 'description' | 'people' | 'courses', children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-between">
        <span>{children}</span>
        <div className="flex flex-col ml-1">
          <ChevronUp 
            className={`h-3 w-3 ${sortField === field && sortDirection === 'asc' ? 'text-foreground' : 'text-muted-foreground/40'}`} 
          />
          <ChevronDown 
            className={`h-3 w-3 -mt-1 ${sortField === field && sortDirection === 'desc' ? 'text-foreground' : 'text-muted-foreground/40'}`} 
          />
        </div>
      </div>
    </TableHead>
  )

  const canManage = session?.user?.role === 'PROJECT_MANAGER'

  if (isLoading) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Competencies</h1>
          <p className="text-muted-foreground">
            Manage organizational competencies and find people by skills
          </p>
        </div>
        {canManage && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Competency
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Competency</DialogTitle>
              </DialogHeader>
              <CreateCompetencyForm
                onSuccess={() => {
                  setCreateDialogOpen(false)
                  refetch()
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="competencies">All Competencies</TabsTrigger>
          <TabsTrigger value="find-people">Find People</TabsTrigger>
        </TabsList>
        
        <TabsContent value="competencies" className="space-y-6">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Competencies</p>
                      <p className="text-2xl font-bold">{stats.totalCompetencies}</p>
                    </div>
                    <BookOpen className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Person Assignments</p>
                      <p className="text-2xl font-bold">{stats.totalAssignments}</p>
                    </div>
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">By Type</p>
                    <div className="space-y-1">
                      {Object.entries(stats.byType).map(([type, count]) => (
                        <div key={type} className="flex justify-between text-xs">
                          <span className="capitalize">{type.toLowerCase().replace('_', ' ')}</span>
                          <span>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Proficiency Levels</p>
                    <div className="space-y-1">
                      {Object.entries(stats.byProficiency).map(([proficiency, count]) => (
                        <div key={proficiency} className="flex justify-between text-xs">
                          <span>{proficiency}</span>
                          <span>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters and View Toggle */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-1 gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search competencies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
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
            
            {/* View Toggle */}
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground mr-3">View:</span>
              <div className="flex border border-input rounded-lg overflow-hidden">
                <Button
                  variant={view === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('cards')}
                  className="rounded-none border-0 px-4 py-2"
                  title="Cards View"
                >
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Cards
                </Button>
                <Button
                  variant={view === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('list')}
                  className="rounded-none border-0 px-4 py-2 border-l"
                  title="List View"
                >
                  <List className="h-4 w-4 mr-2" />
                  List
                </Button>
              </div>
            </div>
          </div>

          {/* Competencies List/Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Competencies ({filteredAndSortedCompetencies.length})
              </h2>
            </div>

            {filteredAndSortedCompetencies.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8 text-muted-foreground">
                  {searchTerm || typeFilter !== 'all'
                    ? 'No competencies match your filters'
                    : 'No competencies found'}
                </CardContent>
              </Card>
            ) : view === 'cards' ? (
              /* Cards View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAndSortedCompetencies.map((competency) => (
                  <Card key={competency.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <button
                            onClick={() => router.push(`/competencies/${competency.id}`)}
                            className="text-left"
                          >
                            <CardTitle className="text-lg hover:underline">
                              {competency.name}
                            </CardTitle>
                          </button>
                          <div className="mt-2">
                            <Badge
                              variant="secondary"
                              className={competencyTypeColors[competency.type]}
                            >
                              {competency.type.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/competencies/${competency.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {canManage && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => router.push(`/competencies/${competency.id}/edit`)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(competency.id, competency.name)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {competency.description && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {competency.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span>{competency._count.personCompetencies} people</span>
                        </div>
                        <div className="flex items-center">
                          <BookOpen className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span>{competency._count.courseCompetencies} courses</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              /* List View */
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableHeader field="name">Name</SortableHeader>
                        <SortableHeader field="type">Type</SortableHeader>
                        <SortableHeader field="description">Description</SortableHeader>
                        <SortableHeader field="people">People</SortableHeader>
                        <SortableHeader field="courses">Courses</SortableHeader>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedCompetencies.map((competency) => (
                        <TableRow key={competency.id}>
                          <TableCell className="font-medium">
                            <button
                              onClick={() => router.push(`/competencies/${competency.id}`)}
                              className="text-left hover:underline"
                            >
                              {competency.name}
                            </button>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={competencyTypeColors[competency.type]}
                            >
                              {competency.type.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {competency.description || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                              {competency._count.personCompetencies}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <BookOpen className="h-4 w-4 mr-1 text-muted-foreground" />
                              {competency._count.courseCompetencies}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => router.push(`/competencies/${competency.id}`)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {canManage && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => router.push(`/competencies/${competency.id}/edit`)}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDelete(competency.id, competency.name)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        <TabsContent value="find-people" className="space-y-6">
          {/* Competency Search */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">Find People by Skills</h2>
              <p className="text-muted-foreground mb-4">
                Search for competencies and add them to find people who have these skills
              </p>
            </div>
            
            {/* Type Filter */}
            <div className="flex items-center gap-4">
              <label htmlFor="type-filter" className="text-sm font-medium">
                Filter by type:
              </label>
              <Select value={peopleSearchTypeFilter} onValueChange={setPeopleSearchTypeFilter}>
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
                    placeholder="Search for competencies to add..."
                    value={competencySearchTerm}
                    onChange={(e) => setCompetencySearchTerm(e.target.value)}
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
                          onClick={() => handleAddCompetency({
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
                            className={`${competencyTypeColors[competency.type]} flex-shrink-0`}
                          >
                            {competency.type.replace('_', ' ')}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* No results message */}
                {searchableCompetencies.length === 0 && competencySearchTerm && (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No competencies found matching &quot;{competencySearchTerm}&quot;
                    {peopleSearchTypeFilter !== 'all' && (
                      <span> in {peopleSearchTypeFilter.replace('_', ' ').toLowerCase()} category</span>
                    )}
                  </div>
                )}
                
                {/* Empty state when no search term */}
                {searchableCompetencies.length === 0 && !competencySearchTerm && (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    {peopleSearchTypeFilter === 'all' 
                      ? 'All competencies are already selected or no competencies available'
                      : `No ${peopleSearchTypeFilter.replace('_', ' ').toLowerCase()} competencies available to add`
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
                        onClick={() => handleRemoveCompetency(competency.id)}
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
          
          {/* People Results */}
          {selectedCompetencies.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  People Results {peopleResults ? `(${peopleResults.length})` : ''}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Showing people with at least 75% of selected skills
                </p>
              </div>
              
              {peopleLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="h-6 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : peopleResults && peopleResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {peopleResults.map((person) => (
                    <Card key={person.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <button
                              onClick={() => router.push(`/people/${person.id}`)}
                              className="text-left"
                            >
                              <CardTitle className="text-lg hover:underline">
                                {person.name}
                              </CardTitle>
                            </button>
                            <p className="text-sm text-muted-foreground">{person.email}</p>
                          </div>
                          <div className="flex items-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge 
                                    variant={person.matchPercentage === 100 ? 'default' : 'secondary'}
                                    className="ml-2"
                                  >
                                    {person.matchPercentage}%
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="p-2">
                                    <p className="font-medium mb-2">
                                      Has {person.matchingCompetencies.length} of {selectedCompetencies.length} skills:
                                    </p>
                                    <ul className="text-xs space-y-1">
                                      {person.matchingCompetencies.map((comp) => (
                                        <li key={comp.id} className="flex items-center gap-2">
                                          <span>{comp.name}</span>
                                          {comp.proficiency && (
                                            <Badge variant="outline" className="text-xs py-0">
                                              {comp.proficiency}
                                            </Badge>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            <span>Started {new Date(person.entryDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center">
                            <span>{person.totalCompetencies} total skills</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-8 text-muted-foreground">
                    No people found with at least 75% of the selected skills
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          {selectedCompetencies.length === 0 && (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Search for and select competencies above to find people with those skills</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </AppLayout>
  )
}
