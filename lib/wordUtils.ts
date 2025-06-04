/**
 * WORD-BASED BILLING UTILITIES
 * 
 * Functions for word counting, plan management, and usage validation
 * for the Sound-Real word-based subscription system.
 */

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
    words_limit: 0,
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
  
  // Free users have 0 word limit (use transformations instead)
  if (planType === 'Free') {
    return {
      canProcess: false,
      wordsRemaining: 0,
      reason: 'Free users cannot process words. Please upgrade to a paid plan.'
    };
  }

  const wordsRemaining = Math.max(0, wordsLimit - wordsUsed);

  if (wordsNeeded > wordsRemaining) {
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
  
  if (planType === 'Free') {
    return `Free Plan - 0 words/month`;
  }

  if (wordsLimit === 0) {
    return `${config.name} - Unlimited words`;
  }

  const wordsRemaining = Math.max(0, wordsLimit - wordsUsed);
  const percentage = wordsLimit > 0 ? Math.round((wordsUsed / wordsLimit) * 100) : 0;
  
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
    return `Free users cannot process words. Please upgrade to the Basic plan (${PLAN_CONFIGS.Basic.words_limit.toLocaleString()} words/month) to get started.`;
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