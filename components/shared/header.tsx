"use client"

import Link from "next/link"
import { Logo } from "@/components/logo"
import { ThemeToggleButton } from "@/components/theme-toggle-button"
import GetStartedButton from "@/components/shared/GetStartedButton"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { useSession } from "@/components/SessionProvider"

const navItems = [
  { href: "/#features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
]

export function AppHeader() {
  // Safely get session with fallback
  let user = null
  let loading = true
  
  try {
    const session = useSession()
    user = session.user
    loading = session.loading
  } catch (error) {
    // Fallback if session provider is not available
    console.warn('Session provider not available:', error)
    loading = false
    user = null
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
        <Logo size="md" />
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center space-x-2">
          <ThemeToggleButton />
          <div className="hidden md:inline-flex">
            {loading ? (
              <div className="w-16 h-8 bg-muted animate-pulse rounded"></div>
            ) : (
              <GetStartedButton />
            )}
          </div>
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <nav className="flex flex-col space-y-4 mt-8">
                  {navItems.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="text-lg transition-colors hover:text-foreground/80 text-foreground/60"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <div className="w-full mt-4">
                    {loading ? (
                      <div className="w-full h-8 bg-muted animate-pulse rounded"></div>
                    ) : (
                      <GetStartedButton />
                    )}
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
