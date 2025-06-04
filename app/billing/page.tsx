'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { CreditCard, Crown, ExternalLink, ArrowLeft, CheckCircle, XCircle, Calendar, DollarSign } from 'lucide-react'

export default function BillingPage() {
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null)
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
      const subscriptionResponse = await fetch('/api/subscription/status')
      if (subscriptionResponse.ok) {
        const subData = await subscriptionResponse.json()
        setSubscriptionInfo(subData)
      }
    } catch (error) {
      console.error('Failed to fetch subscription info:', error)
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

        {/* Subscription Status Card */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Current Plan</h2>
              {subscriptionInfo?.isAdmin ? (
                <div className="flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                  <Crown className="w-4 h-4" />
                  <span className="text-sm font-medium">Admin</span>
                </div>
              ) : subscriptionInfo?.hasActiveSubscription ? (
                <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Pro</span>
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
            ) : subscriptionInfo?.hasActiveSubscription ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <h3 className="font-medium text-green-900">Pro Subscription Active</h3>
                      <p className="text-sm text-green-700">Unlimited transformations and priority support</p>
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
                      <p className="text-sm text-blue-700">Limited transformations per day</p>
                      <p className="text-xs text-blue-600 mt-1">Upgrade to unlock unlimited usage</p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push('/pricing')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Crown className="w-4 h-4" />
                    Upgrade to Pro
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
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Free Plan */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-slate-900 mb-3">Free Plan</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>5 transformations per day</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Standard AI detection bypass</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span>No priority support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span>No advanced features</span>
                  </li>
                </ul>
              </div>

              {/* Pro Plan */}
              <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-medium text-slate-900">Pro Plan</h3>
                  <Crown className="w-4 h-4 text-blue-600" />
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span><strong>Unlimited</strong> transformations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Advanced AI detection bypass</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Priority customer support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Access to new features first</span>
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
                Have questions about our Pro plan? We&apos;re here to help!
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