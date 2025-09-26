"use client"

import { ReactNode } from "react"
import { Navigation } from "./navigation"

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="flex-shrink-0">
        <Navigation />
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto py-6 px-4">
          {children}
        </div>
      </main>
    </div>
  )
}