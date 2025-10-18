'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CompetencyEditorProps {
  name: string
  type: string
  description: string
  isEditing: boolean
  onUpdate: (field: 'name' | 'type' | 'description', value: string) => void
}

export function CompetencyEditor({
  name,
  type,
  description,
  isEditing,
  onUpdate
}: CompetencyEditorProps) {
  if (!isEditing) {
    return null
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-1 mb-2">
        <Input
          value={name}
          onChange={(e) => onUpdate('name', e.target.value)}
          className="text-base font-medium"
          placeholder="Competency name"
        />
        <Select
          value={type}
          onValueChange={(value) => onUpdate('type', value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="KNOWLEDGE">Knowledge</SelectItem>
            <SelectItem value="SKILL">Skill</SelectItem>
            <SelectItem value="TECH_TOOL">Tech Tool</SelectItem>
            <SelectItem value="ABILITY">Ability</SelectItem>
            <SelectItem value="VALUE">Value</SelectItem>
            <SelectItem value="BEHAVIOUR">Behaviour</SelectItem>
            <SelectItem value="ENABLER">Enabler</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="mb-3">
        <Textarea
          value={description}
          onChange={(e) => onUpdate('description', e.target.value)}
          className="text-sm"
          rows={2}
          placeholder="Competency description"
        />
      </div>
    </>
  )
}