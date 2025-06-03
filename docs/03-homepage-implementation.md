# Step 3: Homepage Implementation

## Overview

The homepage is the main interface for users to transform their AI-generated text. It follows NaturalWrite's design pattern with a clean, modern interface.

## File Location

Create or update `app/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Zap, Shield, Clock } from 'lucide-react'

export default function HomePage() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleTransform = async () => {
    if (!text.trim()) return
    
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/humanize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        if (data.error?.includes('sign up')) {
          router.push('/signup')
        } else {
          setError(data.error || 'Something went wrong')
        }
        return
      }
      
      setResult(data)
    } catch (error) {
      setError('Failed to transform text')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
              Make AI Text Sound
              <span className="text-blue-600"> Real</span>
            </h1>
            <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
              Transform AI-generated content into natural, human-sounding text that bypasses AI detectors
            </p>
            
            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-6 mb-12">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                <span className="text-slate-700">Instant Results</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-500" />
                <span className="text-slate-700">100% Undetectable</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <span className="text-slate-700">Save Hours Daily</span>
              </div>
            </div>
          </div>

          {/* Main Interface */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 md:p-8">
            {!result ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Paste your AI text below
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter your ChatGPT, Claude, or any AI-generated text here..."
                    className="w-full h-48 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <div className="mt-2 text-sm text-slate-500">
                    {text.split(/\s+/).filter(Boolean).length} / 1000 words
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleTransform}
                  disabled={!text.trim() || loading}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    'Transforming...'
                  ) : (
                    <>
                      Transform Text
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-sm text-slate-500 mt-4">
                  Free users get 3 transformations daily • No signup required
                </p>
              </>
            ) : (
              <div className="space-y-6">
                {/* Results Header */}
                <div className="text-center pb-6 border-b">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Transformation Complete!
                  </h2>
                  <div className="flex justify-center gap-8 mt-4">
                    <div>
                      <div className="text-3xl font-bold text-red-600">
                        {(result.aiScoreBefore * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm text-slate-600">AI Score Before</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-green-600">
                        {(result.aiScoreAfter * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm text-slate-600">AI Score After</div>
                    </div>
                  </div>
                </div>

                {/* Transformed Text */}
                <div>
                  <h3 className="font-medium text-slate-900 mb-2">Your Humanized Text:</h3>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="whitespace-pre-wrap text-slate-700">
                      {result.humanizedText}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(result.humanizedText)
                      alert('Copied!')
                    }}
                    className="py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                  >
                    Copy Text
                  </button>
                  <button
                    onClick={() => {
                      setResult(null)
                      setText('')
                    }}
                    className="py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    Transform Another
                  </button>
                </div>

                {/* CTA */}
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-blue-900 mb-3">
                    Get unlimited transformations and advanced features
                  </p>
                  <button
                    onClick={() => router.push('/pricing')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Upgrade to Pro →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            Why Choose SoundReal?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
              <p className="text-slate-600">
                Get natural-sounding text in seconds, not hours of manual editing
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Bypass AI Detectors</h3>
              <p className="text-slate-600">
                Our advanced algorithms ensure your text passes all major AI detection tools
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Save Time</h3>
              <p className="text-slate-600">
                Stop wasting hours trying to make AI text sound human manually
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
```

## Key Features

1. **Hero Section**
   - Clear value proposition
   - Trust badges
   - Clean, modern design

2. **Text Transformation Interface**
   - Word count tracking
   - Loading states
   - Error handling
   - Responsive design

3. **Results Display**
   - AI score comparison
   - Copy functionality
   - Upgrade CTA
   - Transform again option

4. **Features Section**
   - Three key benefits
   - Icon-based design
   - Mobile responsive grid

## Dependencies

Make sure to install required packages:

```bash
npm install lucide-react
```

## Next Steps

1. Implement the API route for text transformation
2. Set up user authentication
3. Add usage tracking
4. Implement the pricing page 