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

    // Use the new database function to get accurate usage data
    const { data: usageResult, error: usageError } = await supabase
      .rpc('get_user_usage', { user_id: user.id });

    if (usageError) {
      console.error('📊 [Usage] Database function error:', usageError);
      // Fallback to basic profile check if function fails
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("plan_type, transformations_used, transformations_limit, stripe_subscription_status")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error('📊 [Usage] Profile fetch error:', profileError);
        return NextResponse.json(
          { error: 'Failed to fetch usage data' },
          { status: 500 }
        );
      }

      // Basic fallback logic
      const planType = profile?.plan_type || (profile?.stripe_subscription_status === 'active' ? 'Pro' : 'Free');
      const limit = planType === 'Free' ? 5 : -1;
      const used = profile?.transformations_used || 0;
      const remaining = limit === -1 ? -1 : Math.max(0, limit - used);

      return NextResponse.json({
        success: true,
        usage: {
          totalUsed: used,
          limit: limit,
          remaining: remaining,
          plan: planType,
          hasAccess: remaining > 0 || limit === -1,
          isAdmin: false,
          resetDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        } as UsageData
      });
    }

    // Parse the JSON result from the database function
    const usage = usageResult as any;
    
    if (usage.error) {
      console.error('📊 [Usage] Database function returned error:', usage.error);
      return NextResponse.json(
        { error: usage.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      usage: {
        totalUsed: usage.totalUsed || 0,
        limit: usage.limit || 5,
        remaining: usage.remaining || 0,
        plan: usage.plan || 'Free',
        hasAccess: usage.hasAccess !== false,
        isAdmin: false,
        resetDate: usage.resetDate,
      } as UsageData
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
        message: 'Admin usage tracked (unlimited)',
        usage: {
          totalUsed: 0,
          limit: -1,
          remaining: -1,
          plan: "Admin",
          hasAccess: true,
          isAdmin: true,
        } as UsageData
      });
    }

    // Use the new database function to increment usage
    const { data: incrementResult, error: incrementError } = await supabase
      .rpc('increment_usage', { user_id: user.id });

    if (incrementError) {
      console.error('📊 [Usage] Increment usage error:', incrementError);
      return NextResponse.json(
        { error: 'Failed to record usage' },
        { status: 500 }
      );
    }

    // Check if usage increment was successful
    if (!incrementResult) {
      // Usage limit reached - get current usage for error details
      const usageResponse = await GET();
      const usageData = await usageResponse.json();
      
      return NextResponse.json(
        { 
          error: 'Usage limit reached',
          usage: usageData.usage || null
        },
        { status: 429 } // Too Many Requests
      );
    }

    // Get updated usage data
    const usageResponse = await GET();
    const usageData = await usageResponse.json();

    return NextResponse.json({
      success: true,
      message: 'Usage recorded successfully',
      usage: usageData.usage || null
    });

  } catch (error) {
    console.error('📊 [Usage] Usage recording error:', error);
    return NextResponse.json(
      { error: 'Usage recording failed' },
      { status: 500 }
    );
  }
} 