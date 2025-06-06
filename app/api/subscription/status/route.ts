import { createClient } from "@/libs/supabase/server";
import { isUserAdmin } from "@/libs/admin";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new NextResponse(
        JSON.stringify({ error: 'Not authenticated' }),
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
    }

    // Check if user is admin first - admins get unlimited access
    const isAdmin = isUserAdmin({ email: user.email, id: user.id });
    
    if (isAdmin) {
      return new NextResponse(
        JSON.stringify({
          success: true,
          hasActiveSubscription: true,
          subscriptionStatus: "admin_bypass",
          customerId: null,
          isAdmin: true,
          adminMessage: "🔧 Admin access - unlimited usage"
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Timestamp': new Date().toISOString()
          }
        }
      );
    }

    // Check subscription status from profiles table for regular users
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_subscription_status, stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return new NextResponse(
        JSON.stringify({
          success: true,
          hasActiveSubscription: false,
          subscriptionStatus: null,
          isAdmin: false
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Timestamp': new Date().toISOString()
          }
        }
      );
    }

    const hasActiveSubscription = profile?.stripe_subscription_status === "active";

    return new NextResponse(
      JSON.stringify({
        success: true,
        hasActiveSubscription,
        subscriptionStatus: profile?.stripe_subscription_status || null,
        customerId: profile?.stripe_customer_id || null,
        isAdmin: false
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Timestamp': new Date().toISOString()
        }
      }
    );

  } catch (error) {
    console.error('Subscription check error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Subscription check failed' }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }
} 