"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { trpc } from "@/lib/trpc/client"
import { ChevronDown, ChevronRight, Users, AlertCircle, ExternalLink, Filter } from "lucide-react"
import { Role } from "@prisma/client"
import { useStatusFilter } from "@/lib/use-status-filter"

interface ExpandedTasks {
  [personId: string]: boolean
}

export function CapacityBreakdownTab() {
  const { data: session } = useSession()
  const { data: people, isLoading } = trpc.people.list.useQuery()
  const [expandedTasks, setExpandedTasks] = useState<ExpandedTasks>({})
  const [statusFilter, setStatusFilter] = useStatusFilter('capacity-status-filter', 'all')

  const isManager = session?.user?.role === Role.PROJECT_MANAGER

  const toggleTaskExpansion = (personId: string) => {
    setExpandedTasks(prev => ({
      ...prev,
      [personId]: !prev[personId]
    }))
  }

  const filteredPeople = people?.filter(person => {
    if (statusFilter === 'active') return person.isActive
    if (statusFilter === 'inactive') return !person.isActive
    return true
  }) || []

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Capacity Breakdown
              <Badge variant="secondary">{filteredPeople.length}</Badge>
              {statusFilter !== 'all' && (
                <Badge variant="outline" className="capitalize">
                  {statusFilter}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Project assignment breakdown by person with capacity utilization</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredPeople.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {statusFilter === 'all' ? 'No people found' : `No ${statusFilter} people found`}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Name</TableHead>
                
                <TableHead>Current Utilization</TableHead>
                <TableHead>Project Assignments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPeople.map((person) => (
                <>
                  <TableRow key={person.id} className={!person.isActive ? 'opacity-60' : ''}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleTaskExpansion(person.id)}
                        className="h-6 w-6 p-0"
                      >
                        {expandedTasks[person.id] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div>
                        <Link href={`/people/${person.id}`} className="hover:underline font-medium">
                          {person.name}
                        </Link>
                        <div className="text-xs text-muted-foreground mt-1">
                          {person.email}
                        </div>
                      </div>
                    </TableCell>
                  
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={person.isOverCapacity ? "destructive" : "secondary"}
                          className={person.isOverCapacity ? "bg-red-100 text-red-800" : ""}
                        >
                          {person.capacityUtilization}%
                        </Badge>
                        {person.isOverCapacity && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </TableCell>

            

                        {person.projectAllocations.length > 0 ? (
                          person.projectAllocations.map((allocation) => (
                            <TableCell
                            key={allocation.id}
                            >
                            <Link
                              href={`/projects/${allocation.project?.id}`}
                              className="flex"
                            >
                              <div className="items-center gap-1 flex flex-col">
                                <div className="text-center"> {allocation.project?.name}</div> 
                                <div className="text-s text-muted-foreground">({allocation.capacityAllocation}%)</div>
                               </div>
                            </Link>
                            </TableCell>
                          ))
                        ) : (
                          <TableCell>
                          <span className="text-muted-foreground text-sm">No project allocations</span>
                          </TableCell>
                        )}
                        
                    
                    
                  </TableRow>
                  
                  {/* Expanded Task View */}
                  {expandedTasks[person.id] && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/30 p-0">
                        <div className="p-4">
                          <TaskBreakdownView personId={person.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

interface TaskBreakdownViewProps {
  personId: string
}

function TaskBreakdownView({ personId }: TaskBreakdownViewProps) {
  const { data: tasksData, isLoading } = trpc.people.getTasksForPerson.useQuery({ personId })

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!tasksData || tasksData.tasksByProject.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p>No active tasks assigned</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium">Current Task Assignments</h4>
      
      {tasksData.tasksByProject.map((projectGroup) => (
        <div key={projectGroup.project.id} className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <Link 
              href={`/projects/${projectGroup.project.id}`}
              className="flex items-center gap-2 hover:underline"
            >
              <h5 className="font-medium">{projectGroup.project.name}</h5>
              <ExternalLink className="h-3 w-3" />
            </Link>
            <Badge variant="outline">{projectGroup.tasks.length} tasks</Badge>
          </div>
          
          <div className="space-y-1">
            {projectGroup.tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between text-sm">
                <span className="flex-1">{task.title}</span>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={task.state === 'DONE' ? 'default' : 'secondary'}
                    className={`text-xs ${
                      task.state === 'DONE' ? 'bg-green-100 text-green-800' :
                      task.state === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                      task.state === 'BLOCKED' ? 'bg-red-100 text-red-800' :
                      ''
                    }`}
                  >
                    {task.state}
                  </Badge>
                  {task.priority && (
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        task.priority === 'HIGH' ? 'border-red-300 text-red-700' :
                        task.priority === 'MEDIUM' ? 'border-yellow-300 text-yellow-700' :
                        'border-green-300 text-green-700'
                      }`}
                    >
                      {task.priority}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Summary */}
      <div className="mt-4 p-3 bg-muted rounded-lg">
        <h5 className="font-medium mb-2">Task Summary</h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total: </span>
            <span className="font-medium">{tasksData.summary.total}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Active: </span>
            <span className="font-medium">{tasksData.summary.active}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Completed: </span>
            <span className="font-medium">{tasksData.summary.completed}</span>
          </div>
          <div>
            <span className="text-muted-foreground">In Progress: </span>
            <span className="font-medium">{tasksData.summary.byState.IN_PROGRESS}</span>
          </div>
        </div>
      </div>
    </div>
  )
}