import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/libs/supabase/server";
import { isUserAdmin } from "@/libs/admin";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log(`🔬 [Debug] Checking subscription status for user: ${user.id}`);
    
    // Get user profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('❌ [Debug] Profile fetch error:', profileError);
      return NextResponse.json({ 
        error: 'Profile fetch failed', 
        details: profileError 
      }, { status: 500 });
    }

    // Check if user is admin
    const isAdmin = isUserAdmin({ email: user.email, id: user.id });
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        isAdmin
      },
      profile: profile,
      analysis: {
        hasProfile: !!profile,
        hasStripeCustomerId: !!profile?.stripe_customer_id,
        hasSubscriptionId: !!profile?.stripe_subscription_id,
        subscriptionStatus: profile?.stripe_subscription_status,
        planType: profile?.plan_type,
        hasAccess: profile?.has_access,
        wordsUsed: profile?.words_used || 0,
        wordsLimit: profile?.words_limit || 0,
        billingPeriodStart: profile?.billing_period_start,
        billingPeriodEnd: profile?.billing_period_end,
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [Debug] User subscription check error:', error);
    return NextResponse.json({ 
      error: 'Debug check failed',
      details: error.message 
    }, { status: 500 });
  }
} 