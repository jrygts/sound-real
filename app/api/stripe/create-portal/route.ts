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

    // User who are not logged in can't make a purchase
    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to view billing information." },
        { status: 401 }
      );
    } else if (!body.returnUrl) {
      return NextResponse.json(
        { error: "Return URL is required" },
        { status: 400 }
      );
    }

    console.log(`🏧 [Portal] Creating portal for user ${user.id}`);

    // Use the correct field name: stripe_customer_id
    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id, stripe_subscription_status, has_access, email")
      .eq("id", user?.id)
      .single();

    if (profileError) {
      console.error(`🏧 [Portal] Profile fetch error:`, profileError);
      return NextResponse.json(
        { error: "Failed to fetch billing information." },
        { status: 500 }
      );
    }

    console.log(`🏧 [Portal] Profile data:`, {
      hasCustomerId: !!data?.stripe_customer_id,
      subscriptionStatus: data?.stripe_subscription_status,
      hasAccess: data?.has_access
    });

    // Check if user has a Stripe customer ID
    if (!data?.stripe_customer_id) {
      // More helpful error message based on subscription status
      if (data?.stripe_subscription_status === 'active') {
        console.error(`🏧 [Portal] User has active subscription but no customer ID - webhook may have failed`);
        return NextResponse.json(
          {
            error: "Billing account setup incomplete. Please contact support or try making a new purchase.",
            details: "You have an active subscription but missing customer information."
          },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          {
            error: "You don't have a billing account yet. Make a purchase first.",
          },
          { status: 400 }
        );
      }
    }

    console.log(`🏧 [Portal] Creating Stripe portal for customer: ${data.stripe_customer_id}`);

    try {
      const stripePortalUrl = await createCustomerPortal({
        customerId: data.stripe_customer_id,
        returnUrl: body.returnUrl,
      });

      console.log(`🏧 [Portal] Portal URL created successfully`);

      return NextResponse.json({
        url: stripePortalUrl,
      });
    } catch (stripeError) {
      console.error(`🏧 [Portal] Stripe portal creation failed:`, stripeError);
      return NextResponse.json(
        { 
          error: "Failed to create billing portal session. Please try again.",
          details: stripeError.message
        },
        { status: 500 }
      );
    }

  } catch (e) {
    console.error(`🏧 [Portal] Unexpected error:`, e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
