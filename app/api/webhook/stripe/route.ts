import configFile from "@/config";
import { findCheckoutSession } from "@/libs/stripe";
import { SupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-08-16",
  typescript: true,
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// WORD-BASED PLAN CONFIGURATION
const PLAN_CONFIGS: Record<string, {
  plan_type: string;
  words_limit: number;
  transformations_limit: number;
  price: number;
  name: string;
}> = {
  'price_1RWIGTR2giDQL8gT2b4fgQeD': {
    plan_type: 'Basic',
    words_limit: 5000,
    transformations_limit: 200,
    price: 6.99,
    name: 'Basic Plan'
  },
  'price_1RWIH9R2giDQL8gTtQ0SIOlM': {
    plan_type: 'Plus',
    words_limit: 15000,
    transformations_limit: 600,
    price: 19.99,
    name: 'Plus Plan'
  },
  'price_1RWIHvR2giDQL8gTI17qjZmD': {
    plan_type: 'Ultra',
    words_limit: 35000,
    transformations_limit: 1200,
    price: 39.99,
    name: 'Ultra Plan'
  }
};

// Create a private supabase client using the secret service_role API key
const supabase = new SupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Enhanced logging function
function logEventDetails(event: Stripe.Event, action: string) {
  const subscription = event.data.object as Stripe.Subscription;
  const previousAttributes = (event.data as any).previous_attributes || {};
  
  console.log(`📊 [Webhook] ${action}:`, {
    eventType: event.type,
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    status: subscription.status,
    priceId: subscription.items.data[0]?.price.id,
    currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    previousAttributes: Object.keys(previousAttributes),
    hasItemsChange: !!previousAttributes?.items,
    hasPeriodStartChange: !!previousAttributes?.current_period_start,
    hasPeriodEndChange: !!previousAttributes?.current_period_end,
    hasStatusChange: !!previousAttributes?.status
  });
}

// Enhanced detection by comparing billing periods
async function detectBillingPeriodChange(subscription: Stripe.Subscription, customerId: string): Promise<boolean> {
  try {
    console.log(`🔍 [Webhook] Checking billing period change for customer: ${customerId}`);
    
    // Get current subscription data from database
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('billing_period_start, billing_period_end, stripe_subscription_id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (error || !profile) {
      console.log(`📅 [Webhook] No existing profile found, treating as new subscription`);
      return true; // New subscription
    }

    const dbPeriodStart = profile.billing_period_start 
      ? new Date(profile.billing_period_start).getTime()
      : 0;
    const stripePeriodStart = subscription.current_period_start * 1000;

    // 🚨 CRITICAL FIX: Add tolerance for timestamp differences
    // Plan changes can cause small timing differences (minutes/hours)
    // True billing renewals will have much larger differences (days/weeks)
    const timeDifference = Math.abs(dbPeriodStart - stripePeriodStart);
    const toleranceMs = 12 * 60 * 60 * 1000; // 12 hours tolerance
    
    const periodChanged = timeDifference > toleranceMs;
    
    console.log(`📅 [Webhook] Billing period analysis:`, {
      dbPeriodStart: new Date(dbPeriodStart).toISOString(),
      stripePeriodStart: new Date(stripePeriodStart).toISOString(),
      timeDifferenceHours: (timeDifference / (60 * 60 * 1000)).toFixed(2),
      toleranceHours: (toleranceMs / (60 * 60 * 1000)),
      periodChanged,
      subscriptionIdMatch: profile.stripe_subscription_id === subscription.id,
      analysis: timeDifference <= toleranceMs ? 
        'Within tolerance - likely plan change' : 
        'Beyond tolerance - likely billing renewal'
    });

    return periodChanged;
  } catch (error) {
    console.error('❌ [Webhook] Error detecting billing period change:', error);
    return false; // Default to preserving usage if uncertain
  }
}

// Unified function to update subscription data
async function updateSubscriptionData(
  subscription: Stripe.Subscription, 
  resetUsage: boolean, 
  reason: string,
  userId?: string  // 🚨 NEW: Accept userId parameter from checkout
): Promise<void> {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;
  
  // 🚨 NEW: Try to get userId from multiple sources
  const targetUserId = userId  // From checkout session
                    || subscription.metadata?.supabase_uid  // From subscription metadata
                    || null;

  console.log(`🔍 [Webhook] Resolving user for subscription update:`, {
    customerId,
    priceId,
    targetUserId,
    reason
  });
  
  const planConfig = PLAN_CONFIGS[priceId];
  if (!planConfig) {
    console.error(`❌ [Webhook] Unknown price ID: ${priceId}`);
    return;
  }

  // 🚨 NEW LOGIC: Find profile by userId first, then backfill customer ID
  let profileId = null;
  let needsCustomerId = false;

  if (targetUserId) {
    // 1️⃣ Try to find profile by Supabase UUID (most reliable)
    const { data: profileByUid, error: profileError } = await supabase
      .from("profiles")
      .select("id, stripe_customer_id")
      .eq("id", targetUserId)
      .single();

    if (profileError) {
      console.error(`❌ [Webhook] Failed to find profile by UUID ${targetUserId}:`, profileError);
    } else if (profileByUid) {
      profileId = profileByUid.id;
      needsCustomerId = !profileByUid.stripe_customer_id;
      console.log(`✅ [Webhook] Found profile by UUID: ${profileId}, needs customer ID: ${needsCustomerId}`);
    }
  }

  if (!profileId) {
    // 2️⃣ Fallback: Try to find by stripe_customer_id (for existing users)
    const { data: profileByCustomerId, error: customerError } = await supabase
      .from("profiles")
      .select("id, stripe_customer_id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (customerError) {
      console.error(`❌ [Webhook] Failed to find profile by customer ID ${customerId}:`, customerError);
      throw new Error(`No profile found for customer ${customerId} or user ${targetUserId}`);
    } else if (profileByCustomerId) {
      profileId = profileByCustomerId.id;
      console.log(`✅ [Webhook] Found profile by customer ID: ${profileId}`);
    }
  }

  if (!profileId) {
    throw new Error(`No profile found for customer ${customerId} or user ${targetUserId}`);
  }

  // 3️⃣ Build update payload
  const updateData: any = {
    plan_type: planConfig.plan_type,
    words_limit: planConfig.words_limit,
    transformations_limit: planConfig.transformations_limit,
    stripe_subscription_status: subscription.status,
    stripe_subscription_id: subscription.id,
    billing_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    billing_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    has_access: subscription.status === 'active',
    updated_at: new Date().toISOString()
  };

  if (priceId) {
    updateData.price_id = priceId;
  }

  // 🚨 NEW: Backfill stripe_customer_id if needed
  if (needsCustomerId) {
    updateData.stripe_customer_id = customerId;
    console.log(`🔧 [Webhook] Backfilling stripe_customer_id: ${customerId}`);
  }

  // 🚨 CRITICAL: Only reset usage if explicitly requested
  if (resetUsage) {
    updateData.words_used = 0;
    updateData.transformations_used = 0;
    updateData.last_reset_date = new Date().toISOString();
    console.log(`📅 [Webhook] ${reason} - RESETTING usage to 0`);
  } else {
    console.log(`🔄 [Webhook] ${reason} - PRESERVING current usage`);
  }

  console.log(`📝 [Webhook] Update data:`, {
    profileId,
    customerId,
    planType: planConfig.plan_type,
    wordsLimit: planConfig.words_limit,
    subscriptionStatus: subscription.status,
    resetUsage,
    reason,
    backfillingCustomerId: needsCustomerId
  });

  // 4️⃣ Update by profile ID (not customer ID)
  const { data: updatedProfile, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', profileId)  // 🚨 FIXED: Update by profile ID, not customer ID
    .select('id, plan_type, words_used, words_limit, stripe_customer_id')
    .single();

  if (error) {
    console.error('❌ [Webhook] Database update failed:', error);
    throw new Error('Failed to update subscription data');
  }

  console.log(`✅ [Webhook] Updated to ${planConfig.plan_type} plan:`, {
    userId: updatedProfile?.id,
    planType: updatedProfile?.plan_type,
    wordsUsed: updatedProfile?.words_used,
    wordsLimit: updatedProfile?.words_limit,
    stripeCustomerId: updatedProfile?.stripe_customer_id,
    usageAction: resetUsage ? 'RESET' : 'PRESERVED'
  });
}

// Handle new subscriptions - preserve usage for existing customers
async function handleSubscriptionCreated(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  logEventDetails(event, 'NEW SUBSCRIPTION CREATED');
  
  await updateSubscriptionData(
    subscription, 
    false, // ✅ preserve usage - this could be a plan change via subscription recreation
    'New subscription created'
    // Note: No userId passed here since this event doesn't contain client_reference_id
    // Will fall back to finding by stripe_customer_id
  );
}

// Handle subscription updates - distinguish between plan changes and renewals
async function handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const previousAttributes = (event.data as any).previous_attributes || {};
  
  logEventDetails(event, 'SUBSCRIPTION UPDATED');
  
  // 🚨 CRITICAL: Analyze what actually changed
  const hasPeriodChange = previousAttributes?.current_period_start || 
                         previousAttributes?.current_period_end;
  
  const hasPlanChange = previousAttributes?.items?.data ||
                       previousAttributes?.items;
  
  const hasStatusChange = previousAttributes?.status;
  
  // Additional check: verify billing period actually changed
  const periodActuallyChanged = await detectBillingPeriodChange(
    subscription, 
    subscription.customer as string
  );
  
  console.log(`🔍 [Webhook] Change analysis:`, {
    hasPeriodChange,
    hasPlanChange,
    hasStatusChange,
    periodActuallyChanged,
    previousAttributeKeys: Object.keys(previousAttributes || {})
  });
  
  // Decision logic for resetting usage
  let shouldResetUsage = false;
  let reason = '';
  
  if (periodActuallyChanged && !hasPlanChange) {
    // ✅ billing-cycle rollover → reset
    shouldResetUsage = true;
    reason = 'Billing period renewal detected';
  } else if (hasPlanChange) {
    // ✅ any upgrade/downgrade, keep usage
    shouldResetUsage = false;
    reason = 'Plan change mid-cycle detected';
  } else {
    shouldResetUsage = false;
    reason = 'General subscription update';
  }
  
  console.log(`🎯 [Webhook] Decision: ${shouldResetUsage ? 'RESET' : 'PRESERVE'} usage - ${reason}`);
  
  await updateSubscriptionData(subscription, shouldResetUsage, reason);
}

// Handle successful invoice payments - additional billing cycle detection
async function handleInvoicePaymentSucceeded(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  
  console.log(`💰 [Webhook] Invoice payment succeeded:`, {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    subscriptionId: invoice.subscription,
    billingReason: invoice.billing_reason,
    amount: invoice.amount_paid
  });
  
  // Only handle subscription renewals
  if (invoice.billing_reason === 'subscription_cycle' && invoice.subscription) {
    try {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      
      await updateSubscriptionData(
        subscription, 
        true, // Reset usage for billing cycle
        'Invoice payment succeeded - billing cycle'
        // Note: No userId available from invoice events
      );
    } catch (error) {
      console.error('❌ [Webhook] Failed to retrieve subscription for invoice:', error);
    }
  } else {
    console.log(`ℹ️ [Webhook] Invoice payment not for subscription cycle, ignoring`);
  }
}

// Handle subscription cancellations
async function handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  
  logEventDetails(event, 'SUBSCRIPTION DELETED');
  
  const { error } = await supabase
    .from('profiles')
    .update({
      plan_type: 'Free',
              words_limit: 250,
      transformations_limit: 5,
      stripe_subscription_status: 'canceled',
      stripe_subscription_id: null,
      has_access: false,
      updated_at: new Date().toISOString()
      // Note: NOT resetting words_used - let it carry over until daily reset
    })
    .eq('stripe_customer_id', subscription.customer);
    
  if (error) {
    console.error('❌ [Webhook] Failed to handle subscription deletion:', error);
    throw new Error('Failed to handle subscription cancellation');
  }
  
  console.log(`❌ [Webhook] Subscription canceled, reverted to Free plan (usage preserved until daily reset)`);
}

// Enhanced webhook handler with comprehensive debugging
export async function POST(req: NextRequest) {
  console.log(`🔗 [Webhook] Received webhook request`);
  
  const body = await req.text();
  const signature = headers().get("stripe-signature");

  // Log webhook environment setup
  console.log(`🔗 [Webhook] Environment check:`, {
    hasWebhookSecret: !!webhookSecret,
    hasSignature: !!signature,
    bodyLength: body.length,
    hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...'
  });

  let event: Stripe.Event;

  // TEST DATABASE CONNECTION FIRST
  try {
    console.log(`🔗 [Webhook] 🧪 Testing database connection...`);
    const { data: testData, error: testError } = await supabase
      .from("profiles")
      .select("id")
      .limit(1);
    
    if (testError) {
      console.error(`🔗 [Webhook] ❌ Database connection failed:`, testError);
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    } else {
      console.log(`🔗 [Webhook] ✅ Database connection successful`);
    }
  } catch (dbError) {
    console.error(`🔗 [Webhook] ❌ Database test failed:`, dbError);
    return NextResponse.json({ error: "Database test failed" }, { status: 500 });
  }

  // verify Stripe event is legit
  try {
    if (!webhookSecret) {
      console.error(`🔗 [Webhook] ❌ STRIPE_WEBHOOK_SECRET not configured`);
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    if (!signature) {
      console.error(`🔗 [Webhook] ❌ No stripe-signature header found`);
      return NextResponse.json({ error: "No signature provided" }, { status: 400 });
    }

    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log(`🔗 [Webhook] ✅ Event verified successfully`);
  } catch (err) {
    console.error(`🔗 [Webhook] ❌ Signature verification failed:`, err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  console.log(`📨 [Webhook] Processing event: ${event.type} (ID: ${event.id})`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        console.log(`💳 [Webhook] Processing checkout.session.completed`);
        
        const stripeObject: Stripe.Checkout.Session = event.data
          .object as Stripe.Checkout.Session;

        const session = await findCheckoutSession(stripeObject.id);
        const customerId = session?.customer;
        const priceId = session?.line_items?.data[0]?.price?.id;
        const userId = stripeObject.client_reference_id;
        const planConfig = priceId ? PLAN_CONFIGS[priceId] : null;

        console.log(`💳 [Webhook] Extracted session details:`, {
          customerId,
          priceId,
          userId,
          planFound: !!planConfig,
          planName: planConfig?.name
        });

        if (!customerId) {
          console.error(`💳 [Webhook] ❌ No customer ID found in session`);
          return NextResponse.json({ error: "No customer ID" }, { status: 400 });
        }

        if (!userId) {
          console.error(`💳 [Webhook] ❌ No client_reference_id (user ID) found in session`);
          return NextResponse.json({ error: "No user ID found in checkout session" }, { status: 400 });
        }

        // Get subscription details
        let subscriptionId = null;
        if (session?.mode === 'subscription' && session?.subscription) {
          subscriptionId = session.subscription as string;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          
          await updateSubscriptionData(
            subscription,
            false, // ✅ keep usage when user buys new plan mid-cycle
            'Plan purchased via checkout',
            userId  // 🚨 NEW: Pass the user ID from checkout session
          );
        }
        break;
      }

      case "customer.subscription.created":
        await handleSubscriptionCreated(event);
        break;
        
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event);
        break;
        
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event);
        break;
        
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event);
        break;

      case "invoice.payment_failed": {
        const failedInvoice = event.data.object as Stripe.Invoice;
        
        const { error: failedError } = await supabase
          .from('profiles')
          .update({
            stripe_subscription_status: 'past_due',
            has_access: false,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_customer_id', failedInvoice.customer);

        if (!failedError) {
          console.log(`⚠️ [Webhook] Updated subscription to past_due status`);
        }
        break;
      }
        
      default:
        console.log(`ℹ️ [Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (e) {
    console.error(`❌ [Webhook] Processing error:`, e);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  console.log(`✅ [Webhook] Webhook processing completed for event: ${event.type}`);
  return NextResponse.json({ received: true });
}