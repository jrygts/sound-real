import { createClient } from "@/libs/supabase/server";
import { isUserAdmin } from "@/libs/admin";
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

    // Check if user is admin first - admins get unlimited access
    const isAdmin = isUserAdmin({ email: user.email, id: user.id });
    
    if (isAdmin) {
      return NextResponse.json({
        success: true,
        hasActiveSubscription: true,
        subscriptionStatus: "admin_bypass",
        customerId: null,
        isAdmin: true,
        adminMessage: "🔧 Admin access - unlimited usage"
      });
    }

    // Check subscription status from profiles table for regular users
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
        subscriptionStatus: null,
        isAdmin: false
      });
    }

    const hasActiveSubscription = profile?.stripe_subscription_status === "active";

    return NextResponse.json({
      success: true,
      hasActiveSubscription,
      subscriptionStatus: profile?.stripe_subscription_status || null,
      customerId: profile?.stripe_customer_id || null,
      isAdmin: false
    });

  } catch (error) {
    console.error('Subscription check error:', error);
    return NextResponse.json(
      { error: 'Subscription check failed' },
      { status: 500 }
    );
  }
} 