"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"
import { Fragment } from "react"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[]
  className?: string
}

// Route to label mapping
const routeLabels: Record<string, string> = {
  "": "Dashboard",
  "people": "People",
  "projects": "Projects", 
  "courses": "Courses",
  "competencies": "Competencies",
  "planning": "Planning",
  "reviews": "Reviews",
  "edit": "Edit",
  "create": "Create",
  "new": "New"
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = []

  // Always start with Home/Dashboard
  breadcrumbs.push({
    label: "Dashboard",
    href: "/"
  })

  // Build breadcrumbs from path segments
  let currentPath = ""
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    
    // Skip if it's a UUID (dynamic route parameter)
    if (segment.match(/^[a-f0-9-]{36}$/i)) {
      return
    }

    const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
    
    // Don't add href for the last segment (current page)
    const isLastSegment = index === segments.length - 1
    breadcrumbs.push({
      label,
      href: isLastSegment ? undefined : currentPath
    })
  })

  return breadcrumbs
}

export function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  const pathname = usePathname()
  const breadcrumbs = items || generateBreadcrumbs(pathname)

  return (
    <nav className={`flex items-center space-x-1 text-sm text-muted-foreground ${className}`}>
      {breadcrumbs.map((item, index) => (
        <Fragment key={index}>
          {index > 0 && <ChevronRight className="h-4 w-4" />}
          
          <div className="flex items-center">
            {index === 0 && <Home className="h-4 w-4 mr-1" />}
            
            {item.href ? (
              <Link 
                href={item.href} 
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium">{item.label}</span>
            )}
          </div>
        </Fragment>
      ))}
    </nav>
  )
}