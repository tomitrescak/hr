'use client'

import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreateCourseForm } from '@/components/courses/CreateCourseForm'
import { AppLayout } from '@/components/layout/app-layout'

export default function AddCoursePage() {
  const router = useRouter()
  const { data: session } = useSession()

  // Only project managers can create courses
  const canManage = session?.user?.role === 'PROJECT_MANAGER'

  if (!canManage) {
    router.push('/courses')
    return null
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/courses')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Courses
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create New Course</h1>
            <p className="text-muted-foreground">
              Add a new course or specialisation to the learning catalog
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-4xl">
          <div className="bg-card p-6 rounded-lg border">
            <CreateCourseForm
              onSuccess={(courseId) => {
                // Redirect to the created course page
                router.push(`/courses/${courseId}`)
              }}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}