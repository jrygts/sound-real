import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { createCustomerPortal } from "@/libs/stripe";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Get user profile with Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("customer_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.customer_id) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    // Create customer portal session - use production URL for deployed environments
    const getReturnUrl = () => {
      const envUrl = process.env.NEXT_PUBLIC_SITE_URL
      // If we have localhost in env but we're in production/preview, use sound-real.com
      if (envUrl?.includes('localhost') && process.env.VERCEL_ENV) {
        return process.env.VERCEL_ENV === 'production' 
          ? 'https://sound-real.com' 
          : `https://${process.env.VERCEL_URL}`
      }
      return envUrl || (process.env.NODE_ENV === "production" ? "https://sound-real.com" : "http://localhost:3000")
    }
    const returnUrl = `${getReturnUrl()}/dashboard/billing`;
    const portalUrl = await createCustomerPortal({
      customerId: profile.customer_id,
      returnUrl,
    });

    return NextResponse.json({ url: portalUrl });
  } catch (error) {
    console.error("Customer portal error:", error);
    return NextResponse.json(
      { error: "Failed to create customer portal session" },
      { status: 500 }
    );
  }
} 