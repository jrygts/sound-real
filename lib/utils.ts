import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the correct site URL for the current environment
 * Falls back to automatic detection if NEXT_PUBLIC_SITE_URL is not set correctly
 */
export function getSiteUrl(): string {
  // Server-side: Use environment variable or fallback
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_SITE_URL || 'https://sound-real.com'
  }
  
  // Client-side: Use environment variable or current origin
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL
  
  // If env URL is localhost but we're not on localhost, use current origin
  if (envUrl?.includes('localhost') && !window.location.hostname.includes('localhost')) {
    return window.location.origin
  }
  
  return envUrl || window.location.origin
}
