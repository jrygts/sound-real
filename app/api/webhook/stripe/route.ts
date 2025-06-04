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

// Enhanced webhook handler with comprehensive debugging
export async function POST(req: NextRequest) {
  console.log(`🔗 [Webhook] Received webhook request`);
  
  const body = await req.text();
  const signature = headers().get("stripe-signature");

  // Log webhook environment setup
  console.log(`🔗 [Webhook] Environment check:`, {
    hasWebhookSecret: !!webhookSecret,
    hasSignature: !!signature,
    bodyLength: body.length
  });

  let eventType;
  let event;

  // Create a private supabase client using the secret service_role API key
  const supabase = new SupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

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

        console.log(`🔗 [Webhook] Checkout session:`, {
          id: stripeObject.id,
          mode: stripeObject.mode,
          paymentStatus: stripeObject.payment_status,
          customer: stripeObject.customer,
          clientReferenceId: stripeObject.client_reference_id
        });

        const session = await findCheckoutSession(stripeObject.id);

        const customerId = session?.customer;
        const priceId = session?.line_items?.data[0]?.price.id;
        const userId = stripeObject.client_reference_id;
        const plan = configFile.stripe.plans.find((p) => p.priceId === priceId);

        console.log(`🔗 [Webhook] Session details:`, {
          customerId,
          priceId,
          userId,
          planFound: !!plan,
          planName: plan?.name
        });

        if (!customerId) {
          console.error(`🔗 [Webhook] ❌ No customer ID found in session`);
          break;
        }

        if (!userId) {
          console.error(`🔗 [Webhook] ❌ No client_reference_id (user ID) found in session`);
          break;
        }

        if (!plan) {
          console.error(`🔗 [Webhook] ❌ No plan found for priceId: ${priceId}`);
          break;
        }

        const customer = (await stripe.customers.retrieve(
          customerId as string
        )) as Stripe.Customer;

        console.log(`🔗 [Webhook] Customer details:`, {
          id: customer.id,
          email: customer.email
        });

        // Get subscription ID if this is a subscription
        let subscriptionId = null;
        let subscriptionStatus = 'active';
        
        if (session?.mode === 'subscription' && session?.subscription) {
          subscriptionId = session.subscription as string;
          
          // Get full subscription details
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            subscriptionStatus = subscription.status;
            console.log(`🔗 [Webhook] Subscription details:`, {
              id: subscriptionId,
              status: subscriptionStatus,
              customerId
            });
          } catch (subError) {
            console.error(`🔗 [Webhook] ❌ Error fetching subscription:`, subError);
          }
        }

        // Update with consistent field naming
        const updateData = {
          stripe_customer_id: customerId,
          price_id: priceId,
          has_access: true,
          stripe_subscription_status: subscriptionStatus,
          stripe_subscription_id: subscriptionId,
          updated_at: new Date().toISOString(),
        };

        console.log(`🔗 [Webhook] 📝 Updating user ${userId} with:`, updateData);

        // First, check if profile exists
        const { data: existingProfile, error: profileCheckError } = await supabase
          .from("profiles")
          .select("id, email")
          .eq("id", userId)
          .single();

        if (profileCheckError || !existingProfile) {
          console.error(`🔗 [Webhook] ❌ Profile not found for user ${userId}:`, profileCheckError);
          
          // Try to create profile
          const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .insert({
              id: userId,
              email: customer.email,
              ...updateData,
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (createError) {
            console.error(`🔗 [Webhook] ❌ Failed to create profile:`, createError);
            break;
          } else {
            console.log(`🔗 [Webhook] ✅ Created new profile for user ${userId}`);
          }
        } else {
          // Update existing profile
          const { error: updateError } = await supabase
            .from("profiles")
            .update(updateData)
            .eq("id", userId);

          if (updateError) {
            console.error(`🔗 [Webhook] ❌ Failed to update profile:`, updateError);
          } else {
            console.log(`🔗 [Webhook] ✅ Successfully activated subscription for user ${userId}`);
          }
        }

        break;
      }

      case "checkout.session.expired": {
        console.log(`🔗 [Webhook] ⏰ Checkout session expired`);
        break;
      }

      case "customer.subscription.created": {
        const stripeObject: Stripe.Subscription = event.data.object as Stripe.Subscription;
        
        console.log(`🔗 [Webhook] 🆕 Subscription created:`, {
          id: stripeObject.id,
          customer: stripeObject.customer,
          status: stripeObject.status
        });

        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            stripe_subscription_id: stripeObject.id,
            stripe_subscription_status: stripeObject.status,
            has_access: stripeObject.status === 'active',
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", stripeObject.customer);

        if (updateError) {
          console.error(`🔗 [Webhook] ❌ Failed to update subscription created:`, updateError);
        } else {
          console.log(`🔗 [Webhook] ✅ Subscription created and synced`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const stripeObject: Stripe.Subscription = event.data.object as Stripe.Subscription;
        
        console.log(`🔗 [Webhook] 🔄 Subscription updated:`, {
          id: stripeObject.id,
          customer: stripeObject.customer,
          status: stripeObject.status
        });

        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            stripe_subscription_status: stripeObject.status,
            has_access: stripeObject.status === 'active',
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", stripeObject.customer);

        if (updateError) {
          console.error(`🔗 [Webhook] ❌ Failed to update subscription:`, updateError);
        } else {
          console.log(`🔗 [Webhook] ✅ Subscription status updated to ${stripeObject.status}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const stripeObject: Stripe.Subscription = event.data
          .object as Stripe.Subscription;

        console.log(`🔗 [Webhook] 🗑️ Subscription deleted:`, {
          id: stripeObject.id,
          customer: stripeObject.customer
        });

        const { error: updateError } = await supabase
          .from("profiles")
          .update({ 
            has_access: false,
            stripe_subscription_status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", stripeObject.customer);

        if (updateError) {
          console.error(`🔗 [Webhook] ❌ Failed to revoke access:`, updateError);
        } else {
          console.log(`🔗 [Webhook] ✅ Access revoked for canceled subscription`);
        }
        break;
      }

      case "invoice.paid": {
        const stripeObject: Stripe.Invoice = event.data
          .object as Stripe.Invoice;
        const priceId = stripeObject.lines.data[0].price.id;
        const customerId = stripeObject.customer;

        console.log(`🔗 [Webhook] 💰 Invoice paid:`, {
          customer: customerId,
          priceId,
          subscriptionId: stripeObject.subscription
        });

        // Find profile where stripe_customer_id equals the customerId
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("stripe_customer_id", customerId)
          .single();

        // Make sure the invoice is for the same plan (priceId) the user subscribed to
        if (profile?.price_id !== priceId) {
          console.log(`🔗 [Webhook] ⚠️ Price mismatch - invoice ${priceId} vs profile ${profile?.price_id}`);
          break;
        }

        // Grant the profile access to your product
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ 
            has_access: true,
            stripe_subscription_status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);

        if (updateError) {
          console.error(`🔗 [Webhook] ❌ Failed to grant access for invoice:`, updateError);
        } else {
          console.log(`🔗 [Webhook] ✅ Access granted for invoice payment`);
        }

        break;
      }

      case "invoice.payment_failed": {
        const stripeObject: Stripe.Invoice = event.data.object as Stripe.Invoice;
        
        console.log(`🔗 [Webhook] ❌ Invoice payment failed:`, {
          customer: stripeObject.customer,
          subscriptionId: stripeObject.subscription
        });

        // Don't immediately revoke access - let Stripe handle retries
        // Access will be revoked when subscription is finally canceled
        break;
      }

      default:
        console.log(`🔗 [Webhook] ℹ️ Unhandled event type: ${eventType}`);
    }
  } catch (e) {
    console.error(`🔗 [Webhook] ❌ Processing error:`, e.message);
    console.error(`🔗 [Webhook] ❌ Full error:`, e);
  }

  console.log(`🔗 [Webhook] ✅ Webhook processing completed for event: ${eventType}`);
  return NextResponse.json({ received: true });
}
