'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { FileText, Download, BarChart3, Copy } from 'lucide-react'

export default function Dashboard() {
  const [transformations, setTransformations] = useState<any[]>([])
  const [stats, setStats] = useState({ today: 0, total: 0, saved: 0 })
  const [loading, setLoading] = useState(true)
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
      router.push('/login')
      return
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
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
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
        <div className="bg-blue-600 rounded-lg p-6 mb-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Ready to transform more text?
          </h2>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-6 py-3 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50"
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
            {transformations.map((t) => (
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
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
