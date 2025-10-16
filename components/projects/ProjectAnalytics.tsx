'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  Target, 
  CheckSquare,
  Calendar,
  AlertTriangle
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OKRAnalytics } from './OKRAnalytics'

interface Task {
  id: string
  title: string
  state: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | null
  dueDate?: Date | null
  assignee?: {
    id: string
    name: string
  } | null
  createdAt: Date
  updatedAt: Date
}

interface OKR {
  id: string
  title: string
  description: string
  dueDate?: Date | null
  keyResults?: {
    id: string
    title: string
    progress: number
  }[]
  tasks?: {
    id: string
    title: string
    state: string
  }[]
}

interface Responsibility {
  id: string
  title: string
  person?: {
    id: string
    name: string
  } | null
}

interface ProjectAnalyticsProps {
  project: {
    id: string
    name: string
    startDate?: Date | null
    endDate?: Date | null
    tasks: Task[]
    okrs: OKR[]
    responsibilities: Responsibility[]
  }
}

export function ProjectAnalytics({ project }: ProjectAnalyticsProps) {
  const analytics = useMemo(() => {
    const tasks = project.tasks
    const totalTasks = tasks.length
    const completedTasks = tasks.filter(task => task.state === 'DONE').length
    const inProgressTasks = tasks.filter(task => task.state === 'IN_PROGRESS').length
    const todoTasks = tasks.filter(task => task.state === 'TODO').length
    const reviewTasks = tasks.filter(task => task.state === 'IN_REVIEW').length
    
    // Task completion rate
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
    
    // Priority distribution
    const priorityDistribution = {
      LOW: tasks.filter(task => task.priority === 'LOW').length,
      MEDIUM: tasks.filter(task => task.priority === 'MEDIUM').length,
      HIGH: tasks.filter(task => task.priority === 'HIGH').length,
      URGENT: tasks.filter(task => task.priority === 'URGENT').length,
    }
    
    // Overdue tasks
    const now = new Date()
    const overdueTasks = tasks.filter(task => 
      task.dueDate && 
      new Date(task.dueDate) < now && 
      task.state !== 'DONE'
    ).length
    
    // Team productivity
    const assigneeStats = tasks.reduce((acc, task) => {
      const assigneeId = task.assignee?.id || 'unassigned'
      const assigneeName = task.assignee?.name || 'Unassigned'
      
      if (!acc[assigneeId]) {
        acc[assigneeId] = {
          name: assigneeName,
          total: 0,
          completed: 0,
          inProgress: 0,
        }
      }
      
      acc[assigneeId].total++
      if (task.state === 'DONE') {
        acc[assigneeId].completed++
      } else if (task.state === 'IN_PROGRESS') {
        acc[assigneeId].inProgress++
      }
      
      return acc
    }, {} as Record<string, { name: string; total: number; completed: number; inProgress: number }>)
    
    // OKR progress (calculated from Key Results)
    const okrProgress = project.okrs.map(okr => {
      const keyResults = okr.keyResults || []
      const progress = keyResults.length > 0 
        ? keyResults.reduce((sum, kr) => sum + kr.progress, 0) / keyResults.length
        : 0
      return {
        ...okr,
        progress,
        keyResultsCount: keyResults.length,
        completedKeyResults: keyResults.filter(kr => kr.progress === 100).length,
        tasksCount: okr.tasks?.length || 0,
        completedTasks: okr.tasks?.filter(t => t.state === 'DONE').length || 0
      }
    })
    
    const avgOKRProgress = okrProgress.length > 0 
      ? okrProgress.reduce((sum, okr) => sum + okr.progress, 0) / okrProgress.length 
      : 0
    
    // Time analysis
    const projectDuration = project.startDate && project.endDate 
      ? Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24))
      : null
    
    const daysElapsed = project.startDate 
      ? Math.ceil((now.getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0
    
    const timeProgress = projectDuration && daysElapsed 
      ? Math.min((daysElapsed / projectDuration) * 100, 100)
      : 0
    
    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      reviewTasks,
      completionRate,
      priorityDistribution,
      overdueTasks,
      assigneeStats,
      okrProgress,
      avgOKRProgress,
      projectDuration,
      daysElapsed,
      timeProgress
    }
  }, [project])

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="overview">Project Overview</TabsTrigger>
        <TabsTrigger value="okrs">OKR Analytics</TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview" className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">{analytics.completionRate.toFixed(1)}%</p>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <CheckSquare className="h-3 w-3 mr-1" />
                  {analytics.completedTasks} of {analytics.totalTasks} tasks
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <Progress value={analytics.completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Tasks</p>
                <p className="text-2xl font-bold">{analytics.inProgressTasks}</p>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <Clock className="h-3 w-3 mr-1" />
                  In progress
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">OKR Progress</p>
                <p className="text-2xl font-bold">{analytics.avgOKRProgress.toFixed(1)}%</p>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <Target className="h-3 w-3 mr-1" />
                  Average progress
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <Progress value={analytics.avgOKRProgress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue Tasks</p>
                <p className="text-2xl font-bold text-red-600">{analytics.overdueTasks}</p>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Need attention
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Task Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  <span className="text-sm">To Do</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{analytics.todoTasks}</span>
                  <div className="w-16 h-2 bg-gray-200 rounded-full">
                    <div 
                      className="h-2 bg-gray-400 rounded-full" 
                      style={{ width: `${analytics.totalTasks > 0 ? (analytics.todoTasks / analytics.totalTasks) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm">In Progress</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{analytics.inProgressTasks}</span>
                  <div className="w-16 h-2 bg-gray-200 rounded-full">
                    <div 
                      className="h-2 bg-blue-500 rounded-full" 
                      style={{ width: `${analytics.totalTasks > 0 ? (analytics.inProgressTasks / analytics.totalTasks) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-sm">In Review</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{analytics.reviewTasks}</span>
                  <div className="w-16 h-2 bg-gray-200 rounded-full">
                    <div 
                      className="h-2 bg-purple-500 rounded-full" 
                      style={{ width: `${analytics.totalTasks > 0 ? (analytics.reviewTasks / analytics.totalTasks) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm">Done</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{analytics.completedTasks}</span>
                  <div className="w-16 h-2 bg-gray-200 rounded-full">
                    <div 
                      className="h-2 bg-green-500 rounded-full" 
                      style={{ width: `${analytics.totalTasks > 0 ? (analytics.completedTasks / analytics.totalTasks) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.priorityDistribution).map(([priority, count]) => (
                <div key={priority} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${
                        priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                        priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                        priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}
                    >
                      {priority}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{count}</span>
                    <div className="w-16 h-2 bg-gray-200 rounded-full">
                      <div 
                        className={`h-2 rounded-full ${
                          priority === 'URGENT' ? 'bg-red-500' :
                          priority === 'HIGH' ? 'bg-orange-500' :
                          priority === 'MEDIUM' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${analytics.totalTasks > 0 ? (count / analytics.totalTasks) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Team Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(analytics.assigneeStats).map(([assigneeId, stats]) => (
              <div key={assigneeId} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{stats.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.total} total tasks
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">{stats.completed} completed</p>
                    <p className="text-xs text-muted-foreground">{stats.inProgress} in progress</p>
                  </div>
                  <div className="w-16">
                    <Progress 
                      value={stats.total > 0 ? (stats.completed / stats.total) * 100 : 0} 
                      className="h-2"
                    />
                    <p className="text-xs text-center mt-1">
                      {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* OKR Progress */}
      {analytics.okrProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>OKR Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.okrProgress.map((okr) => (
                <div key={okr.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{okr.title}</h4>
                    <div className="text-xs text-muted-foreground space-x-2">
                      <span>KRs: {okr.completedKeyResults}/{okr.keyResultsCount}</span>
                      <span>•</span>
                      <span>Tasks: {okr.completedTasks}/{okr.tasksCount}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Progress value={okr.progress} className="flex-1" />
                    <span className="text-sm font-medium w-12 text-right">
                      {okr.progress.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center space-x-3">
                      {okr.dueDate && (
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Due: {new Date(okr.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {okr.keyResultsCount > 0 && (
                        <span>Avg Key Result Progress: {okr.progress.toFixed(0)}%</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline Progress */}
      {analytics.projectDuration && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Timeline Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Time Elapsed</span>
                <span>{analytics.daysElapsed} of {analytics.projectDuration} days</span>
              </div>
              <Progress value={analytics.timeProgress} />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Start: {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Not set'}</span>
                <span>End: {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Not set'}</span>
              </div>
              
              {/* Progress vs Time Analysis */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h5 className="font-medium text-sm mb-2">Progress Analysis</h5>
                <div className="flex items-center justify-between text-sm">
                  <span>Task Completion:</span>
                  <span className={analytics.completionRate >= analytics.timeProgress ? 'text-green-600' : 'text-red-600'}>
                    {analytics.completionRate >= analytics.timeProgress ? 'On Track' : 'Behind Schedule'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.completionRate >= analytics.timeProgress 
                    ? 'Project is progressing ahead of or on schedule'
                    : 'Project may need additional resources or timeline adjustment'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      </TabsContent>
      
      <TabsContent value="okrs" className="space-y-6">
        {project.okrs && project.okrs.length > 0 ? (
          <OKRAnalytics okrs={project.okrs as any} />
        ) : (
          <div className="text-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No OKRs Available</h3>
            <p className="text-muted-foreground">
              Create some OKRs to see detailed analytics and progress tracking.
            </p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
