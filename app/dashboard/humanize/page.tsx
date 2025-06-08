"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Copy, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { LimitReachedModal } from "@/components/ui/LimitReachedModal"

export const dynamic = "force-dynamic"

export default function HumanizePage() {
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [limitModalOpen, setLimitModalOpen] = useState(false)
  const [wordsRemaining, setWordsRemaining] = useState<number>(0)

  const wordCount = text.split(/\s+/).filter(Boolean).length

  async function handleHumanize() {
    if (!text.trim()) {
      toast.error("Please enter some text to humanize")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/humanize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })

      // Read response body only once
      const data = await res.json()

      if (!res.ok) {
        // Handle specific 403 error case
        if (res.status === 403 && data.error === "limit-reached") {
          setWordsRemaining(data.words_remaining ?? 0)
          setLimitModalOpen(true)
          return
        }
        // Handle all other errors
        throw new Error(data.error || "Failed to humanize text")
      }
      // Map the API response to match the expected format
      setResult({
        transformed: data.humanizedText,
        aiScoreBefore: data.aiScoreBefore,
        aiScoreAfter: data.aiScoreAfter
      })
      toast.success("Text humanized successfully!")
    } catch (error: any) {
      console.error("Humanize error:", error)
      toast.error(error.message || "Failed to humanize text")
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!result?.transformed) return
    
    try {
      await navigator.clipboard.writeText(result.transformed)
      setCopied(true)
      toast.success("Copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error("Failed to copy text")
    }
  }

  function handleReset() {
    setText("")
    setResult(null)
    setCopied(false)
  }

  return (
    <div className="space-y-6">
      <LimitReachedModal
        open={limitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        wordsRemaining={wordsRemaining}
      />
      <div>
        <h1 className="text-3xl font-heading font-semibold">Humanize Text</h1>
        <p className="text-muted-foreground">Transform AI-generated content into natural, human-like prose.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Input Text
            </CardTitle>
            <CardDescription>Paste your AI-generated text here to humanize it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your AI-generated text here..."
              className="min-h-[300px] resize-none"
            />
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                <span className="font-mono">{wordCount}</span> words
              </div>
              <Button 
                onClick={handleHumanize}
                disabled={loading || !text.trim()}
                className="bg-soundrealBlue hover:bg-soundrealBlue/90"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Humanizing...
                  </>
                ) : (
                  "Humanize Text"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Result Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Humanized Output</span>
              {result && (
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    Before: {Math.round((result.aiScoreBefore || 0) * 100)}%
                  </Badge>
                  <Badge variant="default" className="bg-green-600">
                    After: {Math.round((result.aiScoreAfter || 0) * 100)}%
                  </Badge>
                </div>
              )}
            </CardTitle>
            <CardDescription>
              {result ? "Your humanized text is ready!" : "Humanized text will appear here"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result ? (
              <>
                <div className="min-h-[300px] p-4 bg-muted/50 rounded-lg">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {result.transformed}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCopy}
                    variant="outline"
                    className="flex-1"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Text
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                  >
                    New Text
                  </Button>
                </div>
              </>
            ) : (
              <div className="min-h-[300px] flex items-center justify-center text-muted-foreground">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Processing your text...
                  </div>
                ) : (
                  "Enter text and click 'Humanize Text' to see results"
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 