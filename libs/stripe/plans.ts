export const PLAN_CONFIGS = {
  Basic: {
    priceId: process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID!,
    name: "Basic",
    words: 5_000,
    tx: 200,
    amount: 699,    // cents
  },
  Plus: {
    priceId: process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID!,
    name: "Plus",
    words: 15_000,
    tx: 600,
    amount: 1999,
  },
  Ultra: {
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!,
    name: "Ultra",
    words: 35_000,
    tx: 1_200,
    amount: 3999,
  },
} as const;

export type PlanKey = keyof typeof PLAN_CONFIGS; 