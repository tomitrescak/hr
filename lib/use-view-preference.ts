'use client'

import { useState, useEffect } from 'react'

type ViewType = 'cards' | 'list'

export function useViewPreference(cookieName: string, defaultView: ViewType = 'cards') {
  const [view, setView] = useState<ViewType>(defaultView)

  useEffect(() => {
    // Read from cookie on mount
    const savedView = getCookie(cookieName) as ViewType
    if (savedView && (savedView === 'cards' || savedView === 'list')) {
      setView(savedView)
    }
  }, [cookieName])

  const setViewAndSave = (newView: ViewType) => {
    setView(newView)
    setCookie(cookieName, newView, 365) // Save for 1 year
  }

  return [view, setViewAndSave] as const
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