import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";

// Manual webhook testing endpoint for development
// Use this to test webhook logic when actual Stripe webhooks aren't working
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventType, userId, customerId, subscriptionId, priceId } = body;

    console.log(`🧪 [Test Webhook] Manual webhook test triggered:`, {
      eventType,
      userId,
      customerId,
      subscriptionId,
      priceId
    });

    if (!eventType || !userId) {
      return NextResponse.json(
        { error: "eventType and userId are required" },
        { status: 400 }
      );
    }

    const supabase = new SupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    switch (eventType) {
      case "checkout.session.completed":
      case "subscription.activated": {
        console.log(`🧪 [Test Webhook] Simulating successful subscription activation`);

        // Update with subscription data
        const updateData = {
          stripe_customer_id: customerId || `cus_test_${Date.now()}`,
          price_id: priceId || 'price_1RWIH9R2giDQL8gTtQ0SIOlM',
          has_access: true,
          stripe_subscription_status: 'active',
          stripe_subscription_id: subscriptionId || `sub_test_${Date.now()}`,
          updated_at: new Date().toISOString(),
        };

        console.log(`🧪 [Test Webhook] Updating user ${userId} with:`, updateData);

        // First check if profile exists
        const { data: existingProfile, error: profileCheckError } = await supabase
          .from("profiles")
          .select("id, email")
          .eq("id", userId)
          .single();

        if (profileCheckError || !existingProfile) {
          console.error(`🧪 [Test Webhook] Profile not found for user ${userId}:`, profileCheckError);
          return NextResponse.json(
            { error: `Profile not found for user ${userId}` },
            { status: 404 }
          );
        }

        // Update existing profile
        const { error: updateError } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", userId);

        if (updateError) {
          console.error(`🧪 [Test Webhook] Failed to update profile:`, updateError);
          return NextResponse.json(
            { error: "Failed to update profile", details: updateError },
            { status: 500 }
          );
        }

        console.log(`🧪 [Test Webhook] ✅ Successfully activated subscription for user ${userId}`);
        
        return NextResponse.json({
          success: true,
          message: "Subscription activated successfully",
          data: updateData
        });
      }

      case "subscription.canceled": {
        console.log(`🧪 [Test Webhook] Simulating subscription cancellation`);

        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            has_access: false,
            stripe_subscription_status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (updateError) {
          console.error(`🧪 [Test Webhook] Failed to cancel subscription:`, updateError);
          return NextResponse.json(
            { error: "Failed to cancel subscription", details: updateError },
            { status: 500 }
          );
        }

        console.log(`🧪 [Test Webhook] ✅ Successfully canceled subscription for user ${userId}`);
        
        return NextResponse.json({
          success: true,
          message: "Subscription canceled successfully"
        });
      }

      default:
        return NextResponse.json(
          { error: `Unsupported event type: ${eventType}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error(`🧪 [Test Webhook] Error:`, error);
    return NextResponse.json(
      { error: "Test webhook failed", details: error.message },
      { status: 500 }
    );
  }
} 