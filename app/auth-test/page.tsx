'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/libs/supabase/client'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'

export default function AuthTestPage() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [testResults, setTestResults] = useState<any>({})
  const [email, setEmail] = useState('')
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  
  const supabase = createClient()

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)])
  }

  const runAllTests = async () => {
    addLog('🔍 Starting comprehensive auth tests...')
    const results: any = {}

    try {
      // Test 1: Get current session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      results.session = {
        success: !sessionError,
        data: sessionData.session?.user?.email || null,
        error: sessionError?.message
      }
      addLog(`Session test: ${results.session.success ? '✅' : '❌'} ${results.session.data || results.session.error}`)

      // Test 2: Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser()
      results.user = {
        success: !userError,
        data: userData.user?.email || null,
        error: userError?.message
      }
      addLog(`User test: ${results.user.success ? '✅' : '❌'} ${results.user.data || results.user.error}`)

      // Test 3: API endpoint
      const apiResponse = await fetch('/api/auth/me')
      const apiData = await apiResponse.json()
      results.api = {
        success: apiResponse.ok,
        data: apiData,
        status: apiResponse.status
      }
      addLog(`API test: ${results.api.success ? '✅' : '❌'} Status: ${results.api.status}`)

      // Test 4: LocalStorage check
      const authKeys = Object.keys(localStorage).filter(key => 
        key.includes('supabase') || key.includes('auth')
      )
      results.localStorage = {
        success: authKeys.length > 0,
        data: authKeys,
        count: authKeys.length
      }
      addLog(`LocalStorage test: ${results.localStorage.success ? '✅' : '❌'} ${results.localStorage.count} auth keys found`)

      setTestResults(results)
      addLog('🎯 All tests completed!')

    } catch (error) {
      addLog(`💥 Test error: ${error}`)
    }
  }

  const sendMagicLink = async () => {
    if (!email) return
    
    try {
      setLoading(true)
      addLog(`📧 Sending magic link to ${email}...`)
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      })

      if (error) {
        addLog(`❌ Magic link error: ${error.message}`)
      } else {
        setMagicLinkSent(true)
        addLog('✅ Magic link sent! Check your email.')
      }
    } catch (error) {
      addLog(`💥 Magic link error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      addLog('🚪 Signing out...')
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      addLog('✅ Signed out successfully')
      await runAllTests()
    } catch (error) {
      addLog(`💥 Sign out error: ${error}`)
    }
  }

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (mounted) {
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)
          addLog(`🎯 Initial auth state: ${session?.user?.email || 'Not authenticated'}`)
        }
      } catch (error) {
        addLog(`💥 Initial auth error: ${error}`)
        setLoading(false)
      }
    }

    initAuth()
    runAllTests()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        addLog(`🔄 Auth state changed: ${event} - ${session?.user?.email || 'No user'}`)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        
        // Re-run tests when auth state changes
        setTimeout(runAllTests, 1000)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="btn btn-ghost btn-sm mb-4">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold">🔍 Auth Debug Center</h1>
          <p className="text-base-content/70 mt-2">
            Comprehensive authentication testing and debugging
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current Auth Status */}
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Current Auth Status</h2>
              
              {loading ? (
                <div className="flex items-center gap-2">
                  <span className="loading loading-spinner loading-sm"></span>
                  Checking auth state...
                </div>
              ) : (
                <div className="space-y-4">
                  <div className={`badge ${user ? 'badge-success' : 'badge-error'} gap-2`}>
                    {user ? '✅ Authenticated' : '❌ Not Authenticated'}
                  </div>
                  
                  {user && (
                    <div className="space-y-2">
                      <p><strong>Email:</strong> {user.email}</p>
                      <p><strong>ID:</strong> {user.id}</p>
                      <p><strong>Last Sign In:</strong> {new Date(user.last_sign_in_at || '').toLocaleString()}</p>
                    </div>
                  )}
                  
                  <div className="card-actions">
                    <button onClick={runAllTests} className="btn btn-primary btn-sm">
                      🔄 Refresh Tests
                    </button>
                    {user && (
                      <button onClick={signOut} className="btn btn-error btn-sm">
                        🚪 Sign Out
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Magic Link Test */}
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Magic Link Test</h2>
              
              {!user ? (
                <div className="space-y-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Email Address</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="input input-bordered"
                    />
                  </div>
                  
                  {magicLinkSent ? (
                    <div className="alert alert-success">
                      <span>✅ Magic link sent! Check your email and click the link.</span>
                    </div>
                  ) : (
                    <button 
                      onClick={sendMagicLink} 
                      disabled={!email || loading}
                      className="btn btn-primary"
                    >
                      {loading ? <span className="loading loading-spinner loading-xs"></span> : '📧'}
                      Send Magic Link
                    </button>
                  )}
                </div>
              ) : (
                <div className="alert alert-info">
                  <span>You&apos;re already signed in! Sign out to test magic links.</span>
                </div>
              )}
            </div>
          </div>

          {/* Test Results */}
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Test Results</h2>
              
              <div className="space-y-3">
                {Object.entries(testResults).map(([test, result]: [string, any]) => (
                  <div key={test} className="flex items-center justify-between">
                    <span className="font-medium capitalize">{test}:</span>
                    <div className={`badge ${result.success ? 'badge-success' : 'badge-error'}`}>
                      {result.success ? '✅ Pass' : '❌ Fail'}
                    </div>
                  </div>
                ))}
              </div>

              {Object.keys(testResults).length === 0 && (
                <p className="text-base-content/50">Run tests to see results</p>
              )}
            </div>
          </div>

          {/* Debug Logs */}
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Debug Logs</h2>
              
              <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1">{log}</div>
                  ))
                ) : (
                  <div>No logs yet...</div>
                )}
              </div>
              
              <button 
                onClick={() => setLogs([])} 
                className="btn btn-sm btn-outline mt-2"
              >
                Clear Logs
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Quick Actions</h2>
            <div className="flex flex-wrap gap-2">
              <Link href="/auth" className="btn btn-outline btn-sm">
                🔐 Go to Sign In
              </Link>
              <Link href="/dashboard" className="btn btn-outline btn-sm">
                📊 Go to Dashboard
              </Link>
              <button 
                onClick={() => localStorage.clear()} 
                className="btn btn-warning btn-sm"
              >
                🗑️ Clear LocalStorage
              </button>
              <button 
                onClick={() => window.location.reload()} 
                className="btn btn-info btn-sm"
              >
                🔄 Reload Page
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 