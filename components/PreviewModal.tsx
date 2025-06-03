'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Zap, Clock, TrendingUp, Star, ArrowRight, Shield, Target } from 'lucide-react'

interface PreviewModalProps {
  preview: string
  metrics: {
    originalLength: number
    cleanedLength: number
    wordsProcessed: number
    markdownElementsRemoved: number
    estimatedTimeSaved: number
    aiScoreReduction: number
  }
  fullTextLength: number
  previewLength: number
  isOpen: boolean
  onClose: () => void
  isAuthenticated?: boolean
}

const PreviewModal = ({ 
  preview, 
  metrics, 
  fullTextLength, 
  previewLength, 
  isOpen, 
  onClose, 
  isAuthenticated = false 
}: PreviewModalProps) => {
  const router = useRouter()
  const [isUpgrading, setIsUpgrading] = useState(false)

  const handleUpgrade = () => {
    setIsUpgrading(true)
    const params = new URLSearchParams({
      preview: 'true',
      converted: 'true',
      ...(isAuthenticated && { authenticated: 'true' })
    })
    router.push(`/pricing?${params.toString()}`)
  }

  const handleSignUp = () => {
    const params = new URLSearchParams({
      preview: 'true',
      intent: 'transform'
    })
    router.push(`/signup?${params.toString()}`)
  }

  const completionPercentage = Math.round((previewLength / fullTextLength) * 100)
  const remainingPercentage = 100 - completionPercentage

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              ✨ Your Text Transformation Preview
            </h2>
            <p className="text-slate-600 mt-1">See what SoundReal can do for your content</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Value Demonstration */}
        <div className="p-6 space-y-6">
          {/* Preview Output with Progress */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Humanized Preview:</h3>
              <div className="text-sm text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                {completionPercentage}% Complete
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border shadow-sm mb-4">
              <p className="text-slate-700 leading-relaxed mb-3">{preview}</p>
              <div className="border-t pt-3">
                <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                  <span>Transformation Progress</span>
                  <span>{previewLength} / {fullTextLength} characters</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5" />
                <span className="font-medium">🔒 {remainingPercentage}% More Content Available</span>
              </div>
              <p className="text-blue-100 text-sm">
                Subscribe to unlock the complete transformation and access unlimited humanization
              </p>
            </div>
          </div>

          {/* Value Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg text-center border border-green-200">
              <div className="text-2xl font-bold text-green-600">{metrics.markdownElementsRemoved}</div>
              <div className="text-sm text-green-700 font-medium">Elements Cleaned</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">{metrics.wordsProcessed}</div>
              <div className="text-sm text-blue-700 font-medium">Words Processed</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">{metrics.estimatedTimeSaved}m</div>
              <div className="text-sm text-purple-700 font-medium">Time Saved</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg text-center border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">{metrics.aiScoreReduction}%</div>
              <div className="text-sm text-orange-700 font-medium">AI Score Reduced</div>
            </div>
          </div>

          {/* Social Proof */}
          <div className="bg-slate-50 p-6 rounded-lg border">
            <div className="flex items-center space-x-2 mb-3">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-500 fill-current" />
                ))}
              </div>
              <span className="text-sm text-slate-600 font-medium">4.9/5 from 2,847+ users</span>
            </div>
            <blockquote className="text-slate-700 italic">
              "This tool saved me hours of manual editing. The AI detection bypass is incredible!" 
            </blockquote>
            <cite className="text-sm text-slate-600 font-medium mt-1 block">
              — Sarah M., Content Manager
            </cite>
          </div>

          {/* Value Proposition */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Zap className="w-6 h-6" />
              🚀 Unlock Full Access Now
            </h3>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-200 rounded-full"></div>
                  <span className="text-blue-100">Unlimited text transformations</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-200 rounded-full"></div>
                  <span className="text-blue-100">Save 10+ hours per week</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-200 rounded-full"></div>
                  <span className="text-blue-100">100% undetectable by AI detectors</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-200 rounded-full"></div>
                  <span className="text-blue-100">Priority processing speed</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-200 rounded-full"></div>
                  <span className="text-blue-100">Advanced customization options</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-200 rounded-full"></div>
                  <span className="text-blue-100">24/7 priority support</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white bg-opacity-20 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-200 mb-2">
                <Target className="w-4 h-4" />
                <span className="font-medium">Limited Time: 30% Off Annual Plans</span>
              </div>
              <p className="text-blue-100 text-sm">
                Join 2,847+ users who've transformed their content workflow
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={handleUpgrade}
            disabled={isUpgrading}
            className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center justify-center gap-2 text-lg"
          >
            {isUpgrading ? (
              'Redirecting...'
            ) : (
              <>
                Upgrade Now - Get Full Access
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
          
          {!isAuthenticated && (
            <button
              onClick={handleSignUp}
              className="w-full bg-slate-100 text-slate-700 py-3 px-6 rounded-lg font-medium hover:bg-slate-200 transition-colors"
            >
              Create Free Account First
            </button>
          )}
          
          <p className="text-center text-xs text-slate-500 mt-3">
            💳 Cancel anytime • 30-day money-back guarantee • Instant access
          </p>
        </div>
      </div>
    </div>
  )
}

export default PreviewModal 