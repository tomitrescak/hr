"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { trpc } from "@/lib/trpc/client"
import { Trash2, AlertTriangle } from "lucide-react"
import { Role } from "@prisma/client"

interface DeletePersonDialogProps {
  person: {
    id: string
    name: string
    email: string
  }
  onSuccess?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DeletePersonDialog({ person, onSuccess, open: controlledOpen, onOpenChange }: DeletePersonDialogProps) {
  const { data: session } = useSession()
  const [internalOpen, setInternalOpen] = useState(false)
  
  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen
  const [confirmEmail, setConfirmEmail] = useState("")
  const [confirmText, setConfirmText] = useState("")

  const utils = trpc.useUtils()
  
  const deletePerson = trpc.people.delete.useMutation({
    onSuccess: () => {
      utils.people.list.invalidate()
      setOpen(false)
      setConfirmEmail("")
      setConfirmText("")
      onSuccess?.()
    },
  })

  // Only show to project managers
  if (!session?.user || session.user.role !== Role.PROJECT_MANAGER) {
    return null
  }

  const handleDelete = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (confirmEmail !== person.email) {
      return
    }
    
    if (confirmText !== "DELETE") {
      return
    }
    
    deletePerson.mutate({
      id: person.id,
      confirmEmail: confirmEmail
    })
  }

  const isFormValid = confirmEmail === person.email && confirmText === "DELETE"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete {person.name}
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the person and all associated data from the system.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleDelete} className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-800">
                  Warning: This is a permanent action
                </p>
                <ul className="text-xs text-red-700 space-y-1">
                  <li>• All person data will be permanently removed</li>
                  <li>• All assignments, reviews, and competencies will be deleted</li>
                  <li>• The user account will be completely removed</li>
                  <li>• This action cannot be reversed</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmEmail">
            Type the person&apos;s email address to confirm: <span className="font-mono text-sm">{person.email}</span>
            </Label>
            <Input
              id="confirmEmail"
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={person.email}
              className={confirmEmail === person.email ? "border-green-500" : ""}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmText">
              Type <span className="font-mono font-bold">DELETE</span> to confirm:
            </Label>
            <Input
              id="confirmText"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className={confirmText === "DELETE" ? "border-green-500" : ""}
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="destructive" 
              disabled={!isFormValid || deletePerson.isPending}
            >
              {deletePerson.isPending ? "Deleting..." : "Delete Forever"}
            </Button>
          </div>
          
          {deletePerson.error && (
            <div className="text-sm text-red-600 mt-2">
              {deletePerson.error.message}
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}