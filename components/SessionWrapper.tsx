"use client"

import React from 'react'
import { SessionProvider } from './SessionProvider'
import type { Session } from '@supabase/supabase-js'

interface SessionWrapperProps {
  children: React.ReactNode
  initialSession?: Session | null
}

export function SessionWrapper({ children, initialSession }: SessionWrapperProps) {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <SessionProvider initialSession={initialSession}>
        {children}
      </SessionProvider>
    </React.Suspense>
  )
} 