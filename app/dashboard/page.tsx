"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { GradientButton } from "@/components/gradient-button"
import { ArrowUpRight, FileText, RefreshCw } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/libs/supabase/client"

const CountdownTimer = ({ targetDate }: { targetDate: Date }) => {
  const calculateTimeLeft = () => {
    const difference = +targetDate - +new Date()
    let timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 }

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      }
    }
    return timeLeft
  }

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft())

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)
    return () => clearTimeout(timer)
  })

  return (
    <div className="flex space-x-2 font-mono text-2xl md:text-3xl">
      {Object.entries(timeLeft).map(([interval, value]) => (
        <div key={interval} className="flex flex-col items-center">
          <span className="font-bold">{String(value).padStart(2, "0")}</span>
          <span className="text-xs text-muted-foreground uppercase">{interval}</span>
        </div>
      ))}
    </div>
  )
}

export default function DashboardOverviewPage() {
  const [wordProgress, setWordProgress] = useState(0)
  const [transformProgress, setTransformProgress] = useState(0)
  const [usage, setUsage] = useState<any>(null)
  const [recentTransformations, setRecentTransformations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch usage data
        const usageResponse = await fetch('/api/subscription/usage')
        if (usageResponse.ok) {
          const usageData = await usageResponse.json()
          setUsage(usageData.usage)
          
          // Animate progress bars based on real data
          setTimeout(() => {
            setWordProgress((usageData.usage.words_used / usageData.usage.words_limit) * 100)
            setTransformProgress((usageData.usage.transformations_used / usageData.usage.transformations_limit) * 100)
          }, 300)
        }

        // Fetch recent transformations
        const { data: transformations } = await supabase
          .from('transformations')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5)

        if (transformations) {
          setRecentTransformations(transformations)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase])

  // Calculate next reset date (assuming monthly billing cycle)
  const nextResetDate = new Date()
  nextResetDate.setMonth(nextResetDate.getMonth() + 1)
  nextResetDate.setDate(1) // First day of next month

  if (loading) {
    return <div className="space-y-6">
      <h1 className="text-3xl font-heading font-semibold">Dashboard Overview</h1>
      <div className="flex items-center justify-center py-8">Loading...</div>
    </div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-heading font-semibold">Dashboard Overview</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Humanizations</CardTitle>
            <CardDescription>Your humanization usage.</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress
              value={transformProgress}
              className="h-3 mb-2 bg-slate-200 dark:bg-slate-700 [&>div]:bg-green-500"
            />
            <p className="text-sm text-muted-foreground">
              <span className="font-mono font-semibold text-foreground dark:text-slate-100">
                {usage?.transformations_used?.toLocaleString() || 0}
              </span>{" "}
              / {usage?.transformations_limit?.toLocaleString() || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Next Usage Reset</CardTitle>
            <CardDescription>Time until your limits refresh.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-6">
            <CountdownTimer targetDate={nextResetDate} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
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

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-xl">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <GradientButton className="w-full justify-start" icon={<RefreshCw className="h-4 w-4" />} asChild>
              <Link href="/dashboard/humanize">
                New Humanize
              </Link>
            </GradientButton>
            <Button variant="outline" className="w-full justify-start">
              Manage API Keys (Soon)
            </Button>
            <Button variant="outline" className="w-full justify-start">
              View Documentation
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
