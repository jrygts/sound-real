'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { FileText, Download, BarChart3, Copy, Crown } from 'lucide-react'
import { isCurrentUserAdmin } from '@/libs/admin'

export default function Dashboard() {
  const [transformations, setTransformations] = useState<any[]>([])
  const [stats, setStats] = useState({ today: 0, total: 0, saved: 0 })
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const router = useRouter()

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/signin')
      return
    }

    // Check admin status
    const adminStatus = await isCurrentUserAdmin()
    setIsAdmin(adminStatus)

    // Get subscription info
    try {
      const subscriptionResponse = await fetch('/api/subscription/status')
      if (subscriptionResponse.ok) {
        const subData = await subscriptionResponse.json()
        setSubscriptionInfo(subData)
      }
    } catch (error) {
      console.error('Failed to fetch subscription info:', error)
    }

    // Get transformations
    const { data: transforms } = await supabase
      .from('transformations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Calculate stats
    const { count: total } = await supabase
      .from('transformations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const { count: today } = await supabase
      .from('transformations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', new Date().toISOString().split('T')[0])

    setTransformations(transforms || [])
    setStats({ 
      today: today || 0, 
      total: total || 0, 
      saved: (total || 0) * 5 // Assume 5 mins saved per transformation
    })
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            {isAdmin && (
              <div className="flex items-center gap-2 mt-2">
                <Crown className="w-4 h-4 text-purple-600" />
                <span className="text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-medium">
                  Admin Access - Unlimited Usage
                </span>
              </div>
            )}
          </div>
          
          {/* Subscription Status */}
          <div className="text-right">
            {subscriptionInfo?.isAdmin ? (
              <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg">
                <p className="font-medium">🔧 Admin Account</p>
                <p className="text-sm">Unlimited access</p>
              </div>
            ) : subscriptionInfo?.hasActiveSubscription ? (
              <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg">
                <p className="font-medium">✨ Pro Member</p>
                <p className="text-sm">Unlimited transformations</p>
              </div>
            ) : (
              <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg">
                <p className="font-medium">Free Trial</p>
                <button 
                  onClick={() => router.push('/pricing')}
                  className="text-sm underline hover:no-underline"
                >
                  Upgrade to Pro →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Today</p>
                <p className="text-2xl font-bold text-slate-900">{stats.today}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Total Transformations</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Time Saved</p>
                <p className="text-2xl font-bold text-slate-900">{stats.saved} mins</p>
              </div>
              <Download className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Quick Action */}
        <div className={`rounded-lg p-6 mb-8 text-center ${
          isAdmin ? 'bg-gradient-to-r from-purple-600 to-indigo-600' : 'bg-blue-600'
        }`}>
          <h2 className="text-2xl font-bold text-white mb-2">
            {isAdmin ? '🔧 Admin Mode - Transform Unlimited Text' : 'Ready to transform more text?'}
          </h2>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-6 py-3 bg-white rounded-lg font-medium hover:bg-blue-50"
            style={{ color: isAdmin ? '#7c3aed' : '#2563eb' }}
          >
            New Transformation
          </button>
        </div>

        {/* Recent Transformations */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-slate-900">
              Recent Transformations
            </h2>
          </div>
          
          <div className="divide-y">
            {transformations.length > 0 ? transformations.map((t) => (
              <div key={t.id} className="p-6 hover:bg-slate-50">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm text-slate-600">
                      {new Date(t.created_at).toLocaleDateString()} at{' '}
                      {new Date(t.created_at).toLocaleTimeString()}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {t.word_count} words
                    </p>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full">
                      Before: {(t.ai_score_before * 100).toFixed(0)}%
                    </span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
                      After: {(t.ai_score_after * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1">Original</p>
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {t.original_text}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1">Humanized</p>
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {t.humanized_text}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(t.humanized_text)
                    alert('Copied!')
                  }}
                  className="mt-4 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Copy className="w-4 h-4" />
                  Copy humanized text
                </button>
              </div>
            )) : (
              <div className="p-12 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No transformations yet</h3>
                <p className="text-slate-600 mb-4">Start transforming AI text to see your history here</p>
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create First Transformation
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
