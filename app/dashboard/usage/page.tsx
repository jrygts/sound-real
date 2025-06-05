"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { BarChart3, TrendingUp, Calendar, FileText } from "lucide-react"
import { createClient } from "@/libs/supabase/client"

export default function UsagePage() {
  const [usage, setUsage] = useState<any>(null)
  const [dailyUsage, setDailyUsage] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const fetchUsageData = async () => {
      try {
        // Fetch current usage
        const usageResponse = await fetch('/api/subscription/usage')
        if (usageResponse.ok) {
          const usageData = await usageResponse.json()
          setUsage(usageData.usage)
        }

        // Fetch daily usage from transformations table
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const { data: transformations } = await supabase
          .from('transformations')
          .select('created_at, word_count')
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: true })

        if (transformations) {
          // Group by day
          const dailyData = transformations.reduce((acc: any, transform: any) => {
            const date = new Date(transform.created_at).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            })
            if (!acc[date]) {
              acc[date] = { date, words: 0, transformations: 0 }
            }
            acc[date].words += transform.word_count || 0
            acc[date].transformations += 1
            return acc
          }, {})

          setDailyUsage(Object.values(dailyData))
        }
      } catch (error) {
        console.error('Failed to fetch usage data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsageData()
  }, [supabase])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-semibold">Usage Analytics</h1>
          <p className="text-muted-foreground">
            Track your word consumption and transformation usage over time.
          </p>
        </div>
        <div className="flex items-center justify-center py-8">Loading...</div>
      </div>
    )
  }

  const wordProgress = usage ? (usage.words_used / usage.words_limit) * 100 : 0
  const transformProgress = usage ? (usage.transformations_used / usage.transformations_limit) * 100 : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-semibold">Usage Analytics</h1>
        <p className="text-muted-foreground">
          Track your word consumption and transformation usage over time.
        </p>
      </div>

      {/* Current Period Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Words Used</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usage?.words_used?.toLocaleString() || 0}</div>
            <Progress value={wordProgress} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {usage?.words_limit?.toLocaleString() || 0} limit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transformations</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usage?.transformations_used || 0}</div>
            <Progress value={transformProgress} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {usage?.transformations_limit || 0} limit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usage ? Math.round(usage.words_used / 30).toLocaleString() : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              words per day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usage && usage.transformations_used > 0 
                ? Math.round(usage.words_used / usage.transformations_used)
                : 0
              }
            </div>
            <p className="text-xs text-muted-foreground">
              words per transformation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage History */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Usage (Last 7 Days)</CardTitle>
          <CardDescription>
            Your word and transformation usage over the past week.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dailyUsage.length > 0 ? (
              dailyUsage.map((day: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{day.date}</p>
                    <p className="text-sm text-muted-foreground">
                      {day.transformations} transformations
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{day.words} words</p>
                    <div className="w-24 h-2 bg-muted rounded-full mt-1">
                      <div 
                        className="h-full bg-soundrealBlue rounded-full"
                        style={{ width: `${Math.min((day.words / 1000) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No usage data for the past 7 days.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage Tips</CardTitle>
          <CardDescription>
            Optimize your word usage with these suggestions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-soundrealBlue rounded-full mt-2" />
              <div>
                <p className="font-medium">Batch your transformations</p>
                <p className="text-sm text-muted-foreground">
                  Process multiple texts at once to maximize efficiency.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-soundrealBlue rounded-full mt-2" />
              <div>
                <p className="font-medium">Monitor your daily usage</p>
                <p className="text-sm text-muted-foreground">
                  Keep track of your consumption to avoid hitting limits.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-soundrealBlue rounded-full mt-2" />
              <div>
                <p className="font-medium">Consider upgrading if needed</p>
                <p className="text-sm text-muted-foreground">
                  Higher tiers offer more words and transformations per month.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 