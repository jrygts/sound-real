import { createCheckout } from "@/libs/stripe";
import { createClient } from "@/libs/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// This function is used to create a Stripe Checkout Session (one-time payment or subscription)
// It's called by the <ButtonCheckout /> component
// Users must be authenticated. It will prefill the Checkout data with their email and/or credit card (if any)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[Stripe Checkout] Incoming request body:", body);

    // Log environment variable status (do not log secrets)
    console.log("[Stripe Checkout] ENV STATUS:", {
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? "[SET]" : "[MISSING]",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? "[SET]" : "[MISSING]",
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? "[SET]" : "[MISSING]",
    });

    if (!body.priceId) {
      console.error("[Stripe Checkout] Missing priceId");
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 }
      );
    } else if (!body.successUrl || !body.cancelUrl) {
      console.error("[Stripe Checkout] Missing successUrl or cancelUrl");
      return NextResponse.json(
        { error: "Success and cancel URLs are required" },
        { status: 400 }
      );
    } else if (!body.mode) {
      console.error("[Stripe Checkout] Missing mode");
      return NextResponse.json(
        {
          error:
            "Mode is required (either 'payment' for one-time payments or 'subscription' for recurring subscription)",
        },
        { status: 400 }
      );
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("[Stripe Checkout] User not authenticated", userError);
        return NextResponse.json(
          { error: "User not authenticated" },
          { status: 401 }
        );
      }

      const { priceId, mode, successUrl, cancelUrl } = body;
      let profile = null;
      let profileError = null;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user?.id)
          .single();
        profile = data;
        profileError = error;
      } catch (e) {
        profileError = e;
      }

      if (!profile) {
        // Create profile on the fly
        console.warn("[Stripe Checkout] No profile found, creating new profile for user.");
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            email: user.email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();
        profile = newProfile;
        profileError = insertError;
        if (insertError) {
          console.error("[Stripe Checkout] Failed to create profile:", insertError);
          return NextResponse.json(
            { error: "Failed to create user profile" },
            { status: 500 }
          );
        }
        console.log("[Stripe Checkout] Profile created successfully:", profile);
      }

      console.log("[Stripe Checkout] Creating Stripe session with:", {
        priceId,
        mode,
        successUrl,
        cancelUrl,
        user: { id: user.id, email: profile?.email, customerId: profile?.customer_id },
      });

      const stripeSessionURL = await createCheckout({
        priceId,
        mode,
        successUrl,
        cancelUrl,
        clientReferenceId: user?.id,
        user: {
          email: profile?.email,
          customerId: profile?.customer_id,
        },
      });

      if (!stripeSessionURL) {
        console.error("[Stripe Checkout] Stripe session creation failed. Check Stripe logs and priceId.");
        return NextResponse.json(
          { error: "Stripe session creation failed. Check your Stripe logs and priceId." },
          { status: 500 }
        );
      }

      console.log("[Stripe Checkout] Stripe session created successfully:", stripeSessionURL);
      return NextResponse.json({ url: stripeSessionURL });
    } catch (stripeError) {
      console.error("[Stripe Checkout] Stripe API error:", stripeError);
      return NextResponse.json(
        { error: stripeError?.message || "Stripe API error" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[Stripe Checkout] Fatal error:", error);
    return NextResponse.json(
      { error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
