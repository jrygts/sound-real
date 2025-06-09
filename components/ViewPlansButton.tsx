"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { CreditCard, ExternalLink, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface ViewPlansButtonProps {
  customerId?: string | null
  hasActiveSubscription?: boolean
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  children?: React.ReactNode
}

export function ViewPlansButton({ 
  customerId, 
  hasActiveSubscription = false,
  variant = "outline",
  size = "default",
  className = "",
  children 
}: ViewPlansButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleClick = async () => {
    setLoading(true)
    
    try {
      if (hasActiveSubscription && customerId) {
        // User has active subscription - redirect to billing portal
        const response = await fetch('/api/create-billing-portal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            customerId: customerId,
            return_url: window.location.href 
          })
        })

        if (response.ok) {
          const { url } = await response.json()
          window.location.href = url
        } else {
          const error = await response.json()
          console.error('Billing portal error:', error)
          
          // Fallback: redirect to pricing page
          router.push('/pricing')
        }
      } else {
        // No active subscription - redirect to pricing page
        router.push('/pricing')
      }
    } catch (error) {
      console.error('ViewPlansButton error:', error)
      
      // Fallback: redirect to pricing page
      router.push('/pricing')
    } finally {
      setLoading(false)
    }
  }

  const getButtonText = () => {
    if (children) return children
    
    if (hasActiveSubscription) {
      return (
        <>
          <CreditCard className="h-4 w-4 mr-2" />
          Manage Subscription
        </>
      )
    }
    
    return (
      <>
        <ExternalLink className="h-4 w-4 mr-2" />
        View Plans
      </>
    )
  }

  const getButtonVariant = () => {
    if (hasActiveSubscription) {
      return variant
    }
    return "default" // Make "View Plans" more prominent for non-subscribers
  }

  return (
    <Button
      variant={getButtonVariant()}
      size={size}
      className={className}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {hasActiveSubscription ? 'Loading Portal...' : 'Loading...'}
        </>
      ) : (
        getButtonText()
      )}
    </Button>
  )
} 