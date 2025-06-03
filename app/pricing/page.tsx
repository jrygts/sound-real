'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Pricing from '@/components/Pricing'

function PricingContent() {
  const searchParams = useSearchParams()
  const intent = searchParams.get('intent')
  const wasPreview = searchParams.get('preview')
  const isAuthenticated = searchParams.get('authenticated')
  const converted = searchParams.get('converted')

  const getHeadlineMessage = () => {
    if (converted === 'true') {
      return "🔥 Complete Your Transformation - Unlimited Access Awaits"
    } else if (wasPreview === 'true') {
      return "✨ You&apos;ve Seen the Power - Now Get Full Access"
    } else if (intent === 'transform') {
      return "⚡ Transform Your AI Text Right Now"
    } else {
      return "Make AI Text Undetectable"
    }
  }

  const getSubheadline = () => {
    if (converted === 'true') {
      return "Unlock the complete transformation you just previewed + unlimited processing"
    } else if (wasPreview === 'true') {
      return "Complete your transformation and unlock unlimited processing power"
    } else if (intent === 'transform') {
      return "Join 2,847+ users transforming AI text into human-sounding content"
    } else {
      return "Transform AI-generated content into natural, human-sounding text"
    }
  }

  const getUrgencyBanner = () => {
    if (wasPreview === 'true' || converted === 'true') {
      return (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 text-center">
          <p className="font-medium">
            🎯 <strong>Your preview is waiting!</strong> Complete your transformation with unlimited access
          </p>
        </div>
      )
    } else if (intent === 'transform') {
      return (
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 text-center">
          <p className="font-medium">
            ⚡ <strong>Ready to transform?</strong> Join 2,847+ users saving hours daily
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <>
      {getUrgencyBanner()}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              {getHeadlineMessage()}
            </h1>
            <p className="text-xl text-slate-600 mb-8">
              {getSubheadline()}
            </p>

            {/* Enhanced social proof for high-intent traffic */}
            {(wasPreview === 'true' || intent === 'transform') && (
              <div className="bg-white rounded-lg p-6 shadow-lg border max-w-2xl mx-auto mb-8">
                <div className="flex items-center justify-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">2,847+</div>
                    <div className="text-slate-600">Happy Users</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">10hrs</div>
                    <div className="text-slate-600">Saved Weekly</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">99.9%</div>
                    <div className="text-slate-600">Success Rate</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Pricing />

          {/* Extra conversion elements for high-intent traffic */}
          {(wasPreview === 'true' || intent === 'transform') && (
            <div className="mt-12 text-center">
              <div className="bg-white rounded-xl p-8 shadow-lg border max-w-3xl mx-auto">
                <h3 className="text-2xl font-bold text-slate-900 mb-4">
                  Why 2,847+ Users Choose SoundReal
                </h3>
                <div className="grid md:grid-cols-3 gap-6 text-left">
                  <div>
                    <div className="text-blue-600 font-bold text-lg mb-2">⚡ Instant Results</div>
                    <p className="text-slate-600 text-sm">
                      Transform any AI text in seconds, not hours of manual editing
                    </p>
                  </div>
                  <div>
                    <div className="text-green-600 font-bold text-lg mb-2">🛡️ 100% Undetectable</div>
                    <p className="text-slate-600 text-sm">
                      Bypass all major AI detectors with our advanced algorithms
                    </p>
                  </div>
                  <div>
                    <div className="text-purple-600 font-bold text-lg mb-2">💰 Money-Back Guarantee</div>
                    <p className="text-slate-600 text-sm">
                      30-day full refund if you&apos;re not completely satisfied
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading pricing options...</p>
        </div>
      </div>
    }>
      <PricingContent />
    </Suspense>
  )
} 