import { createClient } from "@/libs/supabase/server";
import { isUserAdmin } from "@/libs/admin";
import { NextResponse } from "next/server";
import config from "@/config";

interface UsageData {
  totalUsed: number;
  limit: number;
  remaining: number;
  plan: string;
  hasAccess: boolean;
  isAdmin: boolean;
  resetDate?: string;
}

// Get plan limits based on price ID
function getPlanLimits(priceId: string | null): { limit: number; name: string } {
  if (!priceId) {
    return { limit: 5, name: "Free" }; // Free plan: 5 transformations per day
  }

  const plan = config.stripe.plans.find(p => p.priceId === priceId);
  
  if (!plan) {
    return { limit: 5, name: "Free" };
  }

  // Extract word limits and convert to transformation limits
  // Assuming ~500 words per transformation
  const planName = plan.name;
  switch (planName) {
    case "Basic":
      return { limit: 200, name: "Basic" }; // 5,000 words ÷ 25 words per transformation
    case "Plus":
      return { limit: 600, name: "Plus" }; // 15,000 words ÷ 25 words per transformation  
    case "Pro":
      return { limit: 1200, name: "Pro" }; // 30,000 words ÷ 25 words per transformation
    default:
      return { limit: 5, name: "Free" };
  }
}

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
        usage: {
          totalUsed: 0,
          limit: -1, // -1 indicates unlimited
          remaining: -1,
          plan: "Admin",
          hasAccess: true,
          isAdmin: true,
        } as UsageData
      });
    }

    // Get user profile for subscription info
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_subscription_status, stripe_customer_id, price_id, has_access")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch user profile'
      }, { status: 500 });
    }

    const hasActiveSubscription = profile?.stripe_subscription_status === "active";
    const planLimits = getPlanLimits(profile?.price_id);

    // Get usage for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // For free users, reset daily instead of monthly
    const resetDate = hasActiveSubscription ? endOfMonth : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const usageStartDate = hasActiveSubscription ? startOfMonth : new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let totalUsed = 0;
    
    // Try to get usage data, but handle gracefully if table doesn't exist
    try {
      const { data: usageRecords, error: usageError } = await supabase
        .from("user_usage")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", usageStartDate.toISOString())
        .lte("created_at", (hasActiveSubscription ? endOfMonth : resetDate).toISOString());

      if (usageError) {
        if (usageError.code === '42P01') {
          // Table doesn't exist - this is expected if migration hasn't been run
          console.warn('📊 [Usage] user_usage table not found - migration needed');
          totalUsed = 0;
        } else {
          console.error('📊 [Usage] Usage fetch error:', usageError);
          totalUsed = 0;
        }
      } else {
        totalUsed = usageRecords?.length || 0;
      }
    } catch (error) {
      console.error('📊 [Usage] Error querying usage table:', error);
      totalUsed = 0;
    }

    const remaining = Math.max(0, planLimits.limit - totalUsed);

    const usageData: UsageData = {
      totalUsed,
      limit: planLimits.limit,
      remaining,
      plan: planLimits.name,
      hasAccess: hasActiveSubscription || remaining > 0,
      isAdmin: false,
      resetDate: resetDate.toISOString(),
    };

    return NextResponse.json({
      success: true,
      usage: usageData
    });

  } catch (error) {
    console.error('📊 [Usage] Usage check error:', error);
    return NextResponse.json(
      { error: 'Usage check failed' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if user is admin - they get unlimited usage
    const isAdmin = isUserAdmin({ email: user.email, id: user.id });
    
    if (isAdmin) {
      return NextResponse.json({
        success: true,
        message: 'Admin usage tracked (unlimited)'
      });
    }

    // Get current usage first to check limits
    const usageResponse = await GET();
    const usageData = await usageResponse.json();

    if (!usageData.success) {
      return NextResponse.json(
        { error: 'Failed to check usage limits' },
        { status: 500 }
      );
    }

    const usage = usageData.usage as UsageData;

    // Check if user has reached their limit
    if (!usage.hasAccess || usage.remaining <= 0) {
      return NextResponse.json(
        { 
          error: 'Usage limit reached',
          usage: usage
        },
        { status: 429 } // Too Many Requests
      );
    }

    // Try to record the usage, but handle gracefully if table doesn't exist
    try {
      const { error: insertError } = await supabase
        .from("user_usage")
        .insert({
          user_id: user.id,
          action: "transformation",
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        if (insertError.code === '42P01') {
          // Table doesn't exist - log warning but don't fail
          console.warn('📊 [Usage] user_usage table not found - migration needed');
        } else {
          console.error('📊 [Usage] Usage recording error:', insertError);
          return NextResponse.json(
            { error: 'Failed to record usage' },
            { status: 500 }
          );
        }
      }
    } catch (error) {
      console.warn('📊 [Usage] Error recording usage (table may not exist):', error);
    }

    // Return updated usage
    const updatedUsage: UsageData = {
      ...usage,
      totalUsed: usage.totalUsed + 1,
      remaining: usage.remaining - 1,
      hasAccess: usage.remaining - 1 > 0 || usage.plan !== "Free"
    };

    return NextResponse.json({
      success: true,
      message: 'Usage recorded successfully',
      usage: updatedUsage
    });

  } catch (error) {
    console.error('📊 [Usage] Usage recording error:', error);
    return NextResponse.json(
      { error: 'Usage recording failed' },
      { status: 500 }
    );
  }
} 