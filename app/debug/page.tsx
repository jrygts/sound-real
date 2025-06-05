'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Crown, User, Settings, Copy } from 'lucide-react'

export default function DebugPage() {
  const [userInfo, setUserInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadUserInfo()
  }, [])

  const loadUserInfo = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUserInfo(data)
      }
    } catch (error) {
      console.error('Failed to load user info:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyUserId = () => {
    if (userInfo?.id) {
      navigator.clipboard.writeText(userInfo.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const copyEnvConfig = () => {
    if (userInfo?.email && userInfo?.id) {
      const config = `NEXT_PUBLIC_ADMIN_EMAILS="${userInfo.email}"
NEXT_PUBLIC_ADMIN_USER_IDS="${userInfo.id}"`
      navigator.clipboard.writeText(config)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Not Signed In</h2>
          <p className="text-slate-600 mb-4">Please sign in to view debug information</p>
                        <a href="/auth" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Sign In
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <Settings className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-slate-900 mb-2">User Debug Information</h1>
          <p className="text-slate-600">Use this information to configure admin access</p>
        </div>

        {/* User Information Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Current User</h2>
            {userInfo.isAdmin && (
              <div className="flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                <Crown className="w-4 h-4" />
                <span className="text-sm font-medium">Admin</span>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <div className="text-slate-900 font-mono bg-slate-50 p-2 rounded border">
                {userInfo.email}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">User ID</label>
              <div className="flex items-center gap-2">
                <div className="text-slate-900 font-mono bg-slate-50 p-2 rounded border flex-1 text-sm">
                  {userInfo.id}
                </div>
                <button
                  onClick={copyUserId}
                  className="p-2 text-slate-600 hover:text-slate-900"
                  title="Copy User ID"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Admin Status</label>
              <div className={`p-2 rounded border ${
                userInfo.isAdmin 
                  ? 'bg-purple-50 text-purple-800 border-purple-200' 
                  : 'bg-gray-50 text-gray-800 border-gray-200'
              }`}>
                {userInfo.adminStatus}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Sign In</label>
              <div className="text-slate-900 bg-slate-50 p-2 rounded border">
                {new Date(userInfo.last_sign_in_at).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Admin Setup Card */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            {userInfo.isAdmin ? '✅ Admin Access Configured' : '⚙️ Admin Setup Required'}
          </h2>

          {userInfo.isAdmin ? (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-800 mb-2">
                <Crown className="w-5 h-5" />
                <span className="font-medium">Admin Access Active</span>
              </div>
              <p className="text-purple-700">
                You have unlimited access to all features without requiring a subscription.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 font-medium mb-2">To enable admin access:</p>
                <ol className="text-yellow-700 text-sm space-y-1 list-decimal list-inside">
                  <li>Copy the environment variables below</li>
                  <li>Add them to your <code className="bg-yellow-100 px-1 rounded">.env.local</code> file</li>
                  <li>Restart your development server</li>
                  <li>Refresh this page to verify admin access</li>
                </ol>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Environment Variables (copy to .env.local)
                </label>
                <div className="relative">
                  <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    <div>NEXT_PUBLIC_ADMIN_EMAILS=&quot;{userInfo.email}&quot;</div>
                    <div>NEXT_PUBLIC_ADMIN_USER_IDS=&quot;{userInfo.id}&quot;</div>
                  </div>
                  <button
                    onClick={copyEnvConfig}
                    className="absolute top-2 right-2 p-2 bg-slate-700 hover:bg-slate-600 text-white rounded"
                    title="Copy Environment Config"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Copy Success Message */}
        {copied && (
          <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">
            ✅ Copied to clipboard!
          </div>
        )}

        <div className="text-center mt-8">
          <a 
            href="/dashboard" 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mr-4"
          >
            Go to Dashboard
          </a>
          <a 
            href="/" 
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  )
} 