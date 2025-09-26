"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { use } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CompetencyGrid } from "@/components/ui/competency"
import { trpc } from "@/lib/trpc/client"
import { Role } from "@prisma/client"
import { ArrowLeft, User, BookOpen, Calendar, History, Edit, Save, X } from "lucide-react"
import Link from "next/link"

interface PersonPageProps {
  params: Promise<{
    id: string
  }>
}

export default function PersonPage({ params }: PersonPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: "", email: "" })
  
  const { data: person, isLoading, refetch } = trpc.people.getById.useQuery({ id })
  const updateMe = trpc.people.updateMe.useMutation()
  const updatePerson = trpc.people.updateById.useMutation()
  
  const handleEditProfile = () => {
    if (!person) return
    setProfileForm({ name: person.name, email: person.email })
    setEditingProfile(true)
  }
  
  const handleSaveProfile = async () => {
    if (!person) return
    
    try {
      // Use updateMe if editing own profile, otherwise use updateById (PM only)
      await updateMe.mutateAsync(profileForm)
      setEditingProfile(false)
      refetch()
    } catch (error) {
      console.error("Failed to update profile:", error)
    }
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!person) {
    return (
      <MainLayout>
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold">Person not found</h1>
          <Link href="/people">
            <Button className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to People
            </Button>
          </Link>
        </div>
      </MainLayout>
    )
  }

  // Convert person competencies to our competency format
  const competencies = (person as any).competencies?.map((pc: any) => ({
    id: pc.competency.id,
    name: pc.competency.name,
    type: pc.competency.type as any,
    description: pc.competency.description || undefined,
    proficiency: pc.proficiency as any,
    lastUpdated: new Date(pc.lastUpdatedAt),
  })) || []

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/people">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <User className="h-6 w-6" />
              {person.name}
            </h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-muted-foreground">{person.email}</span>
              <Badge variant={person.role === Role.PROJECT_MANAGER ? "default" : "secondary"}>
                {person.role === Role.PROJECT_MANAGER ? "Project Manager" : "User"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="competencies" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Competencies
            </TabsTrigger>
            <TabsTrigger value="plan" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Development Plan
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Basic profile information</CardDescription>
                </div>
                {!editingProfile && (
                  <Button variant="outline" size="sm" onClick={handleEditProfile}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {editingProfile ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveProfile} disabled={updateMe.isPending}>
                        <Save className="h-4 w-4 mr-2" />
                        {updateMe.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button variant="outline" onClick={() => setEditingProfile(false)}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <div className="mt-1 text-sm">{person.name}</div>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <div className="mt-1 text-sm text-muted-foreground">{person.email}</div>
                    </div>
                    <div>
                      <Label>Role</Label>
                      <div className="mt-1">
                        <Badge variant={person.role === Role.PROJECT_MANAGER ? "default" : "secondary"}>
                          {person.role === Role.PROJECT_MANAGER ? "Project Manager" : "User"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label>Member Since</Label>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {new Date((person as any).user?.createdAt || Date.now()).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Competencies Tab */}
          <TabsContent value="competencies" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Competencies</CardTitle>
                    <CardDescription>Skills, abilities, and knowledge areas</CardDescription>
                  </div>
                  <Badge variant="secondary">{competencies.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {competencies.length > 0 ? (
                  <CompetencyGrid 
                    competencies={competencies}
                    groupByType={true}
                    showProficiency={true}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No competencies assigned yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Development Plan Tab */}
          <TabsContent value="plan" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Completed Courses */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Completed Courses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4 text-muted-foreground">
                    No completed courses yet
                  </div>
                </CardContent>
              </Card>

              {/* In-Progress Courses */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">In-Progress Courses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4 text-muted-foreground">
                    No courses in progress
                  </div>
                </CardContent>
              </Card>

              {/* Wishlist */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Wishlist</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4 text-muted-foreground">
                    No courses in wishlist
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Change History</CardTitle>
                <CardDescription>Track of all profile and competency changes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  History tracking not implemented yet
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}