"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreVertical, UserX, UserCheck, Trash2 } from "lucide-react"
import { Role } from "@prisma/client"
import { DeactivatePersonDialog } from "./deactivate-person-dialog"
import { DeletePersonDialog } from "./delete-person-dialog"

interface PersonActionsMenuProps {
  person: {
    id: string
    name: string
    email: string
    isActive: boolean
    alternativeEmail?: string | null
  }
  onSuccess?: () => void
}

export function PersonActionsMenu({ person, onSuccess }: PersonActionsMenuProps) {
  const { data: session } = useSession()
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Only show to project managers
  if (!session?.user || session.user.role !== Role.PROJECT_MANAGER) {
    return null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {person.isActive ? (
            <DropdownMenuItem
              onClick={() => setShowDeactivateDialog(true)}
              className="text-yellow-700 focus:text-yellow-800 focus:bg-yellow-50"
            >
              <UserX className="mr-2 h-4 w-4" />
              Deactivate Person
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => setShowDeactivateDialog(true)}
              className="text-green-700 focus:text-green-800 focus:bg-green-50"
            >
              <UserCheck className="mr-2 h-4 w-4" />
              Reactivate Person
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-700 focus:text-red-800 focus:bg-red-50"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Person
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialogs */}
      {showDeactivateDialog && (
        <DeactivatePersonDialog 
          person={person} 
          onSuccess={() => {
            onSuccess?.()
            setShowDeactivateDialog(false)
          }}
          open={showDeactivateDialog}
          onOpenChange={setShowDeactivateDialog}
        />
      )}
      
      {showDeleteDialog && (
        <DeletePersonDialog 
          person={person} 
          onSuccess={() => {
            onSuccess?.()
            setShowDeleteDialog(false)
          }}
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
        />
      )}
    </>
  )
}