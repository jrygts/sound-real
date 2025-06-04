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

        console.log(`🔗 [Webhook] Raw checkout session:`, {
          id: stripeObject.id,
          mode: stripeObject.mode,
          paymentStatus: stripeObject.payment_status,
          customer: stripeObject.customer,
          customerEmail: stripeObject.customer_details?.email,
          clientReferenceId: stripeObject.client_reference_id
        });

        const session = await findCheckoutSession(stripeObject.id);

        const customerId = session?.customer;
        const customerEmail = stripeObject.customer_details?.email;
        const priceId = session?.line_items?.data[0]?.price.id;
        const userId = stripeObject.client_reference_id;
        const plan = configFile.stripe.plans.find((p) => p.priceId === priceId);

        console.log(`🔗 [Webhook] Extracted session details:`, {
          customerId,
          customerEmail,
          priceId,
          userId,
          planFound: !!plan,
          planName: plan?.name
        });

        if (!customerId) {
          console.error(`🔗 [Webhook] ❌ No customer ID found in session`);
          return NextResponse.json({ error: "No customer ID" }, { status: 400 });
        }

        if (!plan) {
          console.error(`🔗 [Webhook] ❌ No plan found for priceId: ${priceId}`);
          return NextResponse.json({ error: "No plan found" }, { status: 400 });
        }

        const customer = (await stripe.customers.retrieve(
          customerId as string
        )) as Stripe.Customer;

        console.log(`🔗 [Webhook] Stripe customer details:`, {
          id: customer.id,
          email: customer.email
        });

        // CRITICAL: Find the user by client_reference_id OR email
        let targetUserId = userId;
        
        if (!targetUserId && customer.email) {
          console.log(`🔗 [Webhook] 🔍 No client_reference_id, looking up user by email: ${customer.email}`);
          
          try {
            // Look up user by email in auth.users table
            const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
            
            if (authError) {
              console.error(`🔗 [Webhook] ❌ Failed to list users:`, authError);
            } else if (authUsers && authUsers.users) {
              const foundUser = authUsers.users.find((u: any) => u.email === customer.email);
              if (foundUser) {
                targetUserId = foundUser.id;
                console.log(`🔗 [Webhook] ✅ Found user by email: ${targetUserId}`);
              } else {
                console.error(`🔗 [Webhook] ❌ No user found with email: ${customer.email}`);
              }
            }
          } catch (userLookupError) {
            console.error(`🔗 [Webhook] ❌ User lookup failed:`, userLookupError);
          }
        }

        if (!targetUserId) {
          console.error(`🔗 [Webhook] ❌ Cannot determine user ID for this subscription`);
          return NextResponse.json({ error: "Cannot determine user ID" }, { status: 400 });
        }

        console.log(`🔗 [Webhook] 🎯 Target user ID: ${targetUserId}`);

        // Get subscription ID if this is a subscription
        let subscriptionId = null;
        let subscriptionStatus = 'active';
        
        if (session?.mode === 'subscription' && session?.subscription) {
          subscriptionId = session.subscription as string;
          
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

        // STEP 1: Check if profile exists
        console.log(`🔗 [Webhook] 🔍 Checking if profile exists for user: ${targetUserId}`);
        
        const { data: existingProfile, error: profileCheckError } = await supabase
          .from("profiles")
          .select("id, email, stripe_customer_id, stripe_subscription_status")
          .eq("id", targetUserId)
          .single();

        console.log(`🔗 [Webhook] Profile check result:`, {
          found: !!existingProfile,
          error: profileCheckError?.message,
          currentData: existingProfile
        });

        if (profileCheckError && profileCheckError.code !== 'PGRST116') {
          console.error(`🔗 [Webhook] ❌ Profile check failed:`, profileCheckError);
          return NextResponse.json({ error: "Profile check failed" }, { status: 500 });
        }

        // STEP 2: Prepare update data
        const updateData = {
          stripe_customer_id: customerId,
          price_id: priceId,
          has_access: true,
          stripe_subscription_status: subscriptionStatus,
          stripe_subscription_id: subscriptionId,
          updated_at: new Date().toISOString(),
        };

        console.log(`🔗 [Webhook] 📝 Preparing to update user ${targetUserId} with:`, updateData);

        // STEP 3: Update or create profile
        if (!existingProfile) {
          console.log(`🔗 [Webhook] 🆕 Creating new profile for user ${targetUserId}`);
          
          const insertData = {
            id: targetUserId,
            email: customer.email,
            ...updateData,
            created_at: new Date().toISOString(),
          };

          console.log(`🔗 [Webhook] Insert data:`, insertData);

          const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .insert(insertData)
            .select()
            .single();

          console.log(`🔗 [Webhook] Insert result:`, {
            success: !!newProfile,
            error: createError?.message,
            data: newProfile
          });

          if (createError) {
            console.error(`🔗 [Webhook] ❌ Failed to create profile:`, createError);
            console.error(`🔗 [Webhook] ❌ Full create error:`, JSON.stringify(createError, null, 2));
            return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
          } else {
            console.log(`🔗 [Webhook] ✅ Successfully created profile for user ${targetUserId}`);
          }
        } else {
          console.log(`🔗 [Webhook] 🔄 Updating existing profile for user ${targetUserId}`);
          console.log(`🔗 [Webhook] Current profile data:`, existingProfile);
          console.log(`🔗 [Webhook] Update data:`, updateData);

          const { data: updatedProfile, error: updateError } = await supabase
            .from("profiles")
            .update(updateData)
            .eq("id", targetUserId)
            .select()
            .single();

          console.log(`🔗 [Webhook] Update result:`, {
            success: !!updatedProfile,
            error: updateError?.message,
            data: updatedProfile
          });

          if (updateError) {
            console.error(`🔗 [Webhook] ❌ Failed to update profile:`, updateError);
            console.error(`🔗 [Webhook] ❌ Full update error:`, JSON.stringify(updateError, null, 2));
            return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
          } else {
            console.log(`🔗 [Webhook] ✅ Successfully updated profile for user ${targetUserId}`);
          }
        }

        // STEP 4: Verify the update worked
        console.log(`🔗 [Webhook] 🔍 Verifying database update...`);
        
        const { data: verificationData, error: verificationError } = await supabase
          .from("profiles")
          .select("id, stripe_customer_id, stripe_subscription_status, has_access, updated_at")
          .eq("id", targetUserId)
          .single();

        console.log(`🔗 [Webhook] Verification result:`, {
          success: !!verificationData,
          error: verificationError?.message,
          finalData: verificationData
        });

        if (verificationData) {
          console.log(`🔗 [Webhook] 🎉 DATABASE UPDATE CONFIRMED!`, {
            userId: targetUserId,
            customerId: verificationData.stripe_customer_id,
            status: verificationData.stripe_subscription_status,
            hasAccess: verificationData.has_access
          });
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

        const { data: updatedProfile, error: updateError } = await supabase
          .from("profiles")
          .update({
            stripe_subscription_id: stripeObject.id,
            stripe_subscription_status: stripeObject.status,
            has_access: stripeObject.status === 'active',
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", stripeObject.customer)
          .select()
          .single();

        console.log(`🔗 [Webhook] Subscription create update result:`, {
          success: !!updatedProfile,
          error: updateError?.message,
          data: updatedProfile
        });

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

        const { data: updatedProfile, error: updateError } = await supabase
          .from("profiles")
          .update({
            stripe_subscription_status: stripeObject.status,
            has_access: stripeObject.status === 'active',
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", stripeObject.customer)
          .select()
          .single();

        console.log(`🔗 [Webhook] Subscription update result:`, {
          success: !!updatedProfile,
          error: updateError?.message,
          data: updatedProfile
        });

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

        const { data: updatedProfile, error: updateError } = await supabase
          .from("profiles")
          .update({ 
            has_access: false,
            stripe_subscription_status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", stripeObject.customer)
          .select()
          .single();

        console.log(`🔗 [Webhook] Subscription delete result:`, {
          success: !!updatedProfile,
          error: updateError?.message,
          data: updatedProfile
        });

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
        const { data: updatedProfile, error: updateError } = await supabase
          .from("profiles")
          .update({ 
            has_access: true,
            stripe_subscription_status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId)
          .select()
          .single();

        console.log(`🔗 [Webhook] Invoice payment update result:`, {
          success: !!updatedProfile,
          error: updateError?.message,
          data: updatedProfile
        });

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
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  console.log(`🔗 [Webhook] ✅ Webhook processing completed for event: ${eventType}`);
  return NextResponse.json({ received: true });
}
