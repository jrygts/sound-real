"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/libs/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

interface SessionContextType {
  user: User | null
  session: Session | null
  loading: boolean
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  session: null,
  loading: true,
})

export function SessionProvider({
  children,
  initialSession = null,
}: {
  children: React.ReactNode
  initialSession?: Session | null
}) {
  const [session, setSession] = useState<Session | null>(initialSession)
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null)
  const [loading, setLoading] = useState(!initialSession)
  const supabase = createClient()

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      } catch (error) {
        console.error('Error getting session:', error)
        setSession(null)
        setUser(null)
        setLoading(false)
      }
    }

    if (!initialSession) {
      getSession()
    } else {
      setLoading(false)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase, initialSession])

  return (
    <SessionContext.Provider value={{ user, session, loading }}>
      {children}
    </SessionContext.Provider>
  )
}

export const useSession = () => {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}

export const useUser = () => {
  const { user } = useSession()
  return { user }
} 