import { createClient } from "@/libs/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check subscription status from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_subscription_status, stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({
        success: true,
        hasActiveSubscription: false,
        subscriptionStatus: null
      });
    }

    const hasActiveSubscription = profile?.stripe_subscription_status === "active";

    return NextResponse.json({
      success: true,
      hasActiveSubscription,
      subscriptionStatus: profile?.stripe_subscription_status || null,
      customerId: profile?.stripe_customer_id || null
    });

  } catch (error) {
    console.error('Subscription check error:', error);
    return NextResponse.json(
      { error: 'Subscription check failed' },
      { status: 500 }
    );
  }
} 