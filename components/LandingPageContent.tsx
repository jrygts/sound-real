'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Zap, Shield, Clock, ArrowDown } from 'lucide-react'
import PreviewModal from '@/components/PreviewModal'
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { TrustBadge } from "@/components/trust-badge"
import { GradientButton } from "@/components/gradient-button"
import { FloatingLabelTextarea } from "@/components/floating-label-textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AppHeader } from "@/components/shared/header"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const MAX_WORDS = 1000

export default function LandingPageContent() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  const [wordCount, setWordCount] = useState(0)
  const router = useRouter()

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = event.target.value
    setText(newText)
    const words = newText.trim().split(/\s+/).filter(Boolean)
    setWordCount(words.length)
  }

  const handleTransform = async () => {
    if (wordCount === 0) {
      toast.error("Please enter some text to transform.")
      return
    }
    if (wordCount > MAX_WORDS) {
      toast.error(`Text exceeds the ${MAX_WORDS}-word limit.`)
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      // First check auth status
      const authResponse = await fetch('/api/auth/me')
      const isAuthenticated = authResponse.ok

      if (!isAuthenticated) {
        // For non-authenticated users: Show value demonstration
        const previewResponse = await fetch('/api/humanize/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        })

        if (previewResponse.ok) {
          const preview = await previewResponse.json()
          setPreviewData(preview)
          setShowPreviewModal(true)
        } else {
          // Fallback to pricing if preview fails
          router.push('/pricing?intent=transform')
        }
      } else {
        // Check subscription status for authenticated users
        const subscriptionResponse = await fetch('/api/subscription/status')
        
        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json()

          if (subscriptionData.hasActiveSubscription) {
            // Full access - proceed with normal transformation
            const response = await fetch('/api/humanize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text }),
            })
            
            const data = await response.json()
            
            if (!response.ok) {
              // Handle specific error types
              if (data.error === 'WORD_LIMIT_EXCEEDED') {
                setError(`You need ${data.wordsNeeded} words but only have ${data.wordsRemaining} remaining. Please upgrade your plan or wait for your next billing period.`)
                router.push('/billing')
                return
              }
              
              if (data.error === 'TRANSFORMATION_LIMIT_EXCEEDED') {
                setError(data.message || 'Daily transformation limit reached. Please upgrade to a paid plan.')
                router.push('/billing')
                return
              }
              
              setError(data.error || 'Something went wrong')
              return
            }
            
            setResult(data)
            toast.success("Text transformed successfully!")
            
            // Log usage update if available
            if (data.usage) {
              console.log('📊 Usage updated:', data.usage)
            }
            
          } else {
            // Authenticated but not subscribed - show preview + upgrade
            const previewResponse = await fetch('/api/humanize/preview', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text })
            })

            if (previewResponse.ok) {
              const preview = await previewResponse.json()
              setPreviewData({ ...preview, isAuthenticated: true })
              setShowPreviewModal(true)
            } else {
              router.push('/pricing?intent=transform&authenticated=true')
            }
          }
        } else {
          // Subscription check failed - show preview
          const previewResponse = await fetch('/api/humanize/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
          })

          if (previewResponse.ok) {
            const preview = await previewResponse.json()
            setPreviewData({ ...preview, isAuthenticated: true })
            setShowPreviewModal(true)
          } else {
            router.push('/pricing?intent=transform')
          }
        }
      }
    } catch (error) {
      console.error('Transform error:', error)
      // Fallback to preview on any error
      try {
        const previewResponse = await fetch('/api/humanize/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        })

        if (previewResponse.ok) {
          const preview = await previewResponse.json()
          setPreviewData(preview)
          setShowPreviewModal(true)
        } else {
          router.push('/pricing?intent=transform')
        }
      } catch {
        setError('Network error. Please check your connection and try again.')
        toast.error('Network error. Please check your connection and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const scrollToPricing = () => {
    router.push('/pricing')
    toast.info("Navigating to pricing page...")
  }

  return (
    <>
      <div className="flex flex-col min-h-screen">
        <AppHeader />
        <main className="flex-grow">
          {/* Hero Section */}
          <section className="py-16 md:py-24 lg:py-32 bg-gradient-to-b from-background to-muted/30 dark:from-deepNavy/10 dark:to-background">
            <div className="container px-4 md:px-6 text-center">
              <Logo className="mx-auto mb-6 justify-center" size="lg" />
              <h1 className="text-4xl font-heading sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
                Make AI Text Sound <span className="text-soundrealBlue">Real</span>
              </h1>
              <p className="max-w-2xl mx-auto text-lg text-muted-foreground md:text-xl mb-8">
                Transform AI-generated content into natural, human-like prose that bypasses detectors and engages readers.
              </p>
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-10">
                <TrustBadge icon={<Zap className="h-4 w-4 text-soundrealBlue" />} text="Instant Results" />
                <TrustBadge icon={<Shield className="h-4 w-4 text-soundrealBlue" />} text="100% Undetectable" />
                <TrustBadge icon={<Clock className="h-4 w-4 text-soundrealBlue" />} text="Save Hours Daily" />
              </div>

              {/* Transformation Card */}
              {!result ? (
                <Card className="max-w-2xl mx-auto shadow-soft-md dark:bg-card/70">
                  <CardHeader>
                    <CardTitle className="text-2xl font-heading">Transform Your Text</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FloatingLabelTextarea
                      label="Paste your AI-generated text here..."
                      value={text}
                      onChange={handleTextChange}
                      rows={8}
                      maxLength={MAX_WORDS * 7} // Rough character estimate
                      className="min-h-[150px] md:min-h-[200px]"
                    />
                    <div className="text-left text-sm text-muted-foreground mt-2">
                      <span className={cn(wordCount > MAX_WORDS ? "text-destructive" : "")}>{wordCount}</span> / {MAX_WORDS}{" "}
                      words
                    </div>
                    {error && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                        {error}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <GradientButton
                      onClick={handleTransform}
                      isLoading={loading}
                      className="w-full sm:w-auto sm:flex-1 py-3 text-base"
                      icon={<ArrowRight className="h-5 w-5" />}
                      iconPosition="right"
                      aria-label="Transform text button"
                    >
                      Transform Text
                    </GradientButton>
                  </CardFooter>
                </Card>
              ) : (
                <Card className="max-w-2xl mx-auto shadow-soft-md dark:bg-card/70">
                  <CardHeader>
                    <CardTitle className="text-2xl font-heading">Transformation Complete!</CardTitle>
                    <div className="flex justify-center gap-8 mt-4">
                      <div>
                        <div className="text-3xl font-bold text-red-600">
                          {(result.aiScoreBefore * 100).toFixed(0)}%
                        </div>
                        <div className="text-sm text-muted-foreground">AI Score Before</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-green-600">
                          {(result.aiScoreAfter * 100).toFixed(0)}%
                        </div>
                        <div className="text-sm text-muted-foreground">AI Score After</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <h3 className="font-medium text-foreground mb-2">Your Humanized Text:</h3>
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="whitespace-pre-wrap text-left">
                          {result.humanizedText}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="grid grid-cols-2 gap-4">
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(result.humanizedText)
                        toast.success('Text copied to clipboard!')
                      }}
                      className="w-full"
                    >
                      Copy Text
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setResult(null)
                        setText('')
                        setWordCount(0)
                        setError('')
                      }}
                      className="w-full"
                    >
                      Transform Another
                    </Button>
                  </CardFooter>
                </Card>
              )}

              <div className="mt-16">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={scrollToPricing}
                  className="rounded-full animate-bounce hover:animate-none"
                  aria-label="Scroll to pricing section"
                >
                  <ArrowDown className="mr-2 h-5 w-5" />
                  Explore Plans
                </Button>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section id="features" className="py-20 bg-muted/30 dark:bg-background scroll-mt-24">
            <div className="container px-4 md:px-6">
              <h2 className="text-3xl font-heading font-bold text-center mb-12">
                Why Choose SoundReal?
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                <Card className="text-center">
                  <CardHeader>
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-8 h-8 text-soundrealBlue" />
                    </div>
                    <CardTitle>Lightning Fast</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Get natural-sounding text in seconds, not hours of manual editing
                    </p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardHeader>
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Shield className="w-8 h-8 text-green-600" />
                    </div>
                    <CardTitle>Bypass AI Detectors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Our advanced algorithms ensure your text passes all major AI detection tools
                    </p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardHeader>
                    <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-8 h-8 text-purple-600" />
                    </div>
                    <CardTitle>Save Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Stop wasting hours trying to make AI text sound human manually
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        </main>
        <footer className="py-8 border-t">
          <div className="container text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} SoundReal. All rights reserved.
          </div>
        </footer>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && previewData && (
        <PreviewModal
          preview={previewData.preview}
          metrics={previewData.metrics}
          fullTextLength={previewData.fullTextLength}
          previewLength={previewData.previewLength}
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          isAuthenticated={previewData.isAuthenticated}
        />
      )}
    </>
  )
} 