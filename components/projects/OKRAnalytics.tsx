'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Target, CheckSquare, TrendingUp, Calendar, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

interface OKRAnalyticsProps {
  okrs: Array<{
    id: string
    title: string
    description: string
    dueDate?: Date | string | null
    keyResults: Array<{
      id: string
      title: string
      progress: number
      dueDate?: Date | string | null
    }>
    tasks: Array<{
      id: string
      title: string
      state: string
      assignee?: {
        id: string
        name: string
      } | null
    }>
    _count?: {
      keyResults: number
      tasks: number
    }
  }>
}

export function OKRAnalytics({ okrs }: OKRAnalyticsProps) {
  const [taskSortField, setTaskSortField] = useState<'title' | 'state' | 'priority' | 'assignee'>('title')
  const [taskSortDirection, setTaskSortDirection] = useState<'asc' | 'desc'>('asc')

  // Calculate overall statistics
  const totalOKRs = okrs.length
  const totalKeyResults = okrs.reduce((sum, okr) => sum + (okr.keyResults?.length || 0), 0)
  const totalTasks = okrs.reduce((sum, okr) => sum + (okr.tasks?.length || 0), 0)
  
  const completedKeyResults = okrs.reduce((sum, okr) => 
    sum + (okr.keyResults?.filter(kr => kr.progress === 100).length || 0), 0)
  
  const completedTasks = okrs.reduce((sum, okr) => 
    sum + (okr.tasks?.filter(task => task.state === 'DONE').length || 0), 0)
  
  const overallKeyResultCompletion = totalKeyResults > 0 
    ? Math.round((completedKeyResults / totalKeyResults) * 100)
    : 0
  
  const overallTaskCompletion = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0

  // Calculate average completion per OKR
  const avgOKRCompletion = okrs.length > 0 
    ? Math.round(okrs.reduce((sum, okr) => {
        const keyResults = okr.keyResults || []
        const okrCompletion = keyResults.length > 0 
          ? keyResults.reduce((krSum, kr) => krSum + kr.progress, 0) / keyResults.length
          : 0
        return sum + okrCompletion
      }, 0) / okrs.length)
    : 0

  // Find overdue items
  const now = new Date()
  const overdueKeyResults = okrs.reduce((sum, okr) => 
    sum + (okr.keyResults?.filter(kr => 
      kr.dueDate && new Date(kr.dueDate) < now && kr.progress < 100
    ).length || 0), 0)

  const overdueOKRs = okrs.filter(okr => 
    okr.dueDate && new Date(okr.dueDate) < now && 
    (okr.keyResults?.length === 0 || 
     okr.keyResults.some(kr => kr.progress < 100))
  ).length

  // Get all Key Results for individual analysis
  const allKeyResults = okrs.flatMap(okr => 
    (okr.keyResults || []).map(kr => ({
      ...kr,
      okrTitle: okr.title,
      okrId: okr.id,
      isOverdue: kr.dueDate && new Date(kr.dueDate) < now && kr.progress < 100
    }))
  )

  // Get top performing and struggling Key Results
  const sortedKeyResults = [...allKeyResults].sort((a, b) => b.progress - a.progress)
  const topPerformingKeyResults = sortedKeyResults.slice(0, 5)
  const strugglingKeyResults = sortedKeyResults.filter(kr => kr.progress < 70).slice(-5).reverse()

  // Get all tasks for sorting
  const allTasks = okrs.flatMap(okr => 
    (okr.tasks || []).map(task => ({
      ...task,
      okrTitle: okr.title,
      okrId: okr.id
    }))
  )

  // Sort tasks based on current sort field and direction
  const sortedTasks = [...allTasks].sort((a, b) => {
    let aValue: any, bValue: any
    
    switch (taskSortField) {
      case 'title':
        aValue = a.title.toLowerCase()
        bValue = b.title.toLowerCase()
        break
      case 'state':
        aValue = a.state
        bValue = b.state
        break
      case 'priority':
        const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 }
        aValue = priorityOrder[(a as any).priority as keyof typeof priorityOrder] || 0
        bValue = priorityOrder[(b as any).priority as keyof typeof priorityOrder] || 0
        break
      case 'assignee':
        aValue = a.assignee?.name?.toLowerCase() || 'zzz'
        bValue = b.assignee?.name?.toLowerCase() || 'zzz'
        break
      default:
        return 0
    }
    
    if (aValue < bValue) return taskSortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return taskSortDirection === 'asc' ? 1 : -1
    return 0
  })

  const handleTaskSort = (field: typeof taskSortField) => {
    if (taskSortField === field) {
      setTaskSortDirection(taskSortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setTaskSortField(field)
      setTaskSortDirection('asc')
    }
  }

  // Calculate individual OKR metrics
  const enrichedOKRs = okrs.map(okr => {
    const keyResults = okr.keyResults || []
    const tasks = okr.tasks || []
    
    // Calculate completion based on average progress of key results
    const completion = keyResults.length > 0 
      ? Math.round(keyResults.reduce((sum, kr) => sum + kr.progress, 0) / keyResults.length)
      : 0
    
    // Count completed key results (100% progress)
    const completedKeyResults = keyResults.filter(kr => kr.progress === 100).length
    const totalKeyResults = keyResults.length
    
    // Calculate task completion percentage
    const completedTasks = tasks.filter(task => task.state === 'DONE').length
    const taskCompletion = tasks.length > 0 
      ? Math.round((completedTasks / tasks.length) * 100)
      : 0
    
    return {
      ...okr,
      completion,
      completedKeyResults,
      totalKeyResults,
      taskCompletion
    }
  })

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{totalOKRs}</p>
                <p className="text-sm text-muted-foreground">Total OKRs</p>
                <Badge variant="outline" className="mt-1 text-xs">
                  {avgOKRCompletion}% avg progress
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckSquare className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{completedKeyResults}/{totalKeyResults}</p>
                <p className="text-sm text-muted-foreground">Key Results</p>
                <Badge variant={overallKeyResultCompletion >= 70 ? 'default' : 'secondary'} className="mt-1 text-xs">
                  {overallKeyResultCompletion}% complete
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{completedTasks}/{totalTasks}</p>
                <p className="text-sm text-muted-foreground">Tasks</p>
                <Badge variant={overallTaskCompletion >= 70 ? 'default' : 'secondary'} className="mt-1 text-xs">
                  {overallTaskCompletion}% complete
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className={`h-8 w-8 ${overdueOKRs > 0 || overdueKeyResults > 0 ? 'text-red-500' : 'text-gray-400'}`} />
              <div>
                <p className="text-2xl font-bold">{overdueOKRs + overdueKeyResults}</p>
                <p className="text-sm text-muted-foreground">Overdue Items</p>
                <div className="flex space-x-1 mt-1">
                  {overdueOKRs > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {overdueOKRs} OKRs
                    </Badge>
                  )}
                  {overdueKeyResults > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {overdueKeyResults} KRs
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Key Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span>Top Performing Key Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {topPerformingKeyResults.length > 0 ? (
              topPerformingKeyResults.map((kr) => (
                <div key={kr.id} className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm line-clamp-1">{kr.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">from {kr.okrTitle}</p>
                      {(kr as any).description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{(kr as any).description}</p>
                      )}
                    </div>
                    <Badge variant="default" className="text-xs">
                      {kr.progress}%
                    </Badge>
                  </div>
                  <Progress value={kr.progress} className="h-2" />
                  {kr.dueDate && (
                    <p className="text-xs text-muted-foreground flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      Due: {new Date(kr.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No Key Results available</p>
            )}
          </CardContent>
        </Card>

        {/* Key Results Needing Attention */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span>Key Results Needing Attention</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {strugglingKeyResults.length > 0 ? (
              strugglingKeyResults.map((kr) => (
                <div key={kr.id} className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm line-clamp-1">{kr.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">from {kr.okrTitle}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        {kr.isOverdue && (
                          <Badge variant="destructive" className="text-xs">Overdue</Badge>
                        )}
                        {(kr as any).target && (
                          <span className="text-xs text-muted-foreground">Target: {(kr as any).target}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant={kr.progress === 0 ? 'destructive' : 'secondary'} className="text-xs">
                      {kr.progress}%
                    </Badge>
                  </div>
                  <Progress value={kr.progress} className="h-2" />
                  {kr.dueDate && (
                    <p className={`text-xs flex items-center ${
                      kr.isOverdue ? 'text-red-500' : 'text-muted-foreground'
                    }`}>
                      <Calendar className="h-3 w-3 mr-1" />
                      Due: {new Date(kr.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">All Key Results are performing well</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Progress */}
      <Card>
        <CardHeader>
          <CardTitle>All Objectives Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {enrichedOKRs.map((okr) => (
              <div key={okr.id} className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{okr.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {okr.description}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {okr.dueDate && (
                      <div className={`flex items-center space-x-1 text-xs ${
                        new Date(okr.dueDate) < now ? 'text-red-500' : 'text-muted-foreground'
                      }`}>
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(okr.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    <Badge variant={okr.completion >= 90 ? 'default' : okr.completion >= 70 ? 'secondary' : 'outline'}>
                      {Math.round(okr.completion)}%
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-muted-foreground">Key Results Progress</span>
                      <span className="font-medium">{okr.completedKeyResults}/{okr.totalKeyResults}</span>
                    </div>
                    <Progress value={okr.completion} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-muted-foreground">Task Completion</span>
                      <span className="font-medium">
                        {okr.tasks?.filter(t => t.state === 'DONE').length || 0}/{okr.tasks?.length || 0}
                      </span>
                    </div>
                    <Progress value={okr.taskCompletion} className="h-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}