"use client"

import { useState, useEffect } from "react"
import * as React from "react"
import { useRouter } from "next/navigation"
import { use } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CompetencyGrid } from "@/components/ui/competency"
import { trpc } from "@/lib/trpc/client"
import { Role } from "@prisma/client"
import { ArrowLeft, User, BookOpen, Calendar, MessageSquare, Edit, Save, X, Grid3X3, List, Plus, Trash2, Settings, ChevronUp, ChevronDown, CheckSquare, CheckCircle, ExternalLink, Mic, MicOff, Loader2 as LoaderIcon, FileText, Square } from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useViewPreference } from "@/lib/use-view-preference"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Search } from 'lucide-react'
import { DevelopmentPlan } from '@/components/courses/DevelopmentPlan'
import { CompetencyExtractor } from '@/components/courses/CompetencyExtractor'
import { Avatar } from '@/components/ui/avatar'
import { ImageCropper } from '@/components/ui/image-cropper'
import CVFileUpload from '@/components/CVFileUpload'
import { marked } from 'marked'
import { supportsProficiency } from '@/lib/utils/competency'
import { processCourseDescription } from '@/lib/utils'

interface PersonPageProps {
  params: Promise<{
    id: string
  }>
}

export default function PersonPage({ params }: PersonPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const [editingProfile, setEditingProfile] = useState(false)
  const [competencyView, setCompetencyView] = useViewPreference('person-competencies-view', 'cards')
  const [addCompetencyOpen, setAddCompetencyOpen] = useState(false)
  const [editCompetencyOpen, setEditCompetencyOpen] = useState(false)
  const [selectedCompetency, setSelectedCompetency] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('profile')
  
  // Handle URL hash for tab switching (e.g., when coming back from review page)
  React.useEffect(() => {
    const hash = window.location.hash.substring(1)
    if (hash && ['profile', 'competencies', 'tasks', 'plan', 'reviews'].includes(hash)) {
      setActiveTab(hash)
    }
  }, [])
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'proficiency' | 'lastUpdated' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [taskSortBy, setTaskSortBy] = useState<'title' | 'dueDate' | 'priority' | 'state' | 'project' | null>(null)
  const [taskSortDirection, setTaskSortDirection] = useState<'asc' | 'desc'>('asc')
  const [taskStateFilter, setTaskStateFilter] = useState<string>('all')
  const [profileForm, setProfileForm] = useState({ 
    name: "", 
    email: "", 
    role: "USER" as Role,
    entryDate: "",
    cv: "",
    photo: ""
  })
  
  // Reviews state
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [transcribedText, setTranscribedText] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzedData, setAnalyzedData] = useState<{
    notes: string;
    competencies: string;
    positive: string;
    negative: string;
    tasks: string[];
  } | null>(null)
  const [newReviewForm, setNewReviewForm] = useState({
    notes: '',
    recordingText: ''
  })
  const [showReviewForm, setShowReviewForm] = useState(false)
  
  // Real-time transcription state
  const [isLiveTranscribing, setIsLiveTranscribing] = useState(false)
  const [recognition, setRecognition] = useState<any | null>(null)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [useRealTimeTranscription, setUseRealTimeTranscription] = useState(true)
  const [editingAnalysis, setEditingAnalysis] = useState(false)
  
  // CV upload state
  const [cvUploadError, setCvUploadError] = useState('')
  
  // Photo upload state
  const [showPhotoCropper, setShowPhotoCropper] = useState(false)
  
  
  const { data: person, isLoading, refetch } = trpc.people.getById.useQuery({ id })
  const updateMe = trpc.people.updateMe.useMutation()
  const updatePerson = trpc.people.updateById.useMutation()
  const { data: allCompetencies } = trpc.competencies.list.useQuery({})
  const upsertCompetency = trpc.people.upsertCompetency.useMutation()
  const removeCompetency = trpc.people.removeCompetency.useMutation()
  const createCompetency = trpc.competencies.create.useMutation()
  const { data: tasksData } = trpc.people.getTasksForPerson.useQuery({ personId: id })
  
  // Person reviews data
  const { data: personReviews, refetch: refetchReviews } = trpc.personReviews.getByPersonId.useQuery({ personId: id })
  const createPersonReview = trpc.personReviews.create.useMutation()
  
  // Convert person competencies to our competency format
  const competencies = React.useMemo(() => {
    return (person as any)?.competencies?.map((pc: any) => ({
      id: pc.competency.id,
      name: pc.competency.name,
      type: pc.competency.type as any,
      description: pc.competency.description || undefined,
      proficiency: pc.proficiency as any,
      lastUpdated: new Date(pc.lastUpdatedAt),
    })) || []
  }, [person])

  // Handle sorting
  const handleSort = (column: 'name' | 'type' | 'proficiency' | 'lastUpdated') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortDirection('asc')
    }
  }

  // Sort competencies
  const sortedCompetencies = React.useMemo(() => {
    if (!sortBy) return competencies
    
    return [...competencies].sort((a, b) => {
      let aValue: any
      let bValue: any
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'type':
          aValue = a.type
          bValue = b.type
          break
        case 'proficiency':
          // Define proficiency order for sorting
          const proficiencyOrder = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3, EXPERT: 4 }
          aValue = a.proficiency ? proficiencyOrder[a.proficiency as keyof typeof proficiencyOrder] || 0 : 0
          bValue = b.proficiency ? proficiencyOrder[b.proficiency as keyof typeof proficiencyOrder] || 0 : 0
          break
        case 'lastUpdated':
          aValue = a.lastUpdated.getTime()
          bValue = b.lastUpdated.getTime()
          break
        default:
          return 0
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [competencies, sortBy, sortDirection])
  
  // Handle task sorting
  const handleTaskSort = (column: 'title' | 'dueDate' | 'priority' | 'state' | 'project') => {
    if (taskSortBy === column) {
      setTaskSortDirection(taskSortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setTaskSortBy(column)
      setTaskSortDirection('asc')
    }
  }

  // Sort and filter tasks
  const sortedAndFilteredTasks = React.useMemo(() => {
    if (!tasksData?.allTasks) return []
    
    let filtered = [...tasksData.allTasks]
    
    // Apply state filter
    if (taskStateFilter !== 'all') {
      filtered = filtered.filter(task => task.state === taskStateFilter)
    }
    
    // Apply sorting
    if (!taskSortBy) return filtered
    
    return filtered.sort((a, b) => {
      let aValue: any
      let bValue: any
      
      switch (taskSortBy) {
        case 'title':
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case 'dueDate':
          aValue = a.dueDate ? new Date(a.dueDate).getTime() : 0
          bValue = b.dueDate ? new Date(b.dueDate).getTime() : 0
          break
        case 'priority':
          const priorityOrder = { LOW: 1, MEDIUM: 2, HIGH: 3 }
          aValue = a.priority ? priorityOrder[a.priority as keyof typeof priorityOrder] || 0 : 0
          bValue = b.priority ? priorityOrder[b.priority as keyof typeof priorityOrder] || 0 : 0
          break
        case 'state':
          const stateOrder = { BACKLOG: 1, READY: 2, IN_PROGRESS: 3, BLOCKED: 4, REVIEW: 5, DONE: 6 }
          aValue = stateOrder[a.state as keyof typeof stateOrder] || 0
          bValue = stateOrder[b.state as keyof typeof stateOrder] || 0
          break
        case 'project':
          aValue = a.project?.name.toLowerCase() || ''
          bValue = b.project?.name.toLowerCase() || ''
          break
        default:
          return 0
      }
      
      if (aValue < bValue) return taskSortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return taskSortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [tasksData?.allTasks, taskSortBy, taskSortDirection, taskStateFilter])
  
  const handleEditProfile = () => {
    if (!person) return
    setProfileForm({ 
      name: person.name, 
      email: person.email,
      role: person.role,
      entryDate: person.entryDate ? new Date(person.entryDate).toISOString().split('T')[0] : "",
      cv: person.cv || "",
      photo: ""
    })
    setEditingProfile(true)
  }
  
  const handleSaveProfile = async () => {
    if (!person) return
    
    try {
      const updates = {
        name: profileForm.name,
        email: profileForm.email,
        entryDate: profileForm.entryDate ? new Date(profileForm.entryDate).toISOString() : undefined,
        cv: profileForm.cv,
        photo: profileForm.photo || undefined,
        ...(session?.user?.role === 'PROJECT_MANAGER' && { role: profileForm.role })
      }
      
      if (session?.user?.role === 'PROJECT_MANAGER') {
        await updatePerson.mutateAsync({ id: person.id, ...updates })
      } else {
        await updateMe.mutateAsync(updates)
      }
      
      setEditingProfile(false)
      refetch()
    } catch (error) {
      console.error("Failed to update profile:", error)
    }
  }

  // Check if current user can manage this person's competencies
  const canManageCompetencies = !!(session?.user?.role === 'PROJECT_MANAGER' || 
    (session?.user?.id && person?.userId === session.user.id))

  // Real-time speech recognition setup
  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition
      const recognitionInstance = new SpeechRecognition()
      
      recognitionInstance.continuous = true
      recognitionInstance.interimResults = true
      recognitionInstance.lang = 'en-US'
      
      recognitionInstance.onstart = () => {
        setIsLiveTranscribing(true)
      }
      
      recognitionInstance.onresult = (event: any) => {
        let finalTranscript = ''
        let interimTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }
        
        if (finalTranscript) {
          setLiveTranscript(prev => prev + finalTranscript + ' ')
          setTranscribedText(prev => prev + finalTranscript + ' ')
        }
      }
      
      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
      }
      
      recognitionInstance.onend = () => {
        setIsLiveTranscribing(false)
      }
      
      setRecognition(recognitionInstance)
    }
  }, [])

  // Recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: BlobPart[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
      
      // Start real-time transcription if enabled and available
      if (useRealTimeTranscription && recognition) {
        setLiveTranscript('')
        recognition.start()
      }
      
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
      setIsRecording(false)
    }
    
    // Stop real-time transcription
    if (recognition && isLiveTranscribing) {
      recognition.stop()
    }
  }

  const transcribeAudio = async () => {
    if (!audioBlob) return

    // If we already have real-time transcription, ask user if they want to use OpenAI instead
    if (useRealTimeTranscription && transcribedText.length > 0) {
      const useOpenAI = confirm(
        'You already have real-time transcription. Do you want to use OpenAI Whisper for better accuracy? This will replace the current transcription.'
      )
      if (!useOpenAI) return
    }

    setIsTranscribing(true)
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('model', 'whisper-1')

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || errorData.error || 'Transcription failed')
      }

      const data = await response.json()
      setTranscribedText(data.text)
      setNewReviewForm(prev => ({...prev, recordingText: data.text}))
    } catch (error) {
      console.error('Transcription error:', error)
      alert(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsTranscribing(false)
    }
  }

  const analyzeTranscription = async () => {
    if (!transcribedText) return

    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/analyze-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: transcribedText }),
      })

      if (!response.ok) {
        throw new Error('Analysis failed')
      }

      const data = await response.json()
      setAnalyzedData(data)
      
      // Automatically populate the final notes with the formatted markdown
      const markdownNotes = formatAnalyzedDataAsMarkdown(data)
      setNewReviewForm(prev => ({...prev, notes: markdownNotes}))
      
    } catch (error) {
      console.error('Analysis error:', error)
      alert('Failed to analyze transcription. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const resetReviewForm = () => {
    setIsRecording(false)
    setAudioBlob(null)
    setMediaRecorder(null)
    setTranscribedText('')
    setLiveTranscript('')
    setAnalyzedData(null)
    setEditingAnalysis(false)
    setNewReviewForm({ notes: '', recordingText: '' })
    
    // Stop recognition if running
    if (recognition && isLiveTranscribing) {
      recognition.stop()
    }
  }

  const saveReview = async () => {
    if (!person || !transcribedText || !newReviewForm.notes) return

    try {
      await createPersonReview.mutateAsync({
        personId: person.id,
        recordingText: transcribedText,
        notes: newReviewForm.notes,
      })
      
      setShowReviewForm(false)
      resetReviewForm()
      refetchReviews()
      alert('Review saved successfully!')
    } catch (error) {
      console.error('Error saving review:', error)
      alert('Failed to save review. Please try again.')
    }
  }

  // Helper function to format analyzed data as markdown
  const formatAnalyzedDataAsMarkdown = (data: typeof analyzedData): string => {
    if (!data) return ''
    
    const tasksMarkdown = data.tasks.length > 0 
      ? data.tasks.map(task => `- ${task}`).join('\n')
      : '- No action items identified'

    return `# 1:1 Meeting Analysis

## Summary
${data.notes || 'No summary available'}

## Competencies Mentioned
${data.competencies || 'No competencies identified'}

## Positive Highlights
${data.positive || 'No positive points identified'}

## Areas for Improvement
${data.negative || 'No improvement areas identified'}

## Action Items
${tasksMarkdown}`
  }

  // Helper function to parse markdown back to analyzed data structure
  const updateAnalyzedDataFromMarkdown = (markdown: string) => {
    try {
      // Simple markdown parsing - look for sections
      const sections = {
        notes: extractSection(markdown, '## Summary', '## Competencies Mentioned'),
        competencies: extractSection(markdown, '## Competencies Mentioned', '## Positive Highlights'),
        positive: extractSection(markdown, '## Positive Highlights', '## Areas for Improvement'),
        negative: extractSection(markdown, '## Areas for Improvement', '## Action Items'),
        tasks: extractTasksList(markdown)
      }
      
      setAnalyzedData(sections)
      
      // Also update the final notes with the modified markdown
      setNewReviewForm(prev => ({...prev, notes: markdown}))
    } catch (error) {
      console.error('Error parsing markdown:', error)
    }
  }

  // Helper to extract content between two headings
  const extractSection = (text: string, startHeading: string, endHeading: string): string => {
    const startIndex = text.indexOf(startHeading)
    if (startIndex === -1) return ''
    
    const contentStart = startIndex + startHeading.length
    const endIndex = text.indexOf(endHeading, contentStart)
    
    const content = endIndex === -1 
      ? text.substring(contentStart).trim()
      : text.substring(contentStart, endIndex).trim()
    
    return content.replace(/^\n+|\n+$/g, '') // Remove leading/trailing newlines
  }

  // Helper to extract tasks list
  const extractTasksList = (text: string): string[] => {
    const actionItemsIndex = text.indexOf('## Action Items')
    if (actionItemsIndex === -1) return []
    
    const tasksSection = text.substring(actionItemsIndex + '## Action Items'.length).trim()
    const lines = tasksSection.split('\n')
    
    const tasks = lines
      .filter(line => line.trim().startsWith('- '))
      .map(line => line.trim().substring(2).trim())
      .filter(task => task.length > 0 && task !== 'No action items identified')
    
    return tasks
  }

  // Markdown to HTML conversion using marked package
  const markdownToHtml = (markdown: string): string => {
    if (!markdown) return ''
    
    try {
      return marked(markdown) as string
    } catch (error) {
      console.error('Error converting markdown to HTML:', error)
      return `<p>${markdown}</p>`
    }
  }


  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!person) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold">Person not found</h1>
          <Link href="/people">
            <Button className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to People
            </Button>
          </Link>
        </div>
      </AppLayout>
    )
  }

  // Calculate tenure
  const calculateTenure = (entryDate: Date | string) => {
    const entry = new Date(entryDate)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - entry.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const years = Math.floor(diffDays / 365)
    const months = Math.floor((diffDays % 365) / 30)
    const days = diffDays % 30
    
    const parts = []
    if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`)
    if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`)
    if (days > 0 && years === 0) parts.push(`${days} day${days > 1 ? 's' : ''}`)
    
    return parts.length > 0 ? parts.join(', ') : 'Less than a day'
  }

  const handleAddCompetency = async (competencyId: string, proficiency?: string) => {
    if (!person) return
    try {
      await upsertCompetency.mutateAsync({
        personId: person.id,
        competencyId,
        proficiency: proficiency as any
      })
      setAddCompetencyOpen(false)
      refetch()
    } catch (error) {
      console.error('Failed to add competency:', error)
    }
  }

  const handleEditCompetency = async (competencyId: string, proficiency?: string) => {
    if (!person) return
    try {
      await upsertCompetency.mutateAsync({
        personId: person.id,
        competencyId,
        proficiency: proficiency as any
      })
      setEditCompetencyOpen(false)
      setSelectedCompetency(null)
      refetch()
    } catch (error) {
      console.error('Failed to update competency:', error)
    }
  }

  const handleRemoveCompetency = async (competencyId: string, competencyName: string) => {
    if (!person) return
    if (!confirm(`Are you sure you want to remove "${competencyName}" from ${person.name}?`)) return
    
    try {
      await removeCompetency.mutateAsync({
        personId: person.id,
        competencyId
      })
      refetch()
    } catch (error) {
      console.error('Failed to remove competency:', error)
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/people">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Avatar
            personId={person.id}
            name={person.name}
            size={80}
            className="ring-2 ring-background shadow-lg"
          />
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
        <Tabs value={activeTab} onValueChange={(tab) => {
          setActiveTab(tab)
          // Update URL hash to remember tab state
          window.history.replaceState(null, '', `#${tab}`)
        }} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="competencies" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Competencies
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="plan" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Development Plan
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Reviews
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
                      {session?.user?.role === 'PROJECT_MANAGER' && (
                        <div className="space-y-2">
                          <Label htmlFor="role">Role</Label>
                          <Select
                            value={profileForm.role}
                            onValueChange={(value) => setProfileForm(prev => ({ ...prev, role: value as Role }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USER">User</SelectItem>
                              <SelectItem value="PROJECT_MANAGER">Project Manager</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="entryDate">Entry Date</Label>
                        <Input
                          id="entryDate"
                          type="date"
                          value={profileForm.entryDate}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, entryDate: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    {/* Photo Upload Section */}
                    <div className="space-y-4">
                      <Label>Profile Photo</Label>
                      <div className="flex items-start gap-6">
                        <div className="flex flex-col items-center gap-4">
                          <Avatar
                            personId={person.id}
                            name={person.name}
                            size={120}
                            className="ring-2 ring-muted"
                            previewPhoto={profileForm.photo}
                          />
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">
                              {profileForm.photo ? 'Preview' : 'Current Photo'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex-1 space-y-4">
                          {!showPhotoCropper ? (
                            <div className="p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50/50">
                              <h4 className="font-medium text-gray-900 mb-2">Upload New Photo</h4>
                              <p className="text-sm text-gray-600 mb-4">
                                Choose a JPEG image to crop for your profile photo
                              </p>
                              <Button
                                type="button"
                                onClick={() => setShowPhotoCropper(true)}
                                className="w-full"
                              >
                                Select & Crop Photo
                              </Button>
                              <div className="mt-2 text-xs text-gray-500">
                                Final size: 200×200px • Under 200KB • JPEG format
                              </div>
                            </div>
                          ) : (
                            <ImageCropper
                              onCrop={(croppedBase64) => {
                                setProfileForm(prev => ({ ...prev, photo: croppedBase64 }))
                                setShowPhotoCropper(false)
                              }}
                              onCancel={() => setShowPhotoCropper(false)}
                            />
                          )}
                          
                          {profileForm.photo && !showPhotoCropper && (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 text-sm text-green-600">
                                ✓ New photo cropped and ready to save
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setProfileForm(prev => ({ ...prev, photo: "" }))}
                              >
                                Remove
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                        
                        
                        {/* Manual Text Entry */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xl">
                            <Label htmlFor="cv" className="text-xl">CV / Resume</Label>
                            <span className="text-xs text-gray-500">
                              {profileForm.cv.length} characters
                            </span>
                          </div>
                          <Textarea
                            id="cv"
                            value={profileForm.cv}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, cv: e.target.value }))}
                            rows={8}
                            placeholder="Paste your CV or resume content here for AI competency extraction..."
                          />
                          <p className="text-xs text-gray-500">
                            The CV content will be used for automatic competency extraction using AI
                          </p>
                        </div>

                      {/* File Upload Section */}
                        <div className="p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50/50">
                          <h4 className="font-medium text-gray-900 mb-2 text-xl">Upload CV File</h4>
                          <p className="text-sm text-gray-600 mb-4">
                            Upload your CV file for automatic processing and competency extraction
                          </p>
                          <CVFileUpload
                            onFileProcessed={(content) => {
                              setProfileForm(prev => ({ ...prev, cv: content }))
                              setCvUploadError('')
                            }}
                            onError={(error) => setCvUploadError(error)}
                            className=""
                          />
                          {cvUploadError && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                              {cvUploadError}
                            </div>
                          )}
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={handleSaveProfile} disabled={updateMe.isPending || updatePerson.isPending}>
                        <Save className="h-4 w-4 mr-2" />
                        {(updateMe.isPending || updatePerson.isPending) ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button variant="outline" onClick={() => setEditingProfile(false)}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </>
) : (
                  <div className="space-y-6">
                    <div className="flex items-start gap-6 mb-6 p-6 bg-muted/30 rounded-lg">
                      <Avatar
                        personId={person.id}
                        name={person.name}
                        size={120}
                        className="ring-4 ring-background shadow-lg"
                      />
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">{person.name}</h3>
                        <div className="grid grid-cols-2 gap-4">
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
                            <Label>Time in Company</Label>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {person.entryDate ? calculateTenure(person.entryDate) : 'Not available'}
                            </div>
                          </div>
                          <div>
                            <Label>Member Since</Label>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {new Date((person as any).user?.createdAt || Date.now()).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    
                    
                    {/* Courses Section */}
                    {(person as any).courseEnrollments && (person as any).courseEnrollments.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <BookOpen className="h-5 w-5" />
                          <h3 className="text-lg font-semibold">Courses</h3>
                          <Badge variant="secondary">
                            {(person as any).courseEnrollments.length}
                          </Badge>
                        </div>
                        <div className="border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Course</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Progress</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Enrolled</TableHead>
                                <TableHead>Completed</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(person as any).courseEnrollments.map((enrollment: any) => {
                                const statusConfig = {
                                  WISHLIST: {
                                    label: 'Wishlist',
                                    className: 'bg-gray-100 text-gray-800',
                                    icon: BookOpen
                                  },
                                  IN_PROGRESS: {
                                    label: 'In Progress', 
                                    className: 'bg-blue-100 text-blue-800',
                                    icon: Calendar
                                  },
                                  COMPLETED: {
                                    label: 'Completed',
                                    className: 'bg-green-100 text-green-800', 
                                    icon: CheckCircle
                                  }
                                }
                                const config = statusConfig[enrollment.status as keyof typeof statusConfig] || statusConfig.WISHLIST
                                const StatusIcon = config.icon
                                
                                return (
                                  <TableRow key={enrollment.id}>
                                    <TableCell>
                                      <div>
                                        <Link href={`/courses/${enrollment.course.id}`}>
                                          <div className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                                            {enrollment.course.name}
                                          </div>
                                        </Link>
                                        {enrollment.course.description && (
                                          <div className="text-sm text-muted-foreground mt-1 max-w-xs truncate">
                                            {processCourseDescription(enrollment.course.description, 150)}
                                          </div>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className={config.className}>
                                        <StatusIcon className="h-3 w-3 mr-1" />
                                        {config.label}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <div className="w-16 bg-gray-200 rounded-full h-2">
                                          <div 
                                            className="bg-blue-600 h-2 rounded-full" 
                                            style={{ width: `${enrollment.progress || 0}%` }}
                                          ></div>
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                          {enrollment.progress || 0}%
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      {enrollment.course.duration ? `${enrollment.course.duration}h` : '-'}
                                    </TableCell>
                                    <TableCell>
                                      <span className="text-sm text-muted-foreground">
                                        {new Date(enrollment.enrolledAt).toLocaleDateString()}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      {enrollment.completedAt ? (
                                        <span className="text-sm text-muted-foreground">
                                          {new Date(enrollment.completedAt).toLocaleDateString()}
                                        </span>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">-</span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                    
                    {/* CV Section */}
                    {person.cv && (
                      <div>
                        
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 mb-4"> <BookOpen className="h-5 w-5" /> CV / Resume</h3>
                        
                        <hr className="mb-4" />
                        <div 
                          className="cv-content"
                          dangerouslySetInnerHTML={{ __html: markdownToHtml(person.cv) }}
                        />
                      </div>
                    )}
                  </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

          {/* Competencies Tab */}
          <TabsContent value="competencies" className="space-y-4">
            {/* AI Competency Extraction from CV */}
            {person.cv && (
              <CompetencyExtractor
                entityId={person.id}
                entityName={person.name}
                content={`Person: ${person.name}\nCV Content:\n${person.cv}`}
                contextMessage="Use AI to automatically identify and extract competencies from this person's CV content. This will analyze their experience, skills, and qualifications to suggest relevant competencies."
                onCompetencyAdded={() => refetch()}
                canManage={canManageCompetencies}
                iconColor="text-blue-600"
                buttonColor="bg-blue-600 hover:bg-blue-700"
                onAddCompetency={async (competencyId: string, proficiency?: string) => {
                  await upsertCompetency.mutateAsync({
                    personId: person.id,
                    competencyId,
                    proficiency: proficiency as any,
                  })
                }}
                createCompetency={createCompetency}
                allCompetencies={allCompetencies || []}
              />
            )}
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Competencies ({sortedCompetencies.length})</h2>
                <p className="text-sm text-muted-foreground">Skills, abilities, and knowledge areas</p>
              </div>
              
              <div className="flex items-center gap-4">
                {canManageCompetencies && (
                  <Dialog open={addCompetencyOpen} onOpenChange={setAddCompetencyOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Competency
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add Competency</DialogTitle>
                      </DialogHeader>
                      <AddCompetencyForm
                        availableCompetencies={allCompetencies || []}
                        existingCompetencies={competencies}
                        onAdd={handleAddCompetency}
                        onCancel={() => setAddCompetencyOpen(false)}
                        createCompetency={createCompetency}
                        canCreateCompetency={session?.user?.role === 'PROJECT_MANAGER'}
                      />
                    </DialogContent>
                  </Dialog>
                )}
                
                {/* View Toggle */}
                <div className="flex items-center">
                  <span className="text-sm text-muted-foreground mr-3">View:</span>
                  <div className="flex border border-input rounded-lg overflow-hidden">
                    <Button
                      variant={competencyView === 'cards' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setCompetencyView('cards')}
                      className="rounded-none border-0 px-3 py-1"
                      title="Cards View"
                    >
                      <Grid3X3 className="h-4 w-4 mr-1" />
                      Cards
                    </Button>
                    <Button
                      variant={competencyView === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setCompetencyView('list')}
                      className="rounded-none border-0 px-3 py-1 border-l"
                      title="List View"
                    >
                      <List className="h-4 w-4 mr-1" />
                      List
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {sortedCompetencies.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8 text-muted-foreground">
                  No competencies assigned yet
                </CardContent>
              </Card>
            ) : competencyView === 'cards' ? (
              /* Cards View */
              <CompetencyGrid 
                competencies={sortedCompetencies}
                groupByType={true}
                showProficiency={true}
              />
            ) : (
              /* List View */
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer select-none hover:bg-muted/50"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center gap-1">
                            Competency
                            {sortBy === 'name' && (
                              sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer select-none hover:bg-muted/50"
                          onClick={() => handleSort('type')}
                        >
                          <div className="flex items-center gap-1">
                            Type
                            {sortBy === 'type' && (
                              sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer select-none hover:bg-muted/50"
                          onClick={() => handleSort('proficiency')}
                        >
                          <div className="flex items-center gap-1">
                            Proficiency
                            {sortBy === 'proficiency' && (
                              sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer select-none hover:bg-muted/50"
                          onClick={() => handleSort('lastUpdated')}
                        >
                          <div className="flex items-center gap-1">
                            Last Updated
                            {sortBy === 'lastUpdated' && (
                              sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead>Description</TableHead>
                        {canManageCompetencies && <TableHead></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedCompetencies.map((competency: any) => {
                        const showProficiencyForType = supportsProficiency(competency.type)
                        return (
                          <TableRow key={competency.id}>
                            <TableCell className="font-medium">
                              {competency.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                {competency.type.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {showProficiencyForType && competency.proficiency ? (
                                <Badge variant="outline" className={
                                  competency.proficiency === 'EXPERT' ? 'bg-green-100 text-green-800' :
                                  competency.proficiency === 'ADVANCED' ? 'bg-blue-100 text-blue-800' :
                                  competency.proficiency === 'INTERMEDIATE' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }>
                                  {competency.proficiency}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {competency.lastUpdated.toLocaleDateString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground max-w-xs truncate">
                                {competency.description || '-'}
                              </span>
                            </TableCell>
                            {canManageCompetencies && (
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedCompetency(competency)
                                      setEditCompetencyOpen(true)
                                    }}
                                  >
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveCompetency(competency.id, competency.name)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
            
            {/* Edit Competency Dialog */}
            {canManageCompetencies && (
              <Dialog open={editCompetencyOpen} onOpenChange={setEditCompetencyOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Edit Competency</DialogTitle>
                  </DialogHeader>
                  {selectedCompetency && (
                    <EditCompetencyForm
                      competency={selectedCompetency}
                      onSave={handleEditCompetency}
                      onCancel={() => {
                        setEditCompetencyOpen(false)
                        setSelectedCompetency(null)
                      }}
                    />
                  )}
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Tasks ({sortedAndFilteredTasks.length})</h2>
                <p className="text-sm text-muted-foreground">
                  {tasksData?.summary?.active || 0} active, {tasksData?.summary?.completed || 0} completed
                </p>
              </div>
              
              {/* Filter by State */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Filter:</span>
                  <Select value={taskStateFilter} onValueChange={setTaskStateFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      <SelectItem value="BACKLOG">Backlog</SelectItem>
                      <SelectItem value="READY">Ready</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="BLOCKED">Blocked</SelectItem>
                      <SelectItem value="REVIEW">Review</SelectItem>
                      <SelectItem value="DONE">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Task Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Total Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tasksData?.summary?.total || 0}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Active Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{tasksData?.summary?.active || 0}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{tasksData?.summary?.completed || 0}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Completion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {tasksData?.summary?.total ? Math.round((tasksData.summary.completed / tasksData.summary.total) * 100) : 0}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tasks List */}
            {sortedAndFilteredTasks.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer select-none hover:bg-muted/50"
                          onClick={() => handleTaskSort('title')}
                        >
                          <div className="flex items-center gap-1">
                            Task
                            {taskSortBy === 'title' && (
                              taskSortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer select-none hover:bg-muted/50"
                          onClick={() => handleTaskSort('project')}
                        >
                          <div className="flex items-center gap-1">
                            Project
                            {taskSortBy === 'project' && (
                              taskSortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer select-none hover:bg-muted/50"
                          onClick={() => handleTaskSort('priority')}
                        >
                          <div className="flex items-center gap-1">
                            Priority
                            {taskSortBy === 'priority' && (
                              taskSortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer select-none hover:bg-muted/50"
                          onClick={() => handleTaskSort('state')}
                        >
                          <div className="flex items-center gap-1">
                            State
                            {taskSortBy === 'state' && (
                              taskSortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer select-none hover:bg-muted/50"
                          onClick={() => handleTaskSort('dueDate')}
                        >
                          <div className="flex items-center gap-1">
                            Due Date
                            {taskSortBy === 'dueDate' && (
                              taskSortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedAndFilteredTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{task.title}</div>
                              {task.description && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  {task.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {task.project ? (
                              <Link href={`/projects/${task.project.id}`}>
                                <Button variant="link" className="p-0 h-auto text-left justify-start text-blue-600 hover:text-blue-800">
                                  {task.project.name}
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </Button>
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {task.priority ? (
                              <Badge 
                                variant="outline" 
                                className={
                                  task.priority === 'HIGH' ? 'bg-red-50 text-red-700' :
                                  task.priority === 'MEDIUM' ? 'bg-yellow-50 text-yellow-700' :
                                  'bg-green-50 text-green-700'
                                }
                              >
                                {task.priority}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline"
                              className={
                                task.state === 'DONE' ? 'bg-green-50 text-green-700' :
                                task.state === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700' :
                                task.state === 'BLOCKED' ? 'bg-red-50 text-red-700' :
                                task.state === 'REVIEW' ? 'bg-purple-50 text-purple-700' :
                                'bg-gray-50 text-gray-700'
                              }
                            >
                              {task.state.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {task.dueDate ? (
                              <span className="text-sm">
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8 text-muted-foreground">
                  {taskStateFilter === 'all' ? 'No tasks assigned yet' : `No tasks with state: ${taskStateFilter.replace('_', ' ')}`}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Development Plan Tab */}
          <TabsContent value="plan" className="space-y-4">
            <DevelopmentPlan 
              personId={person.id} 
              canManage={canManageCompetencies}
            />
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">1:1 Reviews</h2>
                <p className="text-sm text-muted-foreground">Bi-weekly 1:1 meeting records</p>
              </div>
              <Button onClick={() => setShowReviewForm(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Review
              </Button>
            </div>

            {/* Add Review Form */}
            {showReviewForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Add New Review</CardTitle>
                  <CardDescription>Record and transcribe a 1:1 meeting</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Transcription Options */}
                  {typeof window !== 'undefined' && 'webkitSpeechRecognition' in window && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="realTimeTranscription"
                          checked={useRealTimeTranscription}
                          onChange={(e) => setUseRealTimeTranscription(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="realTimeTranscription" className="text-sm">
                          Enable real-time transcription during recording
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {useRealTimeTranscription 
                          ? 'Speech will be transcribed live as you speak' 
                          : 'Audio will be transcribed after recording using OpenAI Whisper'
                        }
                      </p>
                    </div>
                  )}

                  {/* Recording Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          isRecording ? 'bg-red-100' : 'bg-blue-100'
                        }`}>
                          {isRecording ? (
                            <MicOff className="h-6 w-6 text-red-600" />
                          ) : (
                            <Mic className="h-6 w-6 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium">
                            {isRecording ? 'Recording in progress...' : 'Ready to record'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {isRecording ? 
                              (useRealTimeTranscription && isLiveTranscribing ? 
                                'Recording and transcribing live...' : 
                                'Click stop when finished'
                              ) : 
                              'Click record to start'
                            }
                          </p>
                          {isLiveTranscribing && (
                            <div className="flex items-center space-x-2 mt-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-xs text-green-600">Live transcription active</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={isRecording ? stopRecording : startRecording}
                        variant={isRecording ? 'destructive' : 'default'}
                      >
                        {isRecording ? (
                          <><Square className="h-4 w-4 mr-2" />Stop Recording</>
                        ) : (
                          <><Mic className="h-4 w-4 mr-2" />Record</>
                        )}
                      </Button>
                    </div>

                    {/* Transcription Section */}
                    {audioBlob && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Recording Complete</h4>
                          <div className="flex space-x-2">
                            <Button
                              onClick={transcribeAudio}
                              disabled={isTranscribing}
                              size="sm"
                              variant={transcribedText && useRealTimeTranscription ? "outline" : "default"}
                            >
                              {isTranscribing ? (
                                <><LoaderIcon className="h-4 w-4 mr-2 animate-spin" />Transcribing...</>
                              ) : transcribedText && useRealTimeTranscription ? (
                                <><FileText className="h-4 w-4 mr-2" />Re-transcribe with AI</>
                              ) : (
                                <><FileText className="h-4 w-4 mr-2" />Transcribe with AI</>
                              )}
                            </Button>
                            {transcribedText && (
                              <Button
                                onClick={analyzeTranscription}
                                disabled={isAnalyzing}
                                size="sm"
                                variant="secondary"
                              >
                                {isAnalyzing ? (
                                  <><LoaderIcon className="h-4 w-4 mr-2 animate-spin" />Analyzing...</>
                                ) : (
                                  <><MessageSquare className="h-4 w-4 mr-2" />Extract Notes</>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {/* Audio Player */}
                        <audio controls className="w-full">
                          <source src={URL.createObjectURL(audioBlob)} type="audio/webm" />
                        </audio>
                      </div>
                    )}

                    {/* Live Transcription Display */}
                    {useRealTimeTranscription && (isRecording || liveTranscript) && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Label>Live Transcription</Label>
                          {isLiveTranscribing && (
                            <div className="flex items-center space-x-1">
                              <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse"></div>
                              <span className="text-xs text-red-500">Live</span>
                            </div>
                          )}
                        </div>
                        <div className="p-3 bg-gray-50 border rounded-md min-h-24 max-h-32 overflow-y-auto">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {transcribedText || 'Speech will appear here as you talk...'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Transcribed Text */}
                    {transcribedText && (
                      <div className="space-y-2">
                        <Label>Transcribed Text (Editable)</Label>
                        <Textarea
                          value={transcribedText}
                          onChange={(e) => setTranscribedText(e.target.value)}
                          rows={6}
                          placeholder="Transcribed conversation will appear here..."
                        />
                        <p className="text-xs text-muted-foreground">
                          You can edit the transcription above before analyzing or saving.
                        </p>
                      </div>
                    )}

                    {/* Formatted Analysis Output */}
                    {analyzedData && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Analysis Results</h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingAnalysis(!editingAnalysis)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            {editingAnalysis ? 'View' : 'Edit'} Analysis
                          </Button>
                        </div>
                        
                        {editingAnalysis ? (
                          <div className="space-y-2">
                            <Textarea
                              value={formatAnalyzedDataAsMarkdown(analyzedData)}
                              onChange={(e) => updateAnalyzedDataFromMarkdown(e.target.value)}
                              rows={12}
                              placeholder="Edit the markdown analysis..."
                              className="font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                              Edit the markdown above to modify the extracted information.
                            </p>
                          </div>
                        ) : (
                          <div className="p-4 bg-white border rounded-lg prose prose-sm max-w-none">
                            <div dangerouslySetInnerHTML={{ __html: markdownToHtml(formatAnalyzedDataAsMarkdown(analyzedData)) }} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Final Review Form */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Final Notes</Label>
                        <Textarea
                          value={newReviewForm.notes}
                          onChange={(e) => setNewReviewForm(prev => ({...prev, notes: e.target.value}))}
                          rows={8}
                          placeholder={analyzedData ? "Analyzed data will be formatted here..." : "Final review notes..."}
                          className={analyzedData ? "font-mono text-sm" : ""}
                        />
                        <p className="text-xs text-muted-foreground">
                          {analyzedData 
                            ? "Markdown-formatted analysis from AI extraction. You can edit this before saving."
                            : "Enter your final review notes here, or use the 'Extract Notes' button above to analyze the transcription."
                          }
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowReviewForm(false)
                          resetReviewForm()
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={saveReview}
                        disabled={!transcribedText || !newReviewForm.notes || createPersonReview.isPending}
                      >
                        {createPersonReview.isPending ? (
                          <><LoaderIcon className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                        ) : (
                          <><Save className="h-4 w-4 mr-2" />Save Review</>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews List */}
            <Card>
              <CardHeader>
                <CardTitle>Previous Reviews ({personReviews?.length || 0})</CardTitle>
                <CardDescription>History of 1:1 meetings</CardDescription>
              </CardHeader>
              <CardContent>
                {personReviews && personReviews.length > 0 ? (
                  <div className="space-y-4">
                    {personReviews.map((review) => (
                      <div key={review.id} className="p-4 border rounded-lg hover:bg-muted/50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <MessageSquare className="h-4 w-4 text-blue-600" />
                              <span className="font-medium">1:1 Review</span>
                              <Badge variant="outline">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {review.notes.length > 150 
                                ? review.notes.substring(0, 150) + '...' 
                                : review.notes
                              }
                            </p>
                            <div className="text-xs text-muted-foreground">
                              Created: {new Date(review.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Link href={`/people/${id}/reviews/${review.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
                    <p>Click &quot;Add Review&quot; to create your first 1:1 review.</p>
                  </div>
                )}
              </CardContent>
            </Card>

          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}

interface AddCompetencyFormProps {
  availableCompetencies: any[]
  existingCompetencies: any[]
  onAdd: (competencyId: string, proficiency?: string) => void
  onCancel: () => void
  createCompetency: any
  canCreateCompetency: boolean
}

function AddCompetencyForm({ 
  availableCompetencies, 
  existingCompetencies,
  onAdd, 
  onCancel, 
  createCompetency,
  canCreateCompetency 
}: AddCompetencyFormProps) {
  const [selectedType, setSelectedType] = useState('')
  const [selectedCompetencyId, setSelectedCompetencyId] = useState('')
  const [proficiency, setProficiency] = useState('')
  const [competencySearch, setCompetencySearch] = useState('')
  const [showCompetencyList, setShowCompetencyList] = useState(false)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newCompetencyName, setNewCompetencyName] = useState('')
  const [newCompetencyDescription, setNewCompetencyDescription] = useState('')
  
  const competencyTypes = [
    { value: 'KNOWLEDGE', label: 'Knowledge' },
    { value: 'SKILL', label: 'Skill' },
    { value: 'TECH_TOOL', label: 'Tech Tool' },
    { value: 'ABILITY', label: 'Ability' },
    { value: 'VALUE', label: 'Value' },
    { value: 'BEHAVIOUR', label: 'Behaviour' },
    { value: 'ENABLER', label: 'Enabler' },
  ].sort((a, b) => a.label.localeCompare(b.label))
  
  // Filter competencies by type and exclude already assigned ones
  const filteredCompetencies = React.useMemo(() => {
    if (!availableCompetencies || availableCompetencies.length === 0) {
      return []
    }
    
    let filtered = [...availableCompetencies]
    
    // Filter by type if selected
    if (selectedType) {
      filtered = filtered.filter(comp => comp.type === selectedType)
    }
    
    // Exclude already assigned competencies
    filtered = filtered.filter(comp => 
      !existingCompetencies.some(existing => existing.id === comp.id)
    )
    
    // Filter by search term if provided
    if (competencySearch.trim()) {
      const searchLower = competencySearch.toLowerCase()
      filtered = filtered.filter(comp => 
        comp.name.toLowerCase().includes(searchLower) ||
        (comp.description && comp.description.toLowerCase().includes(searchLower))
      )
    }
    
    // Sort alphabetically
    filtered.sort((a, b) => a.name.localeCompare(b.name))
    
    // Limit to 10 if no search term
    if (!competencySearch.trim()) {
      filtered = filtered.slice(0, 10)
    }
    
    return filtered
  }, [availableCompetencies, selectedType, existingCompetencies, competencySearch])
  
  const selectedCompetency = availableCompetencies.find(c => c.id === selectedCompetencyId)
  const shouldShowProficiency = supportsProficiency((selectedCompetency?.type || selectedType) as any)
  
  const handleCreateNew = async () => {
    if (!newCompetencyName.trim() || !selectedType) return
    
    try {
      const newCompetency = await createCompetency.mutateAsync({
        type: selectedType as any,
        name: newCompetencyName.trim(),
        description: newCompetencyDescription.trim() || undefined
      })
      
      // Add the newly created competency
      await onAdd(newCompetency.id, shouldShowProficiency && proficiency ? proficiency : undefined)
      
      // Reset form
      setSelectedType('')
      setSelectedCompetencyId('')
      setProficiency('')
      setNewCompetencyName('')
      setNewCompetencyDescription('')
      setIsCreatingNew(false)
    } catch (error) {
      console.error('Failed to create competency:', error)
    }
  }
  
  const handleSubmit = async () => {
    if (isCreatingNew) {
      await handleCreateNew()
    } else if (selectedCompetencyId) {
      await onAdd(selectedCompetencyId, shouldShowProficiency && proficiency ? proficiency : undefined)
      // Reset form
      setSelectedType('')
      setSelectedCompetencyId('')
      setProficiency('')
      setCompetencySearch('')
    }
  }
  
  const handleSelectCompetency = (competency: any) => {
    setSelectedCompetencyId(competency.id)
    setShowCompetencyList(false)
    setCompetencySearch('') // Clear search when selecting
  }
  
  const canSubmit = isCreatingNew ? 
    (newCompetencyName.trim() && selectedType) : 
    selectedCompetencyId
  
  // Show competency list when type is selected and no competency is chosen
  useEffect(() => {
    if (selectedType && !selectedCompetencyId && !isCreatingNew) {
      setShowCompetencyList(true)
    }
  }, [selectedType, selectedCompetencyId, isCreatingNew])
  
  return (
    <div className="space-y-4">
      {/* Type Selection */}
      <div className="space-y-2">
        <Label>Competency Type</Label>
        <Select value={selectedType} onValueChange={(value) => {
          setSelectedType(value)
          setSelectedCompetencyId('') // Reset competency selection when type changes
          setIsCreatingNew(false)
          setCompetencySearch('')
          // Automatically show the competency list after selecting type
          setTimeout(() => setShowCompetencyList(true), 100)
        }}>
          <SelectTrigger>
            <SelectValue placeholder="Select competency type" />
          </SelectTrigger>
          <SelectContent>
            {competencyTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {selectedType && (
        <div className="space-y-2">
          <Label>Competency</Label>
          {isCreatingNew ? (
            <div className="space-y-3 p-3 border rounded-md bg-muted/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Create New Competency</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setIsCreatingNew(false)
                    setNewCompetencyName('')
                    setNewCompetencyDescription('')
                  }}
                >
                  Cancel
                </Button>
              </div>
              
              <div className="space-y-2">
                <Input
                  placeholder="Competency name"
                  value={newCompetencyName}
                  onChange={(e) => setNewCompetencyName(e.target.value)}
                />
                <Input
                  placeholder="Description (optional)"
                  value={newCompetencyDescription}
                  onChange={(e) => setNewCompetencyDescription(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2 relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search competencies or type to create new..."
                  value={selectedCompetencyId ? selectedCompetency?.name || '' : competencySearch}
                  onChange={(e) => {
                    const value = e.target.value
                    setCompetencySearch(value)
                    if (selectedCompetencyId) {
                      setSelectedCompetencyId('')
                    }
                    setShowCompetencyList(true)
                  }}
                  onFocus={() => {
                    // If a competency is selected, clear it to start searching
                    if (selectedCompetencyId) {
                      setSelectedCompetencyId('')
                      setCompetencySearch('')
                    }
                    setShowCompetencyList(true)
                  }}
                  className="pl-10"
                  readOnly={false}
                />
              </div>
              
              {showCompetencyList && (
                <div className="absolute z-50 w-full">
                  <Card className="max-h-60 overflow-y-auto shadow-lg">
                    <CardContent className="p-2">
                      {filteredCompetencies.length > 0 ? (
                        <div className="space-y-1">
                          {filteredCompetencies.map((competency) => (
                            <div
                              key={competency.id}
                              className="p-2 hover:bg-muted rounded-sm cursor-pointer transition-colors"
                              onClick={() => handleSelectCompetency(competency)}
                            >
                              <div className="flex items-center gap-2">
                                <span className="flex-1 font-medium">{competency.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {competency.type.replace('_', ' ')}
                                </Badge>
                              </div>
                              {competency.description && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                  {competency.description}
                                </p>
                              )}
                            </div>
                          ))}
                          
                          {/* Show create option at the bottom */}
                          {canCreateCompetency && (
                            <div className="border-t pt-2 mt-2">
                              <div
                                className="p-2 hover:bg-muted rounded-sm cursor-pointer flex items-center gap-2 text-sm transition-colors"
                                onClick={() => {
                                  if (competencySearch.trim()) {
                                    setNewCompetencyName(competencySearch.trim())
                                  }
                                  setIsCreatingNew(true)
                                  setShowCompetencyList(false)
                                  setCompetencySearch('')
                                }}
                              >
                                <Plus className="h-4 w-4" />
                                {competencySearch.trim() ? 
                                  `Create \"${competencySearch.trim()}\"` :
                                  'Create new competency'
                                }
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 text-center">
                          <p className="text-sm text-muted-foreground mb-3">
                            {competencySearch.trim() ? 
                              `No competencies found matching \"${competencySearch}\"` :
                              'No available competencies of this type'
                            }
                          </p>
                          {canCreateCompetency && competencySearch?.trim() && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setNewCompetencyName(competencySearch.trim())
                                setIsCreatingNew(true)
                                setShowCompetencyList(false)
                                setCompetencySearch('')
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Create &ldquo;{competencySearch.trim()}&rdquo;
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {/* Click outside handler */}
              {showCompetencyList && (
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowCompetencyList(false)}
                />
              )}
            </div>
          )}
        </div>
      )}
      
      {shouldShowProficiency && (selectedCompetencyId || isCreatingNew) && (
        <div className="space-y-2">
          <Label>Proficiency Level</Label>
          <Select value={proficiency} onValueChange={setProficiency}>
            <SelectTrigger>
              <SelectValue placeholder="Select proficiency (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BEGINNER">Beginner</SelectItem>
              <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
              <SelectItem value="ADVANCED">Advanced</SelectItem>
              <SelectItem value="EXPERT">Expert</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      
      <div className="flex gap-2 pt-4">
        <Button 
          onClick={handleSubmit} 
          disabled={!canSubmit || createCompetency.isPending}
        >
          {createCompetency.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isCreatingNew ? 'Create & Add' : 'Add Competency'}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

interface EditCompetencyFormProps {
  competency: any
  onSave: (competencyId: string, proficiency?: string) => void
  onCancel: () => void
}

function EditCompetencyForm({ competency, onSave, onCancel }: EditCompetencyFormProps) {
  const shouldShowProficiency = supportsProficiency(competency.type)
  const [proficiency, setProficiency] = useState(competency.proficiency || '')
  
  const handleSubmit = () => {
    onSave(competency.id, shouldShowProficiency && proficiency ? proficiency : undefined)
  }
  
  return (
    <div className="space-y-4">
      <div>
        <Label>Competency</Label>
        <div className="mt-1 p-2 bg-muted rounded">
          <div className="flex items-center gap-2">
            <span className="font-medium">{competency.name}</span>
            <Badge variant="outline">
              {competency.type.replace('_', ' ')}
            </Badge>
          </div>
          {competency.description && (
            <p className="text-sm text-muted-foreground mt-1">{competency.description}</p>
          )}
        </div>
      </div>
      
      {shouldShowProficiency && (
        <div className="space-y-2">
          <Label>Proficiency Level</Label>
          <div className="flex gap-2">
            <Select value={proficiency || undefined} onValueChange={(value) => setProficiency(value || '')}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select proficiency (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BEGINNER">Beginner <span className="opacity-50">(Has heard of it)</span></SelectItem>
                <SelectItem value="INTERMEDIATE">Intermediate <span className="opacity-50">(Can use it with guidance)</span></SelectItem>
                <SelectItem value="ADVANCED">Advanced <span className="opacity-50">(Can use it independently)</span></SelectItem>
                <SelectItem value="EXPERT">Expert <span className="opacity-50">(Can teach and innovate with it)</span></SelectItem>
              </SelectContent>
            </Select>
            {proficiency && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setProficiency('')}
                title="Clear proficiency"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
      
      <div className="flex gap-2 pt-4">
        <Button onClick={handleSubmit}>
          Save Changes
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
