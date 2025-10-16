"use client"

import { TableHead } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

export type SortDirection = 'asc' | 'desc' | null

interface SortableTableHeaderProps {
  children: React.ReactNode
  sortKey: string
  currentSort: { key: string | null; direction: SortDirection }
  onSort: (key: string, direction: SortDirection) => void
  className?: string
}

export function SortableTableHeader({ 
  children, 
  sortKey, 
  currentSort, 
  onSort, 
  className 
}: SortableTableHeaderProps) {
  const isActive = currentSort.key === sortKey
  const direction = isActive ? currentSort.direction : null

  const handleSort = () => {
    let newDirection: SortDirection
    
    if (!direction) {
      newDirection = 'asc'
    } else if (direction === 'asc') {
      newDirection = 'desc'
    } else {
      newDirection = null // Reset to no sort
    }
    
    onSort(sortKey, newDirection)
  }

  const getSortIcon = () => {
    if (!isActive || direction === null) {
      return <ChevronsUpDown className="h-4 w-4 opacity-50" />
    }
    if (direction === 'asc') {
      return <ChevronUp className="h-4 w-4" />
    }
    return <ChevronDown className="h-4 w-4" />
  }

  return (
    <TableHead className={cn("select-none", className)}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-auto p-0 font-semibold hover:bg-transparent justify-start gap-1",
          isActive && "text-foreground"
        )}
        onClick={handleSort}
      >
        {children}
        {getSortIcon()}
      </Button>
    </TableHead>
  )
}