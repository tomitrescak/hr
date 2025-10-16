'use client'

import { useRouter } from 'next/navigation'
import { BookOpen, ExternalLink, Users, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { removeMarkdown } from '@/lib/utils'

interface CourseResult {
  id: string
  name: string
  description?: string | null
  type: string
  duration?: number | null
  url?: string | null
  matchPercentage: number
  matchingCompetencies: Array<{
    id: string
    name: string
    type: string
    proficiency?: string | null
  }>
  totalCompetencies: number
  totalEnrollments: number
}

interface CourseResultsTableProps {
  results: CourseResult[]
  selectedCompetencies: Array<{
    id: string
    name: string
    type: string
  }>
  isLoading?: boolean
}

export function CourseResultsTable({
  results,
  selectedCompetencies,
  isLoading = false
}: CourseResultsTableProps) {
  const router = useRouter()

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8 text-muted-foreground">
          No courses found with at least 75% of the selected skills
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Match</TableHead>
              <TableHead>Matching Skills</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Enrollments</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((course) => (
              <TableRow key={course.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <button
                        onClick={() => router.push(`/courses/${course.id}`)}
                        className="text-left hover:underline font-medium"
                      >
                        {course.name}
                      </button>
                      {course.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {removeMarkdown(course.description)}
                        </p>
                      )}
                    </div>
                    {course.url && (
                      <a
                        href={course.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {course.type.toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={course.matchPercentage === 100 ? 'default' : 'secondary'}
                  >
                    {course.matchPercentage}%
                  </Badge>
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-wrap gap-1 max-w-xs cursor-help">
                          {course.matchingCompetencies.slice(0, 3).map((comp) => (
                            <Badge key={comp.id} variant="outline" className="text-xs">
                              {comp.name}
                              {comp.proficiency && (
                                <span className="ml-1 text-muted-foreground">
                                  ({comp.proficiency})
                                </span>
                              )}
                            </Badge>
                          ))}
                          {course.matchingCompetencies.length > 3 && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              +{course.matchingCompetencies.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <div className="p-2">
                          <p className="font-medium mb-2">
                            Teaches {course.matchingCompetencies.length} of {selectedCompetencies.length} selected skills:
                          </p>
                          <div className="grid gap-1 max-h-32 overflow-y-auto">
                            {course.matchingCompetencies.map((comp) => (
                              <div key={comp.id} className="flex items-center justify-between text-xs">
                                <span>{comp.name}</span>
                                {comp.proficiency && (
                                  <Badge variant="outline" className="text-xs py-0">
                                    {comp.proficiency}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell>
                  {course.duration ? (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <BookOpen className="h-4 w-4 mr-1" />
                      {course.duration}h
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="h-4 w-4 mr-1" />
                    {course.totalEnrollments}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}