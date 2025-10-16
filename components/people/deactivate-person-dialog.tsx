"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { trpc } from "@/lib/trpc/client"
import { UserX, UserCheck } from "lucide-react"
import { Role } from "@prisma/client"

interface DeactivatePersonDialogProps {
  person: {
    id: string
    name: string
    email: string
    isActive: boolean
    alternativeEmail?: string | null
  }
  onSuccess?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DeactivatePersonDialog({ person, onSuccess, open: controlledOpen, onOpenChange }: DeactivatePersonDialogProps) {
  const { data: session } = useSession()
  const [internalOpen, setInternalOpen] = useState(false)
  
  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen
  const [formData, setFormData] = useState({
    alternativeEmail: person.alternativeEmail || "",
    reason: ""
  })

  const utils = trpc.useUtils()
  
  const deactivatePerson = trpc.people.deactivate.useMutation({
    onSuccess: () => {
      utils.people.list.invalidate()
      setOpen(false)
      setFormData({ alternativeEmail: "", reason: "" })
      onSuccess?.()
    },
  })

  const reactivatePerson = trpc.people.reactivate.useMutation({
    onSuccess: () => {
      utils.people.list.invalidate()
      setOpen(false)
      onSuccess?.()
    },
  })

  // Only show to project managers
  if (!session?.user || session.user.role !== Role.PROJECT_MANAGER) {
    return null
  }

  const handleDeactivate = (e: React.FormEvent) => {
    e.preventDefault()
    deactivatePerson.mutate({
      id: person.id,
      alternativeEmail: formData.alternativeEmail || undefined,
      reason: formData.reason || undefined
    })
  }

  const handleReactivate = () => {
    reactivatePerson.mutate({ id: person.id })
  }

  const isLoading = deactivatePerson.isPending || reactivatePerson.isPending
  const error = deactivatePerson.error || reactivatePerson.error

  if (person.isActive) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
            <UserX className="h-4 w-4 mr-1" />
            Deactivate
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate {person.name}</DialogTitle>
            <DialogDescription>
              This will mark the person as inactive. They will no longer be able to log in, but their data will be preserved.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDeactivate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="alternativeEmail">Alternative Email (optional)</Label>
              <Input
                id="alternativeEmail"
                type="email"
                value={formData.alternativeEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, alternativeEmail: e.target.value }))}
                placeholder="Alternative contact email"
              />
              <p className="text-xs text-muted-foreground">
                Keep contact information for this person after they leave
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Reason for deactivation"
              />
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-sm text-yellow-800">
                <strong>Current email:</strong> {person.email}
              </p>
              <p className="text-sm text-yellow-800 mt-1">
                This person will no longer be able to log in to the system.
              </p>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={isLoading}>
                {isLoading ? "Deactivating..." : "Deactivate Person"}
              </Button>
            </div>
            
            {error && (
              <div className="text-sm text-red-600 mt-2">
                {error.message}
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50">
          <UserCheck className="h-4 w-4 mr-1" />
          Reactivate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reactivate {person.name}</DialogTitle>
          <DialogDescription>
            This will reactivate the person and allow them to log in again.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              <strong>Email:</strong> {person.email}
            </p>
            {person.alternativeEmail && (
              <p className="text-sm text-blue-800">
                <strong>Alternative Email:</strong> {person.alternativeEmail}
              </p>
            )}
            <p className="text-sm text-blue-800 mt-2">
              This person will regain access to the system.
            </p>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReactivate} disabled={isLoading}>
              {isLoading ? "Reactivating..." : "Reactivate Person"}
            </Button>
          </div>
          
          {error && (
            <div className="text-sm text-red-600 mt-2">
              {error.message}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}