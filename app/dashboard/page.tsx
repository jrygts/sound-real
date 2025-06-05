"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { GradientButton } from "@/components/gradient-button"
import { ArrowUpRight, FileText, RefreshCw } from "lucide-react"
import Link from "next/link"

// TODO: Replace with actual data from your API
const usageStats = {
  wordsUsed: 7850,
  wordLimit: 15000,
  transformationsUsed: 380,
  transformationLimit: 600,
  planName: "Plus",
}

const lastTransformations = [
  { id: "1", title: "Blog Post Intro - Summer Trends", date: "2024-06-03", words: 150 },
  { id: "2", title: "Email Campaign - New Product Launch", date: "2024-06-02", words: 250 },
  { id: "3", title: "Social Media Ad Copy - Q3 Promo", date: "2024-06-01", words: 80 },
  { id: "4", title: "Website Headline - About Us Page", date: "2024-05-30", words: 30 },
  { id: "5", title: "Product Description - AI Assistant", date: "2024-05-29", words: 120 },
]

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

  useEffect(() => {
    // Animate progress bars on load
    const timer = setTimeout(() => {
      setWordProgress((usageStats.wordsUsed / usageStats.wordLimit) * 100)
      setTransformProgress((usageStats.transformationsUsed / usageStats.transformationLimit) * 100)
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  const nextResetDate = new Date()
  nextResetDate.setDate(nextResetDate.getDate() + 15) // Example: resets in 15 days

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
                {usageStats.wordsUsed.toLocaleString()}
              </span>{" "}
              / {usageStats.wordLimit.toLocaleString()} words
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transformations</CardTitle>
            <CardDescription>Your transformation usage.</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress
              value={transformProgress}
              className="h-3 mb-2 bg-slate-200 dark:bg-slate-700 [&>div]:bg-green-500"
            />
            <p className="text-sm text-muted-foreground">
              <span className="font-mono font-semibold text-foreground dark:text-slate-100">
                {usageStats.transformationsUsed.toLocaleString()}
              </span>{" "}
              / {usageStats.transformationLimit.toLocaleString()}
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
          {usageStats.planName !== "Ultra" && (
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
                <CardTitle className="text-xl">Recent Transformations</CardTitle>
                <CardDescription>Your latest five text transformations.</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/history">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {lastTransformations.map((transform) => (
                  <li
                    key={transform.id}
                    className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{transform.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {transform.date} · <span className="font-mono">{transform.words}</span> words
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </li>
                ))}
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
              <Link href="/">
                New Transformation
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
