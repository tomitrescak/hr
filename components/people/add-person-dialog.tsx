"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { trpc } from "@/lib/trpc/client"
import { Plus } from "lucide-react"
import { Role } from "@prisma/client"

interface AddPersonDialogProps {
  onSuccess?: () => void
}

export function AddPersonDialog({ onSuccess }: AddPersonDialogProps) {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "USER" as Role,
    entryDate: new Date().toISOString().split('T')[0],
    capacity: 100
  })

  const utils = trpc.useUtils()
  const createPerson = trpc.people.create.useMutation({
    onSuccess: () => {
      utils.people.list.invalidate()
      setOpen(false)
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "USER",
        entryDate: new Date().toISOString().split('T')[0],
        capacity: 100
      })
      onSuccess?.()
    },
  })

  // Only show to project managers
  if (!session?.user || session.user.role !== Role.PROJECT_MANAGER) {
    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createPerson.mutate({
      ...formData,
      entryDate: new Date(formData.entryDate).toISOString()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Person
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Person</DialogTitle>
          <DialogDescription>
            Create a new user account and person profile.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter full name"
              required
              minLength={2}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Enter email address"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Enter password"
              required
              minLength={6}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select 
              value={formData.role} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as Role }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="PROJECT_MANAGER">Project Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="entryDate">Entry Date</Label>
            <Input
              id="entryDate"
              type="date"
              value={formData.entryDate}
              onChange={(e) => setFormData(prev => ({ ...prev, entryDate: e.target.value }))}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity (%)</Label>
            <Input
              id="capacity"
              type="number"
              min="0"
              max="100"
              value={formData.capacity}
              onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
              placeholder="Enter capacity percentage"
              required
            />
            <p className="text-xs text-muted-foreground">Person&apos;s total capacity from 0% to 100%</p>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPerson.isPending}>
              {createPerson.isPending ? "Creating..." : "Create Person"}
            </Button>
          </div>
          
          {createPerson.error && (
            <div className="text-sm text-red-600 mt-2">
              {createPerson.error.message}
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}