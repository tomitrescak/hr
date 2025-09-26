'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Plus, Search, Filter, MoreVertical, Users, BookOpen, Eye, Edit, Trash2 } from 'lucide-react'
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
import { CreateCompetencyForm } from '@/components/competencies/CreateCompetencyForm'

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

  const {
    data: competencies,
    isLoading,
    refetch,
  } = trpc.competencies.list.useQuery({
    type: typeFilter === 'all' ? undefined : typeFilter as any,
  })

  const { data: stats } = trpc.competencies.getStats.useQuery()

  const deleteMutation = trpc.competencies.delete.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const filteredCompetencies = competencies?.filter((competency) =>
    competency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (competency.description && competency.description.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || []

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the competency "${name}"?`)) {
      try {
        await deleteMutation.mutateAsync({ id })
      } catch (error: any) {
        alert(error.message || 'Failed to delete competency')
      }
    }
  }

  const canManage = session?.user?.role === 'PROJECT_MANAGER'

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Competencies</h1>
          <p className="text-muted-foreground">
            Manage organizational competencies and skills
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

      {/* Filters */}
      <div className="flex gap-4">
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

      {/* Competencies Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Competencies ({filteredCompetencies.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>People</TableHead>
                <TableHead>Courses</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCompetencies.map((competency) => (
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

          {filteredCompetencies.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || typeFilter !== 'all'
                ? 'No competencies match your filters'
                : 'No competencies found'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}