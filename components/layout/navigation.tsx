"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  FolderKanban, 
  BookOpen, 
  Calendar, 
  ClipboardList, 
  Settings, 
  LogOut,
  Home
} from "lucide-react"
import { Role } from "@prisma/client"

interface NavigationItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  requiredRole?: Role[]
}

const navigationItems: NavigationItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: Home,
  },
  {
    href: "/people",
    label: "People",
    icon: Users,
  },
  {
    href: "/projects",
    label: "Projects", 
    icon: FolderKanban,
  },
  {
    href: "/courses",
    label: "Courses",
    icon: BookOpen,
    requiredRole: [Role.PROJECT_MANAGER],
  },
  {
    href: "/competencies",
    label: "Competencies",
    icon: Settings,
    requiredRole: [Role.PROJECT_MANAGER],
  },
]

export function Navigation() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <Card className="w-64 h-full">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!session) {
    return null
  }

  const userRole = session.user.role
  const filteredItems = navigationItems.filter(item => 
    !item.requiredRole || item.requiredRole.includes(userRole)
  )

  return (
    <Card className="w-64 h-full">
      <CardContent className="p-4">
        {/* User Info */}
        <div className="mb-6 p-3 border rounded-lg">
          <div className="font-medium text-sm">{session.user.name}</div>
          <div className="text-xs text-muted-foreground">{session.user.email}</div>
          <Badge 
            variant={userRole === Role.PROJECT_MANAGER ? "default" : "secondary"}
            className="mt-2"
          >
            {userRole === Role.PROJECT_MANAGER ? "Project Manager" : "User"}
          </Badge>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* Sign Out */}
        <div className="mt-6 pt-4 border-t">
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}