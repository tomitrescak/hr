import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Badge } from "./badge"
import { cn } from "@/lib/utils"

interface KanbanColumn {
  id: string
  title: string
  items: KanbanItem[]
}

interface KanbanItem {
  id: string
  title: string
  description?: string
  status: string
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
  assignee?: string
}

interface KanbanBoardProps {
  columns: KanbanColumn[]
  onItemMove?: (itemId: string, fromColumn: string, toColumn: string) => void
  className?: string
}

interface KanbanColumnProps {
  column: KanbanColumn
  onItemMove?: (itemId: string, fromColumn: string, toColumn: string) => void
}

interface KanbanItemProps {
  item: KanbanItem
  onItemMove?: (itemId: string, fromColumn: string, toColumn: string) => void
}

const priorityColors = {
  LOW: "bg-green-100 text-green-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-red-100 text-red-800",
}

export function KanbanItem({ item, onItemMove }: KanbanItemProps) {
  return (
    <Card className="mb-3 cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <h4 className="text-sm font-medium">{item.title}</h4>
          {item.priority && (
            <Badge 
              variant="outline" 
              className={priorityColors[item.priority]}
            >
              {item.priority}
            </Badge>
          )}
        </div>
        {item.description && (
          <p className="text-xs text-muted-foreground mb-2">{item.description}</p>
        )}
        {item.assignee && (
          <div className="text-xs text-muted-foreground">
            Assigned to: {item.assignee}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function KanbanColumn({ column, onItemMove }: KanbanColumnProps) {
  return (
    <div className="flex-1 min-w-80">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            {column.title}
            <Badge variant="secondary">{column.items.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {column.items.map((item) => (
              <KanbanItem
                key={item.id}
                item={item}
                onItemMove={onItemMove}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function KanbanBoard({ columns, onItemMove, className }: KanbanBoardProps) {
  return (
    <div className={cn("flex gap-4 overflow-x-auto pb-4", className)}>
      {columns.map((column) => (
        <KanbanColumn
          key={column.id}
          column={column}
          onItemMove={onItemMove}
        />
      ))}
    </div>
  )
}