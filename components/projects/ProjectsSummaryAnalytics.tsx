'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  Users, 
  Clock, 
  Target, 
  CheckSquare,
  Calendar,
  AlertTriangle,
  FolderOpen
} from 'lucide-react'

interface Project {
  id: string
  name: string
  status: string
  tasks: Array<{
    id: string
    state: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'
    dueDate?: Date | null
  }>
  okrs: Array<{
    id: string
    keyResults: Array<{
      id: string
      progress: number
    }>
  }>
  allocations: Array<{
    id: string
  }>
}

interface ProjectsSummaryAnalyticsProps {
  projects: Project[]
}

export function ProjectsSummaryAnalytics({ projects }: ProjectsSummaryAnalyticsProps) {
  const analytics = useMemo(() => {
    const totalProjects = projects.length
    const activeProjects = projects.filter(p => p.status === 'ACTIVE').length
    const completedProjects = projects.filter(p => p.status === 'COMPLETED').length
    const onHoldProjects = projects.filter(p => p.status === 'ON_HOLD').length
    const planningProjects = projects.filter(p => p.status === 'PLANNING').length
    
    // Task statistics across all projects
    const allTasks = projects.flatMap(p => p.tasks)
    const totalTasks = allTasks.length
    const completedTasks = allTasks.filter(t => t.state === 'DONE').length
    const inProgressTasks = allTasks.filter(t => t.state === 'IN_PROGRESS').length
    
    // Overall completion rate
    const overallCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
    
    // Overdue tasks across all projects
    const now = new Date()
    const overdueTasks = allTasks.filter(task => 
      task.dueDate && 
      new Date(task.dueDate) < now && 
      task.state !== 'DONE'
    ).length
    
    // OKR statistics
    const allOKRs = projects.flatMap(p => p.okrs)
    const totalOKRs = allOKRs.length
    const okrProgress = totalOKRs > 0 
      ? allOKRs.reduce((sum, okr) => {
          // Calculate progress as average of key results
          const keyResults = okr.keyResults || []
          const avgProgress = keyResults.length > 0 
            ? keyResults.reduce((krSum, kr) => krSum + kr.progress, 0) / keyResults.length
            : 0
          return sum + avgProgress
        }, 0) / totalOKRs 
      : 0
    
    // Team members
    const totalTeamMembers = projects.reduce((sum, p) => sum + p.allocations.length, 0)
    const avgTeamSize = totalProjects > 0 ? totalTeamMembers / totalProjects : 0
    
    return {
      totalProjects,
      activeProjects,
      completedProjects,
      onHoldProjects,
      planningProjects,
      totalTasks,
      completedTasks,
      inProgressTasks,
      overallCompletionRate,
      overdueTasks,
      totalOKRs,
      okrProgress,
      totalTeamMembers,
      avgTeamSize
    }
  }, [projects])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Projects */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Projects</p>
              <p className="text-3xl font-bold">{analytics.totalProjects}</p>
              <div className="flex items-center text-sm text-muted-foreground mt-1">
                <FolderOpen className="h-4 w-4 mr-1" />
                {analytics.activeProjects} active
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <FolderOpen className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          
          {/* Project status breakdown */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-green-600">Completed: {analytics.completedProjects}</span>
              <span className="text-yellow-600">Planning: {analytics.planningProjects}</span>
              <span className="text-red-600">On Hold: {analytics.onHoldProjects}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Task Completion */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Task Completion</p>
              <p className="text-3xl font-bold">{analytics.overallCompletionRate.toFixed(1)}%</p>
              <div className="flex items-center text-sm text-muted-foreground mt-1">
                <CheckSquare className="h-4 w-4 mr-1" />
                {analytics.completedTasks} of {analytics.totalTasks}
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <Progress value={analytics.overallCompletionRate} className="mt-4" />
        </CardContent>
      </Card>

      {/* Active Tasks */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Tasks</p>
              <p className="text-3xl font-bold">{analytics.inProgressTasks}</p>
              <div className="flex items-center text-sm text-muted-foreground mt-1">
                <Clock className="h-4 w-4 mr-1" />
                In progress
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          
          {analytics.overdueTasks > 0 && (
            <div className="mt-4 flex items-center text-sm text-red-600">
              <AlertTriangle className="h-4 w-4 mr-1" />
              {analytics.overdueTasks} overdue tasks
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team & OKRs */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Team Members</p>
              <p className="text-3xl font-bold">{analytics.totalTeamMembers}</p>
              <div className="flex items-center text-sm text-muted-foreground mt-1">
                <Users className="h-4 w-4 mr-1" />
                {analytics.avgTeamSize.toFixed(1)} avg per project
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          
          {analytics.totalOKRs > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">OKR Progress</span>
                <span className="font-medium">{analytics.okrProgress.toFixed(1)}%</span>
              </div>
              <Progress value={analytics.okrProgress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}