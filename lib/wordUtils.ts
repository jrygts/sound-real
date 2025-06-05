/**
 * WORD-BASED BILLING UTILITIES
 * 
 * Functions for word counting, plan management, and usage validation
 * for the Sound-Real word-based subscription system.
 */

import { createClient } from "@/libs/supabase/server";

// Word counting function - counts INPUT words only
export function countWords(text: string): number {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  // Remove extra whitespace and normalize
  const normalizedText = text
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[\r\n]+/g, ' '); // Replace line breaks with spaces

  if (normalizedText.length === 0) {
    return 0;
  }

  // Split on word boundaries and filter out empty strings
  const words = normalizedText
    .split(/\s+/)
    .filter(word => word.length > 0);

  return words.length;
}

// Plan configuration constants
export const PLAN_CONFIGS = {
  'Free': {
    plan_type: 'Free',
    words_limit: 250,
    transformations_limit: 5, // 5 transformations per day for Free  
    price: 0,
    name: 'Free Plan',
    billing_period: 'daily'
  },
  'Basic': {
    plan_type: 'Basic',
    words_limit: 5000,
    transformations_limit: 200, // Keep for backward compatibility
    price: 6.99,
    name: 'Basic Plan',
    billing_period: 'monthly'
  },
  'Plus': {
    plan_type: 'Plus',
    words_limit: 15000,
    transformations_limit: 600, // Keep for backward compatibility
    price: 19.99,
    name: 'Plus Plan',
    billing_period: 'monthly'
  },
  'Ultra': {
    plan_type: 'Ultra',
    words_limit: 35000,
    transformations_limit: 1200, // Keep for backward compatibility
    price: 39.99,
    name: 'Ultra Plan',
    billing_period: 'monthly'
  }
} as const;

export type PlanType = keyof typeof PLAN_CONFIGS;

// Get plan configuration
export function getPlanConfig(planType: string) {
  return PLAN_CONFIGS[planType as PlanType] || PLAN_CONFIGS.Free;
}

// Get user's current word usage and plan details
export async function getUserWordUsage(userId: string): Promise<{
  words_used: number;
  words_limit: number;
  words_remaining: number;
  transformations_used: number;
  transformations_limit: number;
  plan_type: string;
  has_access: boolean;
}> {
  const supabase = createClient();
  
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(`
      plan_type, 
      words_used, 
      words_limit, 
      transformations_used, 
      transformations_limit
    `)
    .eq("id", userId)
    .single();

  if (error) {
    console.error('❌ [getUserWordUsage] Error:', error);
    throw new Error('Failed to fetch user usage data');
  }

  const wordsUsed = profile?.words_used || 0;
  const wordsLimit = profile?.words_limit || 0;
  const transformationsUsed = profile?.transformations_used || 0;
  const transformationsLimit = profile?.transformations_limit || 5;
  const planType = profile?.plan_type || 'Free';

  const wordsRemaining = Math.max(0, wordsLimit - wordsUsed);
  const transformationsRemaining = Math.max(0, transformationsLimit - transformationsUsed);

  // Determine access based on plan type
  let hasAccess = false;
  if (planType === 'Free') {
    hasAccess = transformationsRemaining > 0;
  } else {
    hasAccess = wordsRemaining > 0 || wordsLimit === -1; // -1 means unlimited
  }

  console.log(`📊 [getUserWordUsage] User ${userId}: ${wordsUsed}/${wordsLimit} words, ${transformationsUsed}/${transformationsLimit} transformations, Plan: ${planType}`);

  return {
    words_used: wordsUsed,
    words_limit: wordsLimit,
    words_remaining: wordsRemaining,
    transformations_used: transformationsUsed,
    transformations_limit: transformationsLimit,
    plan_type: planType,
    has_access: hasAccess
  };
}

// Increment word usage for paid users
export async function incrementWordUsage(userId: string, wordsUsed: number): Promise<void> {
  const supabase = createClient();
  
  // First get current usage
  const { data: currentProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('words_used')
    .eq('id', userId)
    .single();

  if (fetchError) {
    console.error('❌ [incrementWordUsage] Fetch error:', fetchError);
    throw new Error('Failed to fetch current word usage');
  }

  const currentWordsUsed = currentProfile?.words_used || 0;
  
  const { error } = await supabase
    .from('profiles')
    .update({ 
      words_used: currentWordsUsed + wordsUsed,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
    
  if (error) {
    console.error('❌ [incrementWordUsage] Update error:', error);
    throw new Error('Failed to update word usage');
  }
  
  console.log(`📈 [incrementWordUsage] User ${userId}: Added ${wordsUsed} words (${currentWordsUsed} → ${currentWordsUsed + wordsUsed})`);
}

// Increment transformation usage for Free users
export async function incrementTransformationUsage(userId: string): Promise<void> {
  const supabase = createClient();
  
  // First get current usage
  const { data: currentProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('transformations_used')
    .eq('id', userId)
    .single();

  if (fetchError) {
    console.error('❌ [incrementTransformationUsage] Fetch error:', fetchError);
    throw new Error('Failed to fetch current transformation usage');
  }

  const currentTransformationsUsed = currentProfile?.transformations_used || 0;
  
  const { error } = await supabase
    .from('profiles')
    .update({ 
      transformations_used: currentTransformationsUsed + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
    
  if (error) {
    console.error('❌ [incrementTransformationUsage] Update error:', error);
    throw new Error('Failed to update transformation usage');
  }
  
  console.log(`📈 [incrementTransformationUsage] User ${userId}: Incremented transformation usage (${currentTransformationsUsed} → ${currentTransformationsUsed + 1})`);
}

// Check if user can process text with word count
export function canProcessWords(
  wordsNeeded: number,
  wordsUsed: number,
  wordsLimit: number,
  planType: string = 'Free'
): {
  canProcess: boolean;
  wordsRemaining: number;
  reason?: string;
} {
  const config = getPlanConfig(planType);
  const wordsRemaining = Math.max(0, wordsLimit - wordsUsed);

  if (wordsNeeded > wordsRemaining) {
    if (planType === 'Free') {
      return {
        canProcess: false,
        wordsRemaining,
        reason: `Daily word limit reached. You've used ${wordsUsed}/${wordsLimit} words today. Upgrade for higher limits or wait until tomorrow.`
      };
    }
    
    return {
      canProcess: false,
      wordsRemaining,
      reason: `Not enough words remaining. Need ${wordsNeeded}, have ${wordsRemaining}.`
    };
  }

  return {
    canProcess: true,
    wordsRemaining
  };
}

// Calculate next billing period reset date
export function getNextResetDate(planType: string, periodStartDate?: Date): Date {
  const config = getPlanConfig(planType);
  const now = new Date();
  
  if (config.billing_period === 'daily') {
    // Free plan resets daily at midnight
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  } else {
    // Paid plans reset monthly from subscription start date
    if (!periodStartDate) {
      // Fallback to next month if no start date
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      nextMonth.setHours(0, 0, 0, 0);
      return nextMonth;
    }

    const nextReset = new Date(periodStartDate);
    nextReset.setMonth(nextReset.getMonth() + 1);
    
    // If next reset is in the past, move to next month
    while (nextReset <= now) {
      nextReset.setMonth(nextReset.getMonth() + 1);
    }
    
    return nextReset;
  }
}

// Format word usage for display
export function formatWordUsage(
  wordsUsed: number,
  wordsLimit: number,
  planType: string = 'Free'
): string {
  const config = getPlanConfig(planType);
  
  if (wordsLimit === 0) {
    return `${config.name} - Unlimited words`;
  }

  const wordsRemaining = Math.max(0, wordsLimit - wordsUsed);
  const percentage = wordsLimit > 0 ? Math.round((wordsUsed / wordsLimit) * 100) : 0;
  
  if (planType === 'Free') {
    return `${wordsUsed.toLocaleString()} / ${wordsLimit.toLocaleString()} words used today (${percentage}%) - ${wordsRemaining.toLocaleString()} remaining`;
  }
  
  return `${wordsUsed.toLocaleString()} / ${wordsLimit.toLocaleString()} words used (${percentage}%) - ${wordsRemaining.toLocaleString()} remaining`;
}

// Format plan display name
export function formatPlanDisplay(planType: string): string {
  const config = getPlanConfig(planType);
  
  if (planType === 'Free') {
    return `${config.name} - $${config.price}/month`;
  }
  
  return `${config.name} - $${config.price}/month (${config.words_limit.toLocaleString()} words)`;
}

// Get usage percentage
export function getUsagePercentage(wordsUsed: number, wordsLimit: number): number {
  if (wordsLimit === 0) return 0;
  return Math.round((wordsUsed / wordsLimit) * 100);
}

// Check if usage is approaching limit
export function isApproachingLimit(wordsUsed: number, wordsLimit: number, threshold: number = 80): boolean {
  if (wordsLimit === 0) return false;
  return getUsagePercentage(wordsUsed, wordsLimit) >= threshold;
}

// Validate word count input
export function validateWordCount(text: string): {
  isValid: boolean;
  wordCount: number;
  error?: string;
} {
  if (!text || typeof text !== 'string') {
    return {
      isValid: false,
      wordCount: 0,
      error: 'Text is required'
    };
  }

  if (text.trim().length === 0) {
    return {
      isValid: false,
      wordCount: 0,
      error: 'Text cannot be empty'
    };
  }

  // Check if text is too long (character limit)
  if (text.length > 10000) {
    return {
      isValid: false,
      wordCount: countWords(text),
      error: 'Text is too long. Maximum 10,000 characters per request.'
    };
  }

  const wordCount = countWords(text);
  
  if (wordCount === 0) {
    return {
      isValid: false,
      wordCount: 0,
      error: 'No words found in text'
    };
  }

  return {
    isValid: true,
    wordCount
  };
}

// Get error message for word limit exceeded
export function getWordLimitExceededMessage(
  wordsNeeded: number,
  wordsRemaining: number,
  planType: string
): string {
  const config = getPlanConfig(planType);
  
  if (planType === 'Free') {
    return `You need ${wordsNeeded.toLocaleString()} words but only have ${wordsRemaining.toLocaleString()} remaining today. Your Free plan includes ${config.words_limit} words per day. Upgrade to Basic plan (${PLAN_CONFIGS.Basic.words_limit.toLocaleString()} words/month) for higher limits.`;
  }

  return `You need ${wordsNeeded.toLocaleString()} words but only have ${wordsRemaining.toLocaleString()} remaining in your ${config.name}. Please upgrade your plan or wait for your next billing period.`;
}

// Check if billing period needs reset
export function needsBillingReset(
  lastResetDate: Date | string,
  planType: string,
  periodStartDate?: Date | string
): boolean {
  const config = getPlanConfig(planType);
  const now = new Date();
  const lastReset = new Date(lastResetDate);
  
  if (config.billing_period === 'daily') {
    // Free plan resets daily
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    const resetDay = new Date(lastReset);
    resetDay.setHours(0, 0, 0, 0);
    
    return today > resetDay;
  } else {
    // Paid plans reset monthly
    const nextReset = getNextResetDate(planType, periodStartDate ? new Date(periodStartDate) : undefined);
    return now >= nextReset;
  }
}

// 🧪 TESTING: Manual billing cycle reset function
export async function resetBillingCycle(userId: string): Promise<void> {
  const supabase = createClient();
  
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        words_used: 0,
        transformations_used: 0,
        billing_period_start: new Date().toISOString(),
        last_reset_date: new Date().toISOString()
      })
      .eq('id', userId);
      
    if (error) {
      console.error('❌ [resetBillingCycle] Error:', error);
      throw new Error('Failed to reset billing cycle');
    }
    
    console.log(`🔄 [BillingReset] User ${userId}: Billing cycle reset manually`);
  } catch (error) {
    console.error('❌ [resetBillingCycle] Failed:', error);
    throw error;
  }
}

// Calculate days remaining until billing period end
export function calculateDaysRemaining(billingPeriodEnd?: Date | string): number {
  if (!billingPeriodEnd) return 0;
  
  const now = new Date();
  const endDate = new Date(billingPeriodEnd);
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

// Get transformation limit based on plan type
export function getTransformationsLimit(planType: string): number {
  const config = getPlanConfig(planType);
  return config.transformations_limit;
}

// Get current billing status information
export async function getBillingStatus(userId: string): Promise<{
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  daysRemaining: number;
  planType: string;
  wordsUsed: number;
  wordsLimit: number;
  wordsRemaining: number;
  nextResetDate: Date;
}> {
  const supabase = createClient();
  
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(`
      plan_type,
      words_used,
      words_limit,
      billing_period_start,
      billing_period_end,
      period_start_date
    `)
    .eq("id", userId)
    .single();

  if (error) {
    console.error('❌ [getBillingStatus] Error:', error);
    throw new Error('Failed to fetch billing status');
  }

  const planType = profile?.plan_type || 'Free';
  const wordsUsed = profile?.words_used || 0;
  const wordsLimit = profile?.words_limit || 0;
  const wordsRemaining = Math.max(0, wordsLimit - wordsUsed);

  const currentPeriodStart = profile?.billing_period_start 
    ? new Date(profile.billing_period_start)
    : new Date();
    
  const currentPeriodEnd = profile?.billing_period_end 
    ? new Date(profile.billing_period_end)
    : getNextResetDate(planType, currentPeriodStart);

  const daysRemaining = calculateDaysRemaining(currentPeriodEnd);
  const nextResetDate = getNextResetDate(planType, currentPeriodStart);

  return {
    currentPeriodStart,
    currentPeriodEnd,
    daysRemaining,
    planType,
    wordsUsed,
    wordsLimit,
    wordsRemaining,
    nextResetDate
  };
} 