"use client"

import { useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { trpc } from "@/lib/trpc/client"
import Link from "next/link"
import { Role } from "@prisma/client"
import { Users, Plus, Filter, BarChart3 } from "lucide-react"
import { AddPersonDialog } from "@/components/people/add-person-dialog"
import { PersonActionsMenu } from "@/components/people/person-actions-menu"
import { SortableTableHeader, type SortDirection } from "@/components/ui/sortable-table-header"
import { useStatusFilter } from "@/lib/use-status-filter"
import { CapacityBreakdownTab } from "@/components/people/capacity-breakdown-tab"

type SortConfig = {
  key: string | null
  direction: SortDirection
}

export default function PeoplePage() {
  const { data: session } = useSession()
  const { data: people, isLoading } = trpc.people.list.useQuery()
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useStatusFilter('people-status-filter', 'all')
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null })

  const isManager = session?.user?.role === Role.PROJECT_MANAGER

  const handleSort = (key: string, direction: SortDirection) => {
    setSortConfig({ key: direction ? key : null, direction })
  }

  const sortedAndFilteredPeople = useMemo(() => {
    if (!people) return []

    // First, filter by status
    let filtered = people.filter(person => {
      if (statusFilter === 'active') return person.isActive
      if (statusFilter === 'inactive') return !person.isActive
      return true
    })

    // Then sort with special handling for status-aware sorting
    if (sortConfig.key && sortConfig.direction) {
      filtered = [...filtered].sort((a, b) => {
        const { key, direction } = sortConfig
        const multiplier = direction === 'asc' ? 1 : -1

        // Special handling: when sorting by status, sort normally
        if (key === 'status') {
          const aValue = a.isActive ? 'active' : 'inactive'
          const bValue = b.isActive ? 'active' : 'inactive'
          return aValue.localeCompare(bValue) * multiplier
        }

        // For all other sorts: keep active people at top, inactive at bottom
        if (a.isActive !== b.isActive) {
          return a.isActive ? -1 : 1
        }

        // Both have same status, sort by the requested field
        let aValue: any
        let bValue: any

        switch (key) {
          case 'name':
            aValue = a.name.toLowerCase()
            bValue = b.name.toLowerCase()
            break
          case 'email':
            aValue = a.email.toLowerCase()
            bValue = b.email.toLowerCase()
            break
          case 'role':
            aValue = a.role
            bValue = b.role
            break
          case 'competencies':
            aValue = a._count?.competencies || 0
            bValue = b._count?.competencies || 0
            break
          case 'assignments':
            aValue = a._count?.projectAllocations || 0
            bValue = b._count?.projectAllocations || 0
            break
          case 'capacity':
            aValue = a.capacityUtilization || 0
            bValue = b.capacityUtilization || 0
            break
          default:
            return 0
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return aValue.localeCompare(bValue) * multiplier
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return (aValue - bValue) * multiplier
        }

        return 0
      })
    }

    return filtered
  }, [people, statusFilter, sortConfig])

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">People</h1>
              <p className="text-muted-foreground">Manage team member profiles and competencies</p>
            </div>
            <AddPersonDialog />
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              People
            </h1>
            <p className="text-muted-foreground">Manage team member profiles and competencies</p>
          </div>
          <AddPersonDialog />
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="capacity" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Capacity Breakdown
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <PeopleOverviewTab 
              sortedAndFilteredPeople={sortedAndFilteredPeople}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              sortConfig={sortConfig}
              handleSort={handleSort}
              isManager={isManager}
            />
          </TabsContent>

          <TabsContent value="capacity">
            <CapacityBreakdownTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}

interface PeopleOverviewTabProps {
  sortedAndFilteredPeople: any[]
  statusFilter: string
  setStatusFilter: (filter: 'all' | 'active' | 'inactive') => void
  sortConfig: SortConfig
  handleSort: (key: string, direction: SortDirection) => void
  isManager: boolean
}

function PeopleOverviewTab({ 
  sortedAndFilteredPeople, 
  statusFilter, 
  setStatusFilter, 
  sortConfig, 
  handleSort, 
  isManager 
}: PeopleOverviewTabProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              All People
              <Badge variant="secondary">{sortedAndFilteredPeople.length}</Badge>
              {statusFilter !== 'all' && (
                <Badge variant="outline" className="capitalize">
                  {statusFilter}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>List of all users in the system</CardDescription>
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
        {!sortedAndFilteredPeople || sortedAndFilteredPeople.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {statusFilter === 'all' ? 'No people found' : `No ${statusFilter} people found`}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHeader 
                  sortKey="status" 
                  currentSort={sortConfig} 
                  onSort={handleSort}
                >
                  Status
                </SortableTableHeader>
                <SortableTableHeader 
                  sortKey="name" 
                  currentSort={sortConfig} 
                  onSort={handleSort}
                >
                  Name
                </SortableTableHeader>
                {/* <SortableTableHeader 
                  sortKey="email" 
                  currentSort={sortConfig} 
                  onSort={handleSort}
                >
                  Email
                </SortableTableHeader> */}
                <SortableTableHeader 
                  sortKey="role" 
                  currentSort={sortConfig} 
                  onSort={handleSort}
                >
                  Role
                </SortableTableHeader>
                <SortableTableHeader 
                  sortKey="capacity" 
                  currentSort={sortConfig} 
                  onSort={handleSort}
                >
                  Capacity
                </SortableTableHeader>
                <SortableTableHeader 
                  sortKey="competencies" 
                  currentSort={sortConfig} 
                  onSort={handleSort}
                >
                  Competencies
                </SortableTableHeader>
                <SortableTableHeader 
                  sortKey="assignments" 
                  currentSort={sortConfig} 
                  onSort={handleSort}
                >
                  Allocations
                </SortableTableHeader>
                {isManager && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredPeople.map((person) => (
                <TableRow key={person.id} className={!person.isActive ? 'opacity-60' : ''}>
                  <TableCell>
                    <Badge 
                      variant={person.isActive ? "default" : "secondary"}
                      className={person.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
                    >
                      {person.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <Link href={`/people/${person.id}`} className="hover:underline font-medium">
                        {person.name}
                      </Link>
                      {person.alternativeEmail && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Alt: {person.alternativeEmail}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  {/* <TableCell className="text-muted-foreground">{person.email}</TableCell> */}
                  <TableCell>
                    <Badge variant={person.role === Role.PROJECT_MANAGER ? "default" : "secondary"}>
                      {person.role === Role.PROJECT_MANAGER ? "Project Manager" : "User"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {/* <Badge variant="outline">{person.capacity}%</Badge> */}
                      <Badge 
                        variant={person.isOverCapacity ? "destructive" : "secondary"}
                        className={person.isOverCapacity ? "bg-red-100 text-red-800" : ""}
                      >
                        {person.capacityUtilization}%
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{person._count?.competencies || 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{person._count?.projectAllocations || 0}</Badge>
                  </TableCell>
                  {isManager && (
                    <TableCell className="text-right">
                      <PersonActionsMenu person={person} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
