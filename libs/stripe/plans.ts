export const PLAN_CONFIGS = {
  Basic: {
    priceId: "price_1RWIGTR2giDQL8gT2b4fgQeD",
    name: "Basic",
    words: 5_000,
    tx: 200,
    amount: 699,    // cents
  },
  Plus: {
    priceId: "price_1RWIH9R2giDQL8gTtQ0SIOlM",
    name: "Plus",
    words: 15_000,
    tx: 600,
    amount: 1999,
  },
  Ultra: {
    priceId: "price_1RWIHvR2giDQL8gTI17qjZmD",
    name: "Ultra",
    words: 35_000,
    tx: 1_200,
    amount: 3999,
  },
} as const;

export type PlanKey = keyof typeof PLAN_CONFIGS; 