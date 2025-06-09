"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { GradientButton } from "@/components/gradient-button"
import { ArrowUpRight, FileText, AlertCircle } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/libs/supabase/client"

export default function DashboardOverviewPage() {
  const [wordProgress, setWordProgress] = useState(0)
  const [usage, setUsage] = useState<any>(null)
  const [recentTransformations, setRecentTransformations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null)
        
        // Fetch usage data
        const usageResponse = await fetch('/api/subscription/usage')
        if (usageResponse.ok) {
          const usageData = await usageResponse.json()
          setUsage(usageData.usage)
          
          // Animate progress bar based on real data
          setTimeout(() => {
            setWordProgress((usageData.usage.words_used / usageData.usage.words_limit) * 100)
          }, 300)
        } else {
          const errorData = await usageResponse.json()
          if (usageResponse.status === 401 || errorData.error === "Not authenticated") {
            setError("Please log in to view your dashboard")
          } else {
            setError("Failed to load usage data")
          }
        }

        // Fetch recent transformations - ONLY for current user
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setError("Please log in to view your dashboard")
          return
        }

        const { data: transformations, error: supabaseError } = await supabase
          .from('transformations')
          .select('*')
          .eq('user_id', user.id) // CRITICAL: Filter by current user only
          .order('created_at', { ascending: false })
          .limit(5)

        if (supabaseError) {
          console.error('Error fetching transformations:', supabaseError)
        } else if (transformations) {
          setRecentTransformations(transformations)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
        setError("Failed to load dashboard data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase])

  if (loading) {
    return <div className="space-y-6">
      <h1 className="text-3xl font-heading font-semibold">Dashboard Overview</h1>
      <div className="flex items-center justify-center py-8">Loading...</div>
    </div>
  }

  if (error) {
    return <div className="space-y-6">
      <h1 className="text-3xl font-heading font-semibold">Dashboard Overview</h1>
      <Card className="border-destructive">
        <CardContent className="flex items-center gap-4 p-6">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <h3 className="font-semibold text-destructive">Error</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
            {error.includes("log in") && (
              <Button asChild className="mt-2">
                <Link href="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-heading font-semibold">Dashboard Overview</h1>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Word Usage</CardTitle>
            <CardDescription>Your monthly word consumption.</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress
              value={wordProgress}
              className="h-3 mb-2 bg-slate-200 dark:bg-slate-700 [&>div]:bg-soundrealBlue"
            />
            <p className="text-sm text-muted-foreground">
              <span className="font-mono font-semibold text-foreground dark:text-slate-100">
                {usage?.words_used?.toLocaleString() || 0}
              </span>{" "}
              / {usage?.words_limit?.toLocaleString() || 0} words
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        <div className="space-y-6">
          {usage?.plan !== "Ultra" && (
            <Card className="bg-gradient-to-r from-soundrealBlue to-blue-400 text-primary-foreground dark:from-soundrealBlue/80 dark:to-blue-400/80">
              <CardHeader>
                <CardTitle className="text-xl">Upgrade Your Plan</CardTitle>
                <CardDescription className="text-blue-100 dark:text-blue-200">
                  Unlock more words, unlimited transformations, and priority features.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GradientButton
                  variant="outline"
                  size="lg"
                  className="bg-white text-soundrealBlue hover:bg-slate-100 border-transparent"
                  asChild
                >
                  <Link href="/pricing">
                    View Upgrade Options <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Link>
                </GradientButton>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl">Recent Humanizations</CardTitle>
                <CardDescription>Your latest text humanizations.</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/history">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {recentTransformations.length > 0 ? (
                  recentTransformations.map((transform) => (
                    <li
                      key={transform.id}
                      className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {transform.original_text?.substring(0, 50) || 'Text humanization'}...
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(transform.created_at).toLocaleDateString()} · <span className="font-mono">{transform.word_count}</span> words
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </li>
                  ))
                ) : (
                  <li className="text-center py-4 text-muted-foreground">
                    No humanizations yet. <Link href="/dashboard/humanize" className="text-primary hover:underline">Create your first one!</Link>
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
