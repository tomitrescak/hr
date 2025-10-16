'use client'

import { useState, useEffect } from 'react'

type StatusFilter = 'all' | 'active' | 'inactive'

export function useStatusFilter(cookieName: string, defaultFilter: StatusFilter = 'all') {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(defaultFilter)

  useEffect(() => {
    // Read from cookie on mount
    const savedFilter = getCookie(cookieName) as StatusFilter
    if (savedFilter && (savedFilter === 'all' || savedFilter === 'active' || savedFilter === 'inactive')) {
      setStatusFilter(savedFilter)
    }
  }, [cookieName])

  const setStatusFilterAndSave = (newFilter: StatusFilter) => {
    setStatusFilter(newFilter)
    setCookie(cookieName, newFilter, 365) // Save for 1 year
  }

  return [statusFilter, setStatusFilterAndSave] as const
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  
  return document.cookie
    .split('; ')
    .find(row => row.startsWith(`${name}=`))
    ?.split('=')[1] || null
}