# Migration Scripts

This directory contains utility scripts for managing your application's data and configurations.

## Test to Live Migration

The `migrate-test-to-live.ts` script helps you migrate test-mode Stripe customers and subscriptions to live mode. This is useful when you're ready to move your test users to production.

### Prerequisites

1. Make sure you have both test and live Stripe API keys
2. Ensure you have the Supabase service role key
3. Install dependencies:
   ```bash
   pnpm add -D dotenv
   ```

### Environment Variables

Create a `.env` file in the `scripts` directory with:

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_live_...      # Live mode secret key
STRIPE_TEST_SECRET_KEY=sk_test_... # Test mode secret key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Usage

1. Compile the TypeScript script:
   ```bash
   pnpm tsc scripts/migrate-test-to-live.ts
   ```

2. Run the migration:
   ```bash
   node scripts/migrate-test-to-live.js
   ```

The script will:
1. Find all profiles with test-mode customer IDs (`cus_test_*`)
2. Create new customers in live mode
3. Create new subscriptions with the same plans
4. Update the profiles with new IDs
5. Generate a detailed migration log

### Migration Log

A JSON file named `migration-log-{timestamp}.json` will be created with details about each migration, including:
- Old and new customer IDs
- Old and new subscription IDs
- Success/failure status
- Any errors encountered

### Safety Features

- The script only processes test-mode customers
- Each migration is logged for verification
- Failed migrations are tracked but don't stop the process
- Original IDs are preserved in metadata
- The script can be run multiple times safely (won't duplicate migrations)

### After Migration

1. Verify the migration log
2. Test the migrated accounts in production
3. Consider cleaning up test-mode data after confirming everything works 