// Runtime guard: Throw if any test key leaks into production
if (typeof window === 'undefined' && process.env.NODE_ENV === "production") {
  try {
    const keys = [
      process.env.STRIPE_SECRET_KEY || '',
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    ].filter(Boolean).join("|");

    if (keys && /_test_/.test(keys)) {
      console.error("🚨 PRODUCTION ERROR: Test Stripe keys detected!");
      throw new Error("🚨 Production build contains Stripe TEST keys!");
    }
  } catch (error) {
    console.error("Stripe key validation error:", error);
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }
}

export {}; 