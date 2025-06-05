export const PLAN_LIMITS = {
  Free: 250,
  Basic: 5_000,
  Plus: 15_000,
  Ultra: 35_000,
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

export const PLAN_TRANSFORMATIONS = {
  Free: 10,
  Basic: 200,
  Plus: 600,
  Ultra: 1200,
} as const;

// Helper function to get plan config
export function getPlanConfig(planType: PlanKey) {
  return {
    words_limit: PLAN_LIMITS[planType],
    transformations_limit: PLAN_TRANSFORMATIONS[planType],
  };
}

// Plan pricing information
export const PLAN_PRICING = {
  Free: { price: 0, priceId: null },
  Basic: { price: 699, priceId: 'price_1RWIGTR2giDQL8gT2b4fgQeD' },
  Plus: { price: 1999, priceId: 'price_1RWIH9R2giDQL8gTtQ0SIOlM' },
  Ultra: { price: 3999, priceId: 'price_1RWIHvR2giDQL8gTI17qjZmD' },
} as const; 