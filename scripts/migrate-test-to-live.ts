import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Stripe with live mode key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
});

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Profile {
  id: string;
  email: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  stripe_subscription_status: string;
  price_id: string;
}

async function migrateTestToLive() {
  try {
    console.log('🔍 Fetching test customers from database...');
    
    // Get all profiles with test customer IDs
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .like('stripe_customer_id', 'cus_test%');

    if (error) {
      throw new Error(`Failed to fetch profiles: ${error.message}`);
    }

    if (!profiles || profiles.length === 0) {
      console.log('No test customers found to migrate.');
      return;
    }

    console.log(`Found ${profiles.length} test customers to migrate.`);

    // Create a mapping file to track migrations
    const migrationLog: Record<string, {
      oldCustomerId: string;
      newCustomerId: string;
      oldSubscriptionId: string;
      newSubscriptionId: string;
      status: 'success' | 'failed';
      error?: string;
    }> = {};

    // Process each profile
    for (const profile of profiles) {
      try {
        console.log(`\n🔄 Migrating customer ${profile.email}...`);

        // Create new customer in live mode
        const newCustomer = await stripe.customers.create({
          email: profile.email,
          metadata: {
            migrated_from: profile.stripe_customer_id,
            supabase_uid: profile.id
          }
        });

        // Get the test subscription details
        const testSubscription = await stripe.subscriptions.retrieve(
          profile.stripe_subscription_id,
          { apiKey: process.env.STRIPE_TEST_SECRET_KEY }
        );

        // Create new subscription in live mode
        const newSubscription = await stripe.subscriptions.create({
          customer: newCustomer.id,
          items: [{ price: testSubscription.items.data[0].price.id }],
          metadata: {
            migrated_from: profile.stripe_subscription_id,
            supabase_uid: profile.id
          }
        });

        // Update profile with new IDs
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            stripe_customer_id: newCustomer.id,
            stripe_subscription_id: newSubscription.id,
            stripe_subscription_status: newSubscription.status,
            has_access: newSubscription.status === 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);

        if (updateError) {
          throw new Error(`Failed to update profile: ${updateError.message}`);
        }

        // Log successful migration
        migrationLog[profile.id] = {
          oldCustomerId: profile.stripe_customer_id,
          newCustomerId: newCustomer.id,
          oldSubscriptionId: profile.stripe_subscription_id,
          newSubscriptionId: newSubscription.id,
          status: 'success'
        };

        console.log(`✅ Successfully migrated ${profile.email}`);
        console.log(`   Customer: ${profile.stripe_customer_id} → ${newCustomer.id}`);
        console.log(`   Subscription: ${profile.stripe_subscription_id} → ${newSubscription.id}`);

      } catch (error) {
        console.error(`❌ Failed to migrate ${profile.email}:`, error);
        
        migrationLog[profile.id] = {
          oldCustomerId: profile.stripe_customer_id,
          newCustomerId: '',
          oldSubscriptionId: profile.stripe_subscription_id,
          newSubscriptionId: '',
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // Save migration log
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(
      `migration-log-${timestamp}.json`,
      JSON.stringify(migrationLog, null, 2)
    );

    console.log('\n📊 Migration Summary:');
    const successCount = Object.values(migrationLog).filter(m => m.status === 'success').length;
    const failCount = Object.values(migrationLog).filter(m => m.status === 'failed').length;
    console.log(`✅ Successfully migrated: ${successCount}`);
    console.log(`❌ Failed migrations: ${failCount}`);
    console.log(`\n📝 Full migration log saved to: migration-log-${timestamp}.json`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateTestToLive(); 