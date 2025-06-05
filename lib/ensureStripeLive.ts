// Throw if any test key leaks into production
if (process.env.NODE_ENV === "production") {
  const keys = [
    process.env.STRIPE_SECRET_KEY,
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  ].join("|");

  if (/_test_/.test(keys)) {
    throw new Error("🚨  Production build contains Stripe TEST keys!");
  }
}

export {}; 