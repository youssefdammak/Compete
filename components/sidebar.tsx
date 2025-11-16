'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Activity, TrendingUp, Settings, Bell, Users, Package, Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { getAuth, signOut } from 'firebase/auth'

const navItems = [
  {
    label: 'Market Dashboard',
    href: '/',
    icon: LayoutDashboard
  },
  {
    label: 'Live Feed',
    href: '/live-feed',
    icon: Activity
  },
  {
    label: 'Competitors',
    href: '/competitors',
    icon: Users,
    badge: '47'
  },
  {
    label: 'Products',
    href: '/products',
    icon: Package,
    badge: '1.2K'
  },
  {
    label: 'Trends',
    href: '/trends',
    icon: TrendingUp
  },
  {
    label: 'Alerts',
    href: '/alerts',
    icon: Bell,
    badge: '23'
  },
  {
    label: 'Ad Funnels',
    href: '/ad-funnels',
    icon: Megaphone,
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings
  }
]
export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const displayName = user?.displayName || user?.email?.split("@")[0] || "User"
  const email = user?.email || ""
  // Get initials for avatar
  const initials = displayName
    .split(" ")
    .map((n) => n[0]?.toUpperCase())
    .join("")
    .slice(0, 2)

  const handleLogout = async () => {
    const auth = getAuth()
    await signOut(auth)
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card">
      {/* Logo/Brand */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Compete</h1>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section: User Info (clickable) */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-card/50 p-4">
        <a href="/profile" className="flex items-center gap-3 rounded-lg bg-accent/50 px-3 py-2 hover:bg-accent transition group cursor-pointer">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
            {initials}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-foreground group-hover:underline">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="ml-2 text-xs text-destructive hover:underline"
            title="Sign out"
            tabIndex={-1}
          >
            Sign out
          </button>
        </a>
      </div>
    </aside>
  )
}
