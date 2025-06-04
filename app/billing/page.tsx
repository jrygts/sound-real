'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { CreditCard, Crown, ExternalLink, ArrowLeft, CheckCircle, XCircle, Calendar, DollarSign, BarChart3, Zap, FileText } from 'lucide-react'

interface UsageData {
  // Word-based usage (primary for paid plans)
  words_used: number;
  words_limit: number;
  words_remaining: number;
  
  // Legacy transformation-based usage (for Free users)
  totalUsed: number;
  limit: number;
  remaining: number;
  
  plan: string;
  hasAccess: boolean;
  isAdmin: boolean;
  resetDate?: string;
  billing_period_start?: string;
  billing_period_end?: string;
  days_remaining?: number;
  
  // Legacy transformation data for backward compatibility
  transformations_used?: number;
  transformations_limit?: number;
  transformations_remaining?: number;
}

export default function BillingPage() {
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null)
  const [usageInfo, setUsageInfo] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const router = useRouter()

  useEffect(() => {
    loadBillingInfo()
  }, [])

  const loadBillingInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/signin')
      return
    }

    try {
      // Load subscription status
      const subscriptionResponse = await fetch('/api/subscription/status')
      if (subscriptionResponse.ok) {
        const subData = await subscriptionResponse.json()
        setSubscriptionInfo(subData)
      }

      // Load usage information  
      const usageResponse = await fetch('/api/subscription/usage')
      if (usageResponse.ok) {
        const usageData = await usageResponse.json()
        if (usageData.success) {
          setUsageInfo(usageData.usage)
        }
      }
    } catch (error) {
      console.error('Failed to fetch billing info:', error)
    }
    
    setLoading(false)
  }

  const handleManageBilling = async () => {
    setPortalLoading(true)
    
    try {
      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href })
      })

      if (response.ok) {
        const { url } = await response.json()
        window.location.href = url
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to access billing portal')
      }
    } catch (error) {
      console.error('Billing portal error:', error)
      alert('Failed to access billing portal. Please try again.')
    }
    
    setPortalLoading(false)
  }

  // Get plan configuration
  const getPlanConfig = (planType: string) => {
    const configs = {
      'Free': { name: 'Free Plan', price: 0, color: 'slate', limit: '5 daily transformations' },
      'Basic': { name: 'Basic Plan', price: 6.99, color: 'blue', limit: '5,000 words/month' },
      'Plus': { name: 'Plus Plan', price: 19.99, color: 'green', limit: '15,000 words/month' },
      'Ultra': { name: 'Ultra Plan', price: 39.99, color: 'purple', limit: '35,000 words/month' }
    }
    return configs[planType as keyof typeof configs] || configs['Free']
  }

  // Calculate usage percentage (words for paid, transformations for free)
  const getUsagePercentage = () => {
    if (!usageInfo || usageInfo.isAdmin) return 0
    
    if (usageInfo.plan === 'Free') {
      if (usageInfo.limit === -1) return 0
      return Math.min((usageInfo.totalUsed / usageInfo.limit) * 100, 100)
    } else {
      // Paid plans use word-based usage
      if (usageInfo.words_limit === 0) return 0
      return Math.min((usageInfo.words_used / usageInfo.words_limit) * 100, 100)
    }
  }

  const getUsageColor = () => {
    const percentage = getUsagePercentage()
    if (percentage >= 90) return 'text-red-600 bg-red-100'
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const getProgressBarColor = () => {
    const percentage = getUsagePercentage()
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  // Format usage display
  const formatUsageDisplay = () => {
    if (!usageInfo) return ''
    
    if (usageInfo.isAdmin) return 'Unlimited'
    
    if (usageInfo.plan === 'Free') {
      return `${usageInfo.totalUsed}/5 daily`
    } else {
      // Paid plans show word usage
      return `${usageInfo.words_used.toLocaleString()}/${usageInfo.words_limit.toLocaleString()} words`
    }
  }

  const isPaidPlan = usageInfo?.plan && ['Basic', 'Plus', 'Ultra'].includes(usageInfo.plan)

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format date with time for display
  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get billing period status
  const getBillingPeriodStatus = () => {
    if (!usageInfo) return null;
    
    if (usageInfo.plan === 'Free') {
      return {
        type: 'daily',
        message: 'Daily transformations reset at midnight',
        nextReset: 'Tomorrow at midnight'
      };
    }
    
    const daysRemaining = usageInfo.days_remaining || 0;
    return {
      type: 'monthly',
      message: `Word usage resets monthly`,
      nextReset: daysRemaining === 1 ? 'Tomorrow' : `In ${daysRemaining} days`
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-slate-900">Billing & Subscription</h1>
          <p className="text-slate-600 mt-2">Manage your subscription and billing information</p>
        </div>

        {/* Usage Overview Card */}
        {usageInfo && (
          <div className="bg-white rounded-lg shadow-sm border mb-8">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Usage Overview
                </h2>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getUsageColor()}`}>
                  {formatUsageDisplay()}
                </div>
              </div>

              {usageInfo.isAdmin ? (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Crown className="w-6 h-6 text-purple-600" />
                    <div>
                      <h3 className="font-medium text-purple-900">Admin Access</h3>
                      <p className="text-sm text-purple-700">Unlimited words and transformations</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Usage Bar */}
                  <div>
                    <div className="flex justify-between text-sm text-slate-600 mb-2">
                      <span>
                        {usageInfo.plan === 'Free' ? 'Transformations Used' : 'Words Used'}
                      </span>
                      <span>
                        {usageInfo.plan === 'Free' ? 
                          `${usageInfo.totalUsed} of 5 daily` :
                          `${usageInfo.words_used.toLocaleString()} of ${usageInfo.words_limit.toLocaleString()} monthly`
                        }
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
                        style={{ width: `${getUsagePercentage()}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Usage Stats */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-900">
                        {usageInfo.plan === 'Free' ? usageInfo.totalUsed : usageInfo.words_used.toLocaleString()}
                      </div>
                      <div className="text-sm text-slate-600">
                        {usageInfo.plan === 'Free' ? 'Used' : 'Words Used'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {usageInfo.plan === 'Free' ? 
                          usageInfo.remaining :
                          usageInfo.words_remaining.toLocaleString()
                        }
                      </div>
                      <div className="text-sm text-slate-600">
                        {usageInfo.plan === 'Free' ? 'Remaining' : 'Words Left'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{usageInfo.plan}</div>
                      <div className="text-sm text-slate-600">Plan</div>
                    </div>
                  </div>

                  {/* Reset Date */}
                  {usageInfo.resetDate && (
                    <div className="text-center pt-2 border-t">
                      <p className="text-sm text-slate-500">
                        {usageInfo.plan === 'Free' ? 'Daily reset' : 'Monthly reset'}: {new Date(usageInfo.resetDate).toLocaleDateString()}
                      </p>
                      
                      {/* 🚨 NEW: Billing Period Information */}
                      {usageInfo.billing_period_start && usageInfo.billing_period_end && usageInfo.plan !== 'Free' && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <div className="text-xs text-slate-400 space-y-1">
                            <div>Billing period: {formatDate(usageInfo.billing_period_start)} - {formatDate(usageInfo.billing_period_end)}</div>
                            <div>
                              {usageInfo.days_remaining !== undefined && (
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {usageInfo.days_remaining === 0 ? 'Resets today' : 
                                   usageInfo.days_remaining === 1 ? 'Resets tomorrow' :
                                   `Resets in ${usageInfo.days_remaining} days`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Free plan daily reset info */}
                      {usageInfo.plan === 'Free' && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <div className="text-xs text-slate-400">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Transformations reset daily at midnight
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Free User Warnings */}
                  {usageInfo.plan === 'Free' && (
                    <>
                      {/* Low Usage Warning */}
                      {usageInfo.remaining <= 2 && usageInfo.remaining > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                          <div className="flex items-center gap-3">
                            <Zap className="w-5 h-5 text-yellow-600" />
                            <div>
                              <h3 className="font-medium text-yellow-900">Running Low on Transformations</h3>
                              <p className="text-sm text-yellow-700">
                                You have {usageInfo.remaining} transformation{usageInfo.remaining !== 1 ? 's' : ''} left today. 
                                <button 
                                  onClick={() => router.push('/pricing')}
                                  className="text-yellow-800 underline ml-1 hover:text-yellow-900"
                                >
                                  Upgrade to get word-based billing
                                </button>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* No Usage Left */}
                      {usageInfo.remaining <= 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                          <div className="flex items-center gap-3">
                            <XCircle className="w-5 h-5 text-red-600" />
                            <div>
                              <h3 className="font-medium text-red-900">Daily Limit Reached</h3>
                              <p className="text-sm text-red-700">
                                You&apos;ve used all your free transformations for today. Your limit resets tomorrow at midnight.
                                <button 
                                  onClick={() => router.push('/pricing')}
                                  className="text-red-800 underline ml-1 hover:text-red-900"
                                >
                                  Upgrade for word-based billing
                                </button>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Paid User Success Message */}
                  {isPaidPlan && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div>
                          <h3 className="font-medium text-green-900">
                            {getPlanConfig(usageInfo.plan).name} Active
                          </h3>
                          <p className="text-sm text-green-700">
                            You have {usageInfo.words_remaining.toLocaleString()} words remaining this month. 
                            Word-based billing for precise usage tracking.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Word Usage Warning for Paid Users */}
                  {isPaidPlan && usageInfo.words_remaining <= 1000 && usageInfo.words_remaining > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-yellow-600" />
                        <div>
                          <h3 className="font-medium text-yellow-900">Running Low on Words</h3>
                          <p className="text-sm text-yellow-700">
                            You have {usageInfo.words_remaining.toLocaleString()} words remaining this month.
                            <button 
                              onClick={() => router.push('/pricing')}
                              className="text-yellow-800 underline ml-1 hover:text-yellow-900"
                            >
                              Upgrade to a higher plan
                            </button>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Word Limit Exceeded for Paid Users */}
                  {isPaidPlan && usageInfo.words_remaining <= 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                      <div className="flex items-center gap-3">
                        <XCircle className="w-5 h-5 text-red-600" />
                        <div>
                          <h3 className="font-medium text-red-900">Word Limit Reached</h3>
                          <p className="text-sm text-red-700">
                            You&apos;ve used all {usageInfo.words_limit.toLocaleString()} words for this month. 
                            Your limit resets on {new Date(usageInfo.resetDate!).toLocaleDateString()}.
                            <button 
                              onClick={() => router.push('/pricing')}
                              className="text-red-800 underline ml-1 hover:text-red-900"
                            >
                              Upgrade for more words
                            </button>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Current Plan Card */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Current Plan</h2>
              {subscriptionInfo?.isAdmin ? (
                <div className="flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                  <Crown className="w-4 h-4" />
                  <span className="text-sm font-medium">Admin</span>
                </div>
              ) : usageInfo && isPaidPlan ? (
                <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{usageInfo.plan}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-slate-100 text-slate-800 px-3 py-1 rounded-full">
                  <span className="text-sm font-medium">Free</span>
                </div>
              )}
            </div>

            {subscriptionInfo?.isAdmin ? (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Crown className="w-6 h-6 text-purple-600" />
                  <div>
                    <h3 className="font-medium text-purple-900">Admin Account</h3>
                    <p className="text-sm text-purple-700">You have unlimited access to all features</p>
                  </div>
                </div>
              </div>
            ) : usageInfo && isPaidPlan ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <h3 className="font-medium text-green-900">
                        {getPlanConfig(usageInfo.plan).name} - ${getPlanConfig(usageInfo.plan).price}/month
                      </h3>
                      <p className="text-sm text-green-700">
                        {getPlanConfig(usageInfo.plan).limit} • Word-based billing
                      </p>
                      {subscriptionInfo?.subscriptionStatus && (
                        <p className="text-xs text-green-600 mt-1">
                          Status: {subscriptionInfo.subscriptionStatus}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleManageBilling}
                    disabled={portalLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {portalLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        Manage Subscription
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-medium">F</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-blue-900">Free Plan</h3>
                      <p className="text-sm text-blue-700">5 transformations per day</p>
                      <p className="text-xs text-blue-600 mt-1">Upgrade to get word-based billing</p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push('/pricing')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Crown className="w-4 h-4" />
                    Upgrade Plan
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Features Comparison */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Plan Features</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Free Plan */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-slate-900 mb-3">Free Plan</h3>
                <div className="text-sm text-slate-600 mb-3">$0/month</div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>5 transformations/day</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Basic AI detection bypass</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span>No word-based billing</span>
                  </li>
                </ul>
              </div>

              {/* Basic Plan */}
              <div className="border rounded-lg p-4 bg-blue-50">
                <h3 className="font-medium text-slate-900 mb-3">Basic Plan</h3>
                <div className="text-sm text-slate-600 mb-3">$6.99/month</div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span><strong>5,000 words/month</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Advanced AI detection bypass</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Priority processing</span>
                  </li>
                </ul>
              </div>

              {/* Plus Plan */}
              <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-medium text-slate-900">Plus Plan</h3>
                  <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">Popular</span>
                </div>
                <div className="text-sm text-slate-600 mb-3">$19.99/month</div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span><strong>15,000 words/month</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Premium AI humanization</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Priority support</span>
                  </li>
                </ul>
              </div>

              {/* Ultra Plan */}
              <div className="border rounded-lg p-4 bg-purple-50">
                <h3 className="font-medium text-slate-900 mb-3">Ultra Plan</h3>
                <div className="text-sm text-slate-600 mb-3">$39.99/month</div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span><strong>35,000 words/month</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Maximum AI bypass quality</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>24/7 priority support</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Management */}
        {(subscriptionInfo?.hasActiveSubscription && !subscriptionInfo?.isAdmin) && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">Billing Management</h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="flex items-center justify-center gap-3 p-4 border rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                  <CreditCard className="w-5 h-5 text-slate-600" />
                  <div className="text-left">
                    <p className="font-medium text-slate-900">Update Payment Method</p>
                    <p className="text-sm text-slate-600">Change your credit card or billing info</p>
                  </div>
                </button>

                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="flex items-center justify-center gap-3 p-4 border rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                  <Calendar className="w-5 h-5 text-slate-600" />
                  <div className="text-left">
                    <p className="font-medium text-slate-900">Billing History</p>
                    <p className="text-sm text-slate-600">View and download past invoices</p>
                  </div>
                </button>
              </div>

              <div className="mt-6 pt-6 border-t">
                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="text-red-600 hover:text-red-700 text-sm underline disabled:opacity-50"
                >
                  Cancel Subscription
                </button>
                <p className="text-xs text-slate-500 mt-1">
                  You can cancel your subscription at any time. You&apos;ll retain access until the end of your billing period.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* No Subscription Help */}
        {(!subscriptionInfo?.hasActiveSubscription && !subscriptionInfo?.isAdmin) && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Need Help?</h2>
              <p className="text-slate-600 mb-4">
                Have questions about our word-based billing plans? We&apos;re here to help!
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => router.push('/pricing')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  View Pricing
                </button>
                <button
                  onClick={() => window.location.href = 'mailto:support@sound-real.com'}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 