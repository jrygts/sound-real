import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { createCustomerPortal } from "@/libs/stripe";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const body = await req.json();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // User must be logged in
    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to access billing portal." },
        { status: 401 }
      );
    }

    // Validate required fields
    if (!body.customerId) {
      return NextResponse.json(
        { error: "customerId is required" },
        { status: 400 }
      );
    }

    // Default return URL to current page if not provided
    const returnUrl = body.return_url || body.returnUrl || `${req.headers.get('origin')}/dashboard/settings`;

    console.log(`🏧 [Portal] Creating portal for user ${user.id} with customer ${body.customerId}`);

    // Verify the customer ID belongs to the authenticated user
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id, stripe_subscription_status, has_access, email")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error(`🏧 [Portal] Profile fetch error:`, profileError);
      return NextResponse.json(
        { error: "Failed to fetch user profile." },
        { status: 500 }
      );
    }

    // Security check: Ensure the provided customer ID matches the user's profile
    if (profile.stripe_customer_id !== body.customerId) {
      console.error(`🏧 [Portal] Customer ID mismatch. User: ${user.id}, Profile: ${profile.stripe_customer_id}, Provided: ${body.customerId}`);
      return NextResponse.json(
        { error: "Invalid customer ID." },
        { status: 403 }
      );
    }

    console.log(`🏧 [Portal] Creating Stripe portal for customer: ${body.customerId}`);

    try {
      const stripePortalUrl = await createCustomerPortal({
        customerId: body.customerId,
        returnUrl: returnUrl,
      });

      console.log(`🏧 [Portal] Portal URL created successfully`);

      return NextResponse.json({
        url: stripePortalUrl,
      });
    } catch (stripeError: any) {
      console.error(`🏧 [Portal] Stripe portal creation failed:`, stripeError);
      return NextResponse.json(
        { 
          error: "Failed to create billing portal session. Please try again.",
          details: stripeError.message
        },
        { status: 500 }
      );
    }

  } catch (e: any) {
    console.error(`🏧 [Portal] Unexpected error:`, e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
} 