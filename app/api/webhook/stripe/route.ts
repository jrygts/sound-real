import configFile from "@/config";
import { findCheckoutSession } from "@/libs/stripe";
import { SupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
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
    transformations_limit: 200, // Keep for backward compatibility
    price: 6.99,
    name: 'Basic Plan'
  },
  'price_1RWIH9R2giDQL8gTtQ0SIOlM': {
    plan_type: 'Plus',
    words_limit: 15000,
    transformations_limit: 600, // Keep for backward compatibility
    price: 19.99,
    name: 'Plus Plan'
  },
  'price_1RWIHvR2giDQL8gTI17qjZmD': {
    plan_type: 'Ultra',
    words_limit: 35000,
    transformations_limit: 1200, // Keep for backward compatibility
    price: 39.99,
    name: 'Ultra Plan'
  }
};

// Function to determine plan details based on subscription status and price ID
function getPlanDetailsFromSubscription(subscriptionStatus: string, priceId?: string): {
  planType: string;
  wordsLimit: number;
  transformationsLimit: number;
} {
  console.log(`🔗 [Webhook] Determining plan details for status: ${subscriptionStatus}, priceId: ${priceId}`);
  
  // If subscription is not active, user is on Free plan
  if (!subscriptionStatus || subscriptionStatus !== 'active') {
    console.log(`🔗 [Webhook] ➡️ Setting to Free plan (inactive subscription)`);
    return {
      planType: 'Free',
      wordsLimit: 0, // Free users get 0 words per month
      transformationsLimit: 5 // Keep 5 transformations per day for Free users
    };
  }
  
  // For active subscriptions, determine plan based on price ID
  if (priceId && PLAN_CONFIGS[priceId]) {
    const config = PLAN_CONFIGS[priceId];
    console.log(`🔗 [Webhook] ➡️ Setting to ${config.plan_type} plan (${config.words_limit} words/month)`);
    return {
      planType: config.plan_type,
      wordsLimit: config.words_limit,
      transformationsLimit: config.transformations_limit
    };
  }
  
  // Default for active subscription with unknown price ID - treat as Basic
  console.log(`🔗 [Webhook] ⚠️ Unknown price ID ${priceId}, defaulting to Basic plan`);
  return {
    planType: 'Basic',
    wordsLimit: 5000,
    transformationsLimit: 200
  };
}

// Function to update user plan in database
async function updateUserPlan(
  supabase: SupabaseClient,
  customerId: string,
  subscriptionStatus: string,
  subscriptionId?: string,
  priceId?: string,
  eventType?: string,
  billingReason?: string
): Promise<{ success: boolean; error?: string }> {
  console.log(`🔗 [Webhook] 🔄 Updating user plan for customer: ${customerId}`);
  
  const { planType, wordsLimit, transformationsLimit } = getPlanDetailsFromSubscription(subscriptionStatus, priceId);
  
  // 🚨 CRITICAL FIX: Only reset usage in specific cases
  const isNewSubscription = eventType === 'customer.subscription.created' || eventType === 'checkout.session.completed';
  const isBillingPeriodReset = eventType === 'invoice.payment_succeeded' && billingReason === 'subscription_cycle';
  const isSubscriptionCancellation = eventType === 'customer.subscription.deleted';
  
  // Determine billing period dates
  const now = new Date();
  const billingPeriodStart = subscriptionStatus === 'active' ? now : null;
  let billingPeriodEnd = null;
  
  if (subscriptionStatus === 'active' && subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      billingPeriodEnd = new Date(subscription.current_period_end * 1000);
    } catch (error) {
      console.error(`🔗 [Webhook] ⚠️ Could not fetch subscription period:`, error);
      // Fallback to next month
      billingPeriodEnd = new Date(now);
      billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1);
    }
  }
  
  const updateData: any = {
    stripe_subscription_status: subscriptionStatus,
    stripe_subscription_id: subscriptionId || null,
    plan_type: planType,
    words_limit: wordsLimit,
    transformations_limit: transformationsLimit,
    has_access: subscriptionStatus === 'active',
    updated_at: new Date().toISOString(),
  };

  if (priceId) {
    updateData.price_id = priceId;
  }

  // 🚨 CRITICAL: Add billing period tracking
  if (billingPeriodStart) {
    updateData.billing_period_start = billingPeriodStart.toISOString();
  }
  
  if (billingPeriodEnd) {
    updateData.billing_period_end = billingPeriodEnd.toISOString();
  }

  // 🚨 CRITICAL FIX: Only reset usage in these specific cases
  if (isNewSubscription) {
    updateData.words_used = 0;
    updateData.transformations_used = 0;
    updateData.last_reset_date = new Date().toISOString();
    console.log(`📅 [BillingCycle] Resetting word usage for new subscription`);
  } else if (isBillingPeriodReset) {
    updateData.words_used = 0;
    updateData.transformations_used = 0;
    updateData.last_reset_date = new Date().toISOString();
    console.log(`📅 [BillingCycle] Resetting word usage for new billing period`);
  } else if (isSubscriptionCancellation) {
    // On cancellation, user goes to Free plan but keeps current usage until daily reset
    console.log(`🔄 [Cancellation] User cancelled - moving to Free plan, preserving usage until daily reset`);
  } else {
    console.log(`🔄 [PlanChange] Preserving current word usage during plan change`);
  }

  console.log(`🔗 [Webhook] 📝 Update data:`, {
    customerId,
    planType,
    wordsLimit,
    transformationsLimit,
    subscriptionStatus,
    hasAccess: updateData.has_access,
    resetUsage: !!(updateData.words_used === 0),
    eventType,
    billingReason
  });

  try {
    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("stripe_customer_id", customerId)
      .select()
      .single();

    if (updateError) {
      console.error(`🔗 [Webhook] ❌ Failed to update user plan:`, updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`🔗 [Webhook] ✅ Successfully updated user plan:`, {
      userId: updatedProfile?.id,
      planType: updatedProfile?.plan_type,
      wordsLimit: updatedProfile?.words_limit,
      wordsUsed: updatedProfile?.words_used,
      transformationsLimit: updatedProfile?.transformations_limit,
      status: updatedProfile?.stripe_subscription_status
    });

    return { success: true };
  } catch (error) {
    console.error(`🔗 [Webhook] ❌ Update error:`, error);
    return { success: false, error: error.message };
  }
}

// Function to handle billing cycle reset
async function handleBillingCycleReset(
  supabase: SupabaseClient,
  event: Stripe.Event
): Promise<{ success: boolean; error?: string }> {
  const stripeObject: Stripe.Invoice = event.data.object as Stripe.Invoice;
  const customerId = stripeObject.customer as string;
  const subscriptionId = stripeObject.subscription as string;
  
  console.log(`📅 [BillingCycle] Processing billing cycle reset for customer: ${customerId}`);
  
  try {
    // Reset usage for billing cycle
    const { error: resetError } = await supabase
      .from("profiles")
      .update({
        words_used: 0,
        transformations_used: 0,
        last_reset_date: new Date().toISOString(),
        billing_period_start: new Date().toISOString(),
      })
      .eq("stripe_customer_id", customerId);

    if (resetError) {
      console.error(`📅 [BillingCycle] ❌ Failed to reset usage:`, resetError);
      return { success: false, error: resetError.message };
    }

    console.log(`📅 [BillingCycle] ✅ Successfully reset usage for new billing period`);
    return { success: true };
  } catch (error) {
    console.error(`📅 [BillingCycle] ❌ Error:`, error);
    return { success: false, error: error.message };
  }
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

  let eventType;
  let event;

  // Create a private supabase client using the secret service_role API key
  const supabase = new SupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

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

  eventType = event.type;
  console.log(`🔗 [Webhook] 📨 Processing event: ${eventType} (ID: ${event.id})`);

  try {
    switch (eventType) {
      case "checkout.session.completed": {
        console.log(`🔗 [Webhook] 💳 Processing checkout.session.completed`);
        
        const stripeObject: Stripe.Checkout.Session = event.data
          .object as Stripe.Checkout.Session;

        const session = await findCheckoutSession(stripeObject.id);
        const customerId = session?.customer;
        const priceId = session?.line_items?.data[0]?.price.id;
        const userId = stripeObject.client_reference_id;
        const planConfig = priceId ? PLAN_CONFIGS[priceId] : null;

        console.log(`🔗 [Webhook] Extracted session details:`, {
          customerId,
          priceId,
          userId,
          planFound: !!planConfig,
          planName: planConfig?.name
        });

        if (!customerId) {
          console.error(`🔗 [Webhook] ❌ No customer ID found in session`);
          return NextResponse.json({ error: "No customer ID" }, { status: 400 });
        }

        const customer = (await stripe.customers.retrieve(customerId as string)) as Stripe.Customer;

        // Find user by client_reference_id OR email
        let targetUserId = userId;
        if (!targetUserId && customer.email) {
          const { data: authUsers } = await supabase.auth.admin.listUsers();
          const foundUser = authUsers?.users?.find((u: any) => u.email === customer.email);
          if (foundUser) {
            targetUserId = foundUser.id;
          }
        }

        if (!targetUserId) {
          console.error(`🔗 [Webhook] ❌ Cannot determine user ID for this subscription`);
          return NextResponse.json({ error: "Cannot determine user ID" }, { status: 400 });
        }

        // Get subscription details
        let subscriptionId = null;
        let subscriptionStatus = 'active';
        if (session?.mode === 'subscription' && session?.subscription) {
          subscriptionId = session.subscription as string;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          subscriptionStatus = subscription.status;
        }

        // Update user plan (this is a new subscription)
        const result = await updateUserPlan(
          supabase, 
          customerId as string, 
          subscriptionStatus, 
          subscriptionId, 
          priceId, 
          eventType
        );
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 500 });
        }

        break;
      }

      case "customer.subscription.created": {
        const stripeObject: Stripe.Subscription = event.data.object as Stripe.Subscription;
        const priceId = stripeObject.items.data[0]?.price.id;
        
        const result = await updateUserPlan(
          supabase,
          stripeObject.customer as string,
          stripeObject.status,
          stripeObject.id,
          priceId,
          eventType
        );

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 500 });
        }
        break;
      }

      case "customer.subscription.updated": {
        const stripeObject: Stripe.Subscription = event.data.object as Stripe.Subscription;
        const priceId = stripeObject.items.data[0]?.price.id;
        
        const result = await updateUserPlan(
          supabase,
          stripeObject.customer as string,
          stripeObject.status,
          stripeObject.id,
          priceId,
          eventType
        );

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 500 });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const stripeObject: Stripe.Subscription = event.data.object as Stripe.Subscription;

        const result = await updateUserPlan(
          supabase,
          stripeObject.customer as string,
          'canceled',
          undefined,
          undefined,
          eventType
        );

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 500 });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const stripeObject: Stripe.Invoice = event.data.object as Stripe.Invoice;
        const priceId = stripeObject.lines.data[0].price.id;
        const customerId = stripeObject.customer;
        const billingReason = stripeObject.billing_reason;

        console.log(`🔗 [Webhook] 💰 Invoice payment succeeded - billing reason: ${billingReason}`);

        // Check if this is a billing cycle reset
        if (billingReason === 'subscription_cycle') {
          console.log(`📅 [BillingCycle] Detected subscription cycle - resetting usage`);
          const resetResult = await handleBillingCycleReset(supabase, event);
          
          if (!resetResult.success) {
            return NextResponse.json({ error: resetResult.error }, { status: 500 });
          }
        } else {
          // For other billing reasons (like upgrades), just update plan without resetting usage
          const result = await updateUserPlan(
            supabase,
            customerId as string,
            'active',
            stripeObject.subscription as string,
            priceId,
            eventType,
            billingReason
          );

          if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
          }
        }

        // Find profile to verify price match
        const { data: profile } = await supabase
          .from("profiles")
          .select("price_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile?.price_id !== priceId) {
          console.log(`🔗 [Webhook] ⚠️ Price mismatch - invoice ${priceId} vs profile ${profile?.price_id}`);
        }

        break;
      }

      case "invoice.payment_failed": {
        const stripeObject: Stripe.Invoice = event.data.object as Stripe.Invoice;
        
        const result = await updateUserPlan(
          supabase,
          stripeObject.customer as string,
          'past_due',
          stripeObject.subscription as string,
          undefined,
          eventType
        );

        if (result.success) {
          console.log(`🔗 [Webhook] ✅ Updated subscription to past_due status`);
        }
        break;
      }

      default:
        console.log(`🔗 [Webhook] ℹ️ Unhandled event type: ${eventType}`);
    }
  } catch (e) {
    console.error(`🔗 [Webhook] ❌ Processing error:`, e.message);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  console.log(`🔗 [Webhook] ✅ Webhook processing completed for event: ${eventType}`);
  return NextResponse.json({ received: true });
}