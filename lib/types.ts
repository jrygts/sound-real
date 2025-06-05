export interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
  plan: "Basic" | "Plus" | "Ultra" | "Free"
  // Add other user-specific fields
}

export interface Plan {
  id: string
  name: string
  priceMonthly: number
  priceAnnual?: number
  features: string[]
  wordLimit: number
  transformationLimit: number | "unlimited"
  isMostPopular?: boolean
}

export interface Transformation {
  id: string
  originalText: string
  transformedText: string
  wordCount: number
  createdAt: string // ISO date string
  userId: string
}

export interface Invoice {
  id: string
  date: string // ISO date string
  amount: number
  status: "Paid" | "Pending" | "Failed"
  invoiceUrl?: string
}

// You can expand this file with more types as your application grows.
