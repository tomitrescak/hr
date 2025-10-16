'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { 
  FolderKanban, 
  Plus, 
  Users, 
  Target, 
  CheckSquare, 
  Calendar, 
  Loader2,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  LayoutGrid,
  List
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SortableTableHeader, type SortDirection } from '@/components/ui/sortable-table-header'
import { Avatar } from '@/components/ui/avatar'
import { ProjectsSummaryAnalytics } from '@/components/projects/ProjectsSummaryAnalytics'
import { AppLayout } from '@/components/layout/app-layout'
import { useViewPreference } from '@/lib/use-view-preference'

export default function ProjectsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '' })
  const [view, setView] = useViewPreference('projects-view', 'cards')
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: SortDirection }>({ key: null, direction: null })
  
  const { data: projects, isLoading, refetch } = trpc.projects.list.useQuery()
  const { data: stats } = trpc.projects.getStats.useQuery()
  
  const sortedProjects = useMemo(() => {
    if (!projects || !sortConfig.key || !sortConfig.direction) return projects
    
    return [...projects].sort((a, b) => {
      let aVal: any = a
      let bVal: any = b
      
      // Navigate to nested properties
      const keys = sortConfig.key!.split('.')
      for (const key of keys) {
        aVal = aVal?.[key]
        bVal = bVal?.[key]
      }
      
      // Handle different types
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal?.toLowerCase() || ''
      } else if (aVal instanceof Date) {
        aVal = aVal.getTime()
        bVal = bVal?.getTime() || 0
      } else if (typeof aVal === 'number') {
        aVal = aVal || 0
        bVal = bVal || 0
      } else {
        aVal = String(aVal || '')
        bVal = String(bVal || '')
      }
      
      if (sortConfig.direction === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
      }
    })
  }, [projects, sortConfig])
  const createProject = trpc.projects.create.useMutation({
    onSuccess: () => {
      refetch()
    }
  })
  const deleteProject = trpc.projects.delete.useMutation({
    onSuccess: () => {
      refetch()
    }
  })
  
  const handleCreateProject = async () => {
    if (!createForm.name.trim() || !createForm.description.trim()) return
    
    try {
      await createProject.mutateAsync(createForm)
      setCreateForm({ name: '', description: '' })
      setIsCreateOpen(false)
    } catch (error) {
      console.error('Failed to create project:', error)
      alert('Failed to create project')
    }
  }

  const handleDeleteProject = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the project "${name}"?`)) {
      try {
        await deleteProject.mutateAsync({ id })
      } catch (error: any) {
        alert(error.message || 'Failed to delete project')
      }
    }
  }
  
  const handleSort = (key: string, direction: SortDirection) => {
    setSortConfig({ key, direction })
  }

  const isProjectManager = session?.user.role === 'PROJECT_MANAGER'

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FolderKanban className="h-8 w-8" />
              Projects
            </h1>
            <p className="text-muted-foreground">Manage projects and track progress</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex items-center border rounded-md">
              <Button
                variant={view === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('cards')}
                className="rounded-r-none"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={view === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            
            {isProjectManager && (
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Create a new project to organize tasks and track progress.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Project Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter project name"
                      value={createForm.name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the project objectives and scope"
                      value={createForm.description}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleCreateProject} 
                      disabled={createProject.isPending || !createForm.name.trim() || !createForm.description.trim()}
                      className="flex-1"
                    >
                      {createProject.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Project"
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            )}
          </div>
        </div>

        {/* Summary Analytics */}
        {projects && projects.length > 0 && (
          <ProjectsSummaryAnalytics projects={projects as any} />
        )}

        {/* Projects Grid */}
        {!projects || projects.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-4">
                {isProjectManager 
                  ? "Create your first project to start organizing tasks and tracking progress."
                  : "No projects have been created yet."
                }
              </p>
              {isProjectManager && (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Project
                </Button>
              )}
            </CardContent>
          </Card>
        ) : view === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedProjects?.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-start justify-between">
                    <Link href={`/projects/${project.id}`} className="hover:underline">
                      <span className="line-clamp-2">{project.name}</span>
                    </Link>
                    {isProjectManager && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/projects/${project.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/projects/${project.id}/edit`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Project
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteProject(project.id, project.name)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </CardTitle>
                  <CardDescription className="line-clamp-3">
                    {project.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Statistics */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-500" />
                        <span className="text-muted-foreground">OKRs:</span>
                        <Badge variant="outline">{project._count?.okrs || 0}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-green-500" />
                        <span className="text-muted-foreground">Tasks:</span>
                        <Badge variant="outline">{project._count?.tasks || 0}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-purple-500" />
                        <span className="text-muted-foreground">Team:</span>
                        <Badge variant="outline">{project._count?.allocations || 0}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-orange-500" />
                        <span className="text-muted-foreground">Active:</span>
                        <Badge variant="outline">{project._count?.allocations || 0}</Badge>
                      </div>
                    </div>

                    {/* Active Team Members */}
                    {(project as any).allocations && (project as any).allocations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Active Team</h4>
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {(project as any).allocations.slice(0, 4).map((allocation: any) => (
                              allocation.person && (
                                <Avatar
                                  key={allocation.id}
                                  personId={allocation.person.id}
                                  name={allocation.person.name}
                                  size="sm"
                                  className="ring-2 ring-background"
                                />
                              )
                            ))}
                          </div>
                          {(project as any).allocations.length > 4 && (
                            <Badge variant="secondary" className="text-xs">
                              +{(project as any).allocations.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Recent OKRs */}
                    {project.okrs && project.okrs.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Key Objectives</h4>
                        <div className="space-y-1">
                          {project.okrs.slice(0, 2).map((okr) => (
                            <div key={okr.id} className="text-xs text-muted-foreground line-clamp-1">
                              • {okr.title}
                            </div>
                          ))}
                          {project.okrs.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{project.okrs.length - 2} more objectives
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  {/* Created Date */}
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHeader 
                    sortKey="name" 
                    currentSort={sortConfig} 
                    onSort={handleSort}
                  >
                    Project Name
                  </SortableTableHeader>
                  <SortableTableHeader
                    sortKey="_count.okrs" 
                    currentSort={sortConfig} 
                    onSort={handleSort}
                  >
                    OKRs
                  </SortableTableHeader>
                  <SortableTableHeader 
                    sortKey="_count.tasks" 
                    currentSort={sortConfig} 
                    onSort={handleSort}
                  >
                    Tasks
                  </SortableTableHeader>
                  <SortableTableHeader 
                    sortKey="_count.allocations" 
                    currentSort={sortConfig} 
                    onSort={handleSort}
                  >
                    Team
                  </SortableTableHeader>
                  <SortableTableHeader 
                    sortKey="createdAt" 
                    currentSort={sortConfig} 
                    onSort={handleSort}
                  >
                    Created
                  </SortableTableHeader>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProjects?.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      <Link href={`/projects/${project.id}`} className="hover:underline">
                        {project.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{project._count?.okrs || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{project._count?.tasks || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <Badge variant="outline">{project._count?.allocations || 0} members</Badge>
                        {(project as any).allocations && (project as any).allocations.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {(project as any).allocations.map((allocation: any) => (
                              allocation.person && (
                                <Avatar
                                  key={allocation.id}
                                  personId={allocation.person.id}
                                  name={allocation.person.name}
                                  size={64}
                                />
                              )
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isProjectManager && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/projects/${project.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/projects/${project.id}/edit`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Project
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteProject(project.id, project.name)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
