"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { BarChart3, TrendingUp, Calendar, FileText } from "lucide-react"

// TODO: Replace with actual data from your API
const usageData = {
  currentPeriod: {
    wordsUsed: 7850,
    wordLimit: 15000,
    transformationsUsed: 380,
    transformationLimit: 600,
  },
  dailyUsage: [
    { date: "Dec 1", words: 450, transformations: 12 },
    { date: "Dec 2", words: 320, transformations: 8 },
    { date: "Dec 3", words: 680, transformations: 15 },
    { date: "Dec 4", words: 290, transformations: 7 },
    { date: "Dec 5", words: 520, transformations: 11 },
    { date: "Dec 6", words: 380, transformations: 9 },
    { date: "Dec 7", words: 430, transformations: 13 },
  ]
}

export default function UsagePage() {
  const wordProgress = (usageData.currentPeriod.wordsUsed / usageData.currentPeriod.wordLimit) * 100
  const transformProgress = (usageData.currentPeriod.transformationsUsed / usageData.currentPeriod.transformationLimit) * 100

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
            <div className="text-2xl font-bold">{usageData.currentPeriod.wordsUsed.toLocaleString()}</div>
            <Progress value={wordProgress} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {usageData.currentPeriod.wordLimit.toLocaleString()} limit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transformations</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageData.currentPeriod.transformationsUsed}</div>
            <Progress value={transformProgress} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {usageData.currentPeriod.transformationLimit} limit
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
              {Math.round(usageData.currentPeriod.wordsUsed / 30).toLocaleString()}
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
              {Math.round(usageData.currentPeriod.wordsUsed / usageData.currentPeriod.transformationsUsed)}
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
            {usageData.dailyUsage.map((day, index) => (
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
                      style={{ width: `${(day.words / 800) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
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