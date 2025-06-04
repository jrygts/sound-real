#!/usr/bin/env node

/**
 * STRIPE PLAN SYNCHRONIZATION UTILITY
 * 
 * This script syncs all users with their current Stripe subscription status
 * to fix any plan_type mismatches in the database.
 * 
 * Usage:
 *   npm run sync-plans              # Sync all users
 *   npm run sync-plans --dry-run    # Show what would be changed without making changes
 *   npm run sync-plans --user-id=<uuid>  # Sync specific user
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

interface SyncResult {
  total: number;
  synced: number;
  errors: number;
  unchanged: number;
  details: Array<{
    userId: string;
    email: string;
    action: 'synced' | 'error' | 'unchanged';
    oldPlan: string;
    newPlan: string;
    error?: string;
  }>;
}

interface UserProfile {
  id: string;
  email: string;
  plan_type: string;
  transformations_limit: number;
  stripe_customer_id: string;
  stripe_subscription_id?: string;
  stripe_subscription_status?: string;
}

class StripePlanSynchronizer {
  private stripe: Stripe;
  private supabase: any;
  private dryRun: boolean;

  constructor(dryRun: boolean = false) {
    // Initialize Stripe
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-08-16',
      typescript: true,
    });

    // Initialize Supabase with service role
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
    }

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    this.dryRun = dryRun;
  }

  /**
   * Get all users from database that have Stripe customer IDs
   */
  async getAllUsersWithStripe(): Promise<UserProfile[]> {
    console.log('🔍 Fetching users with Stripe customer IDs...');
    
    const { data: profiles, error } = await this.supabase
      .from('profiles')
      .select('id, email, plan_type, transformations_limit, stripe_customer_id, stripe_subscription_id, stripe_subscription_status')
      .not('stripe_customer_id', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch user profiles: ${error.message}`);
    }

    console.log(`✅ Found ${profiles.length} users with Stripe customer IDs`);
    return profiles;
  }

  /**
   * Get subscription status from Stripe for a customer
   */
  async getStripeSubscriptionStatus(customerId: string): Promise<{
    status: string;
    subscriptionId?: string;
    priceId?: string;
    isActive: boolean;
  }> {
    try {
      // Get all subscriptions for this customer
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customerId,
        limit: 10, // Get recent subscriptions
      });

      if (subscriptions.data.length === 0) {
        return {
          status: 'inactive',
          isActive: false
        };
      }

      // Find the most recent active subscription, or the most recent one
      const activeSubscription = subscriptions.data.find(sub => sub.status === 'active');
      const latestSubscription = activeSubscription || subscriptions.data[0];

      return {
        status: latestSubscription.status,
        subscriptionId: latestSubscription.id,
        priceId: latestSubscription.items.data[0]?.price.id,
        isActive: latestSubscription.status === 'active'
      };
    } catch (error: any) {
      console.error(`❌ Error fetching Stripe subscription for customer ${customerId}:`, error.message);
      throw error;
    }
  }

  /**
   * Determine correct plan details based on subscription status
   */
  getPlanDetailsFromSubscription(isActive: boolean, priceId?: string): {
    planType: string;
    transformationsLimit: number;
  } {
    if (!isActive) {
      return {
        planType: 'Free',
        transformationsLimit: 5
      };
    }

    // For active subscriptions, all paid plans get Pro access for now
    // You can expand this later based on price ID to differentiate plans
    return {
      planType: 'Pro',
      transformationsLimit: -1 // Unlimited
    };
  }

  /**
   * Update user plan in database
   */
  async updateUserPlan(
    userId: string,
    planType: string,
    transformationsLimit: number,
    subscriptionStatus: string,
    subscriptionId?: string
  ): Promise<void> {
    if (this.dryRun) {
      console.log(`🔵 [DRY RUN] Would update user ${userId} to ${planType} plan`);
      return;
    }

    const updateData: any = {
      plan_type: planType,
      transformations_limit: transformationsLimit,
      stripe_subscription_status: subscriptionStatus,
      transformations_used: 0, // Reset usage on plan change
      last_reset_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (subscriptionId) {
      updateData.stripe_subscription_id = subscriptionId;
    }

    const { error } = await this.supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to update user ${userId}: ${error.message}`);
    }
  }

  /**
   * Sync a single user
   */
  async syncUser(user: UserProfile): Promise<{
    action: 'synced' | 'error' | 'unchanged';
    oldPlan: string;
    newPlan: string;
    error?: string;
  }> {
    try {
      console.log(`🔄 Syncing user: ${user.email} (${user.id})`);
      
      // Get current Stripe subscription status
      const stripeStatus = await this.getStripeSubscriptionStatus(user.stripe_customer_id);
      
      // Determine correct plan
      const correctPlan = this.getPlanDetailsFromSubscription(stripeStatus.isActive, stripeStatus.priceId);
      
      // Check if update is needed
      const needsUpdate = user.plan_type !== correctPlan.planType || 
                         user.transformations_limit !== correctPlan.transformationsLimit;

      if (!needsUpdate) {
        console.log(`✅ User ${user.email} is already correctly set to ${correctPlan.planType}`);
        return {
          action: 'unchanged',
          oldPlan: user.plan_type,
          newPlan: correctPlan.planType
        };
      }

      // Update the user
      await this.updateUserPlan(
        user.id,
        correctPlan.planType,
        correctPlan.transformationsLimit,
        stripeStatus.status,
        stripeStatus.subscriptionId
      );

      console.log(`✅ Updated ${user.email}: ${user.plan_type} → ${correctPlan.planType}`);
      
      return {
        action: 'synced',
        oldPlan: user.plan_type,
        newPlan: correctPlan.planType
      };

    } catch (error: any) {
      console.error(`❌ Error syncing user ${user.email}:`, error.message);
      return {
        action: 'error',
        oldPlan: user.plan_type,
        newPlan: user.plan_type,
        error: error.message
      };
    }
  }

  /**
   * Sync all users
   */
  async syncAllUsers(): Promise<SyncResult> {
    console.log('🚀 Starting Stripe plan synchronization...');
    
    if (this.dryRun) {
      console.log('🔵 DRY RUN MODE - No changes will be made');
    }

    const users = await this.getAllUsersWithStripe();
    const result: SyncResult = {
      total: users.length,
      synced: 0,
      errors: 0,
      unchanged: 0,
      details: []
    };

    for (const user of users) {
      const syncResult = await this.syncUser(user);
      
      result.details.push({
        userId: user.id,
        email: user.email,
        ...syncResult
      });

      switch (syncResult.action) {
        case 'synced':
          result.synced++;
          break;
        case 'error':
          result.errors++;
          break;
        case 'unchanged':
          result.unchanged++;
          break;
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return result;
  }

  /**
   * Sync a specific user by ID
   */
  async syncSpecificUser(userId: string): Promise<SyncResult> {
    console.log(`🚀 Starting sync for specific user: ${userId}`);
    
    if (this.dryRun) {
      console.log('🔵 DRY RUN MODE - No changes will be made');
    }

    const { data: user, error } = await this.supabase
      .from('profiles')
      .select('id, email, plan_type, transformations_limit, stripe_customer_id, stripe_subscription_id, stripe_subscription_status')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new Error(`User not found: ${userId}`);
    }

    if (!user.stripe_customer_id) {
      throw new Error(`User ${userId} does not have a Stripe customer ID`);
    }

    const syncResult = await this.syncUser(user);
    
    return {
      total: 1,
      synced: syncResult.action === 'synced' ? 1 : 0,
      errors: syncResult.action === 'error' ? 1 : 0,
      unchanged: syncResult.action === 'unchanged' ? 1 : 0,
      details: [{
        userId: user.id,
        email: user.email,
        ...syncResult
      }]
    };
  }

  /**
   * Generate summary report
   */
  generateReport(result: SyncResult): void {
    console.log('\n📊 SYNCHRONIZATION SUMMARY');
    console.log('========================');
    console.log(`Total users processed: ${result.total}`);
    console.log(`✅ Successfully synced: ${result.synced}`);
    console.log(`⚠️  Unchanged: ${result.unchanged}`);
    console.log(`❌ Errors: ${result.errors}`);

    if (result.details.length > 0) {
      console.log('\n📋 DETAILED RESULTS');
      console.log('==================');
      
      // Show synced users
      const syncedUsers = result.details.filter(d => d.action === 'synced');
      if (syncedUsers.length > 0) {
        console.log('\n✅ SYNCED USERS:');
        syncedUsers.forEach(user => {
          console.log(`  ${user.email}: ${user.oldPlan} → ${user.newPlan}`);
        });
      }

      // Show errors
      const errorUsers = result.details.filter(d => d.action === 'error');
      if (errorUsers.length > 0) {
        console.log('\n❌ ERRORS:');
        errorUsers.forEach(user => {
          console.log(`  ${user.email}: ${user.error}`);
        });
      }
    }

    if (this.dryRun) {
      console.log('\n🔵 This was a DRY RUN - no actual changes were made');
      console.log('🔵 Run without --dry-run to apply these changes');
    }
  }
}

// Main execution
async function main() {
  try {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const userIdArg = args.find(arg => arg.startsWith('--user-id='));
    const specificUserId = userIdArg ? userIdArg.split('=')[1] : null;

    const synchronizer = new StripePlanSynchronizer(dryRun);

    let result: SyncResult;

    if (specificUserId) {
      result = await synchronizer.syncSpecificUser(specificUserId);
    } else {
      result = await synchronizer.syncAllUsers();
    }

    synchronizer.generateReport(result);

    if (result.errors > 0) {
      process.exit(1);
    }

  } catch (error: any) {
    console.error('💥 Synchronization failed:', error.message);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

export { StripePlanSynchronizer }; 