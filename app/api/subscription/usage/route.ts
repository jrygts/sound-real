import { createClient } from "@/libs/supabase/server";
import { isUserAdmin } from "@/libs/admin";
import { NextResponse, NextRequest } from "next/server";
import config from "@/config";
import Stripe from "stripe";
import { 
  countWords, 
  canProcessWords, 
  getPlanConfig, 
  formatWordUsage, 
  getNextResetDate,
  validateWordCount,
  getWordLimitExceededMessage,
  needsBillingReset,
  calculateDaysRemaining,
  getTransformationsLimit
} from "@/lib/wordUtils";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-08-16",
  typescript: true,
});

interface UsageData {
  // Word-based usage (primary)
  words_used: number;
  words_limit: number;
  words_remaining: number;
  
  // Legacy transformation-based usage (keep for backward compatibility)
  totalUsed: number;
  limit: number;
  remaining: number;
  
  plan: string;
  hasAccess: boolean;
  isAdmin: boolean;
  resetDate?: string;
  billing_period_start?: string;
  billing_period_end?: string;
  days_remaining?: number;
  
  // Legacy transformation data for backward compatibility
  transformations_used?: number;
  transformations_limit?: number;
  transformations_remaining?: number;
}

// Function to get real-time subscription status from Stripe
async function verifyStripeSubscriptionStatus(
  customerId: string,
  subscriptionId?: string
): Promise<{ status: string; priceId?: string; isActive: boolean }> {
  try {
    console.log(`📊 [Usage] 🔍 Verifying Stripe subscription for customer: ${customerId}`);
    
    if (subscriptionId) {
      // Check specific subscription
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      console.log(`📊 [Usage] ✅ Subscription status: ${subscription.status}`);
      
      return {
        status: subscription.status,
        priceId: subscription.items.data[0]?.price.id,
        isActive: subscription.status === 'active'
      };
    } else {
      // Get customer's active subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1
      });
      
      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        console.log(`📊 [Usage] ✅ Found active subscription: ${subscription.id}`);
        
        return {
          status: subscription.status,
          priceId: subscription.items.data[0]?.price.id,
          isActive: true
        };
      } else {
        console.log(`📊 [Usage] ⚠️ No active subscriptions found`);
        return {
          status: 'inactive',
          isActive: false
        };
      }
    }
  } catch (error) {
    console.error(`📊 [Usage] ❌ Stripe verification failed:`, error);
    // Return unknown status on error - we'll use cached data
    return {
      status: 'unknown',
      isActive: false
    };
  }
}

// Function to determine correct plan details based on subscription status
function getPlanDetailsFromStatus(isActive: boolean, priceId?: string): {
  planType: string;
  wordsLimit: number;
  transformationsLimit: number;
} {
  if (!isActive) {
    return {
      planType: 'Free',
      wordsLimit: 0,
      transformationsLimit: 5
    };
  }
  
  // Map price IDs to plan types
  const priceToplan: Record<string, string> = {
    'price_1RWIGTR2giDQL8gT2b4fgQeD': 'Basic',
    'price_1RWIH9R2giDQL8gTtQ0SIOlM': 'Plus',
    'price_1RWIHvR2giDQL8gTI17qjZmD': 'Ultra'
  };
  
  const planType = priceId && priceToplan[priceId] ? priceToplan[priceId] : 'Basic';
  const config = getPlanConfig(planType);
  
  return {
    planType,
    wordsLimit: config.words_limit,
    transformationsLimit: config.transformations_limit
  };
}

// Function to auto-correct plan_type if it's wrong
async function autoCorrectPlanType(
  supabase: any,
  userId: string,
  stripeCustomerId: string,
  stripeSubscriptionId?: string,
  currentPlanType?: string
): Promise<{ planType: string; wordsLimit: number; transformationsLimit: number; corrected: boolean }> {
  try {
    console.log(`📊 [Usage] 🔧 Auto-correcting plan type for user: ${userId}`);
    
    // Verify with Stripe
    const stripeStatus = await verifyStripeSubscriptionStatus(stripeCustomerId, stripeSubscriptionId);
    
    if (stripeStatus.status === 'unknown') {
      console.log(`📊 [Usage] ⚠️ Could not verify Stripe status, using cached data`);
      const config = getPlanConfig(currentPlanType || 'Free');
      return {
        planType: currentPlanType || 'Free',
        wordsLimit: config.words_limit,
        transformationsLimit: config.transformations_limit,
        corrected: false
      };
    }
    
    const correctPlan = getPlanDetailsFromStatus(stripeStatus.isActive, stripeStatus.priceId);
    
    // Check if correction is needed
    const needsCorrection = currentPlanType !== correctPlan.planType;
    
    if (needsCorrection) {
      console.log(`📊 [Usage] 🔄 Plan mismatch detected! Cached: ${currentPlanType}, Stripe: ${correctPlan.planType}`);
      
      // 🚨 CRITICAL FIX: Update plan details WITHOUT resetting usage
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          plan_type: correctPlan.planType,
          words_limit: correctPlan.wordsLimit,
          transformations_limit: correctPlan.transformationsLimit,
          stripe_subscription_status: stripeStatus.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      
      if (updateError) {
        console.error(`📊 [Usage] ❌ Failed to auto-correct plan:`, updateError);
        // Return cached data if update fails
        const config = getPlanConfig(currentPlanType || 'Free');
        return {
          planType: currentPlanType || 'Free',
          wordsLimit: config.words_limit,
          transformationsLimit: config.transformations_limit,
          corrected: false
        };
      }
      
      console.log(`📊 [Usage] ✅ Plan auto-corrected: ${currentPlanType} → ${correctPlan.planType} (usage preserved)`);
      
      return {
        planType: correctPlan.planType,
        wordsLimit: correctPlan.wordsLimit,
        transformationsLimit: correctPlan.transformationsLimit,
        corrected: true
      };
    } else {
      console.log(`📊 [Usage] ✅ Plan type is correct: ${correctPlan.planType}`);
      return {
        planType: correctPlan.planType,
        wordsLimit: correctPlan.wordsLimit,
        transformationsLimit: correctPlan.transformationsLimit,
        corrected: false
      };
    }
  } catch (error) {
    console.error(`📊 [Usage] ❌ Auto-correction failed:`, error);
    const config = getPlanConfig(currentPlanType || 'Free');
    return {
      planType: currentPlanType || 'Free',
      wordsLimit: config.words_limit,
      transformationsLimit: config.transformations_limit,
      corrected: false
    };
  }
}

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
          usage: {
            words_used: 0,
            words_limit: -1,
            words_remaining: -1,
            totalUsed: 0,
            limit: -1, // -1 indicates unlimited
            remaining: -1,
            plan: "Admin",
            hasAccess: true,
            isAdmin: true,
          } as UsageData
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
    }

    // Get user profile with word-based billing information
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(`
        plan_type, 
        words_used, 
        words_limit, 
        transformations_used, 
        transformations_limit, 
        stripe_subscription_status, 
        stripe_customer_id, 
        stripe_subscription_id,
        period_start_date,
        last_reset_date,
        billing_period_start,
        billing_period_end
      `)
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error('📊 [Usage] Profile fetch error:', profileError);
      return new NextResponse(
        JSON.stringify({ error: 'Failed to fetch usage data' }),
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

    // Auto-correct plan type if we have Stripe details
    let finalPlan = profile?.plan_type || 'Free';
    let finalWordsLimit = profile?.words_limit || 0;
    let finalTransformationsLimit = profile?.transformations_limit || 5;
    let corrected = false;

    if (profile?.stripe_customer_id) {
      console.log('📊 [Usage] 🔍 Attempting real-time plan verification...');
      
      const correctionResult = await autoCorrectPlanType(
        supabase,
        user.id,
        profile.stripe_customer_id,
        profile.stripe_subscription_id,
        profile.plan_type
      );
      
      finalPlan = correctionResult.planType;
      finalWordsLimit = correctionResult.wordsLimit;
      finalTransformationsLimit = correctionResult.transformationsLimit;
      corrected = correctionResult.corrected;
      
      if (corrected) {
        console.log('📊 [Usage] ✅ Plan auto-corrected in usage check');
      }
    }

    // Calculate word usage
    const wordsUsed = profile?.words_used || 0;
    const wordsRemaining = finalWordsLimit === 0 ? 0 : Math.max(0, finalWordsLimit - wordsUsed);
    
    // Calculate transformation usage (for backward compatibility)
    const transformationsUsed = profile?.transformations_used || 0;
    const transformationsRemaining = finalTransformationsLimit === -1 ? -1 : 
      Math.max(0, finalTransformationsLimit - transformationsUsed);

    // Determine access based on plan type
    let hasAccess = false;
    if (finalPlan === 'Free') {
      // Free users have access if they have transformations remaining
      hasAccess = transformationsRemaining > 0;
    } else {
      // Paid users have access if they have words remaining
      hasAccess = wordsRemaining > 0 || finalWordsLimit === -1;
    }

    // Calculate billing period dates
    const config = getPlanConfig(finalPlan);
    const periodStart = profile?.billing_period_start 
      ? new Date(profile.billing_period_start) 
      : (profile?.period_start_date ? new Date(profile.period_start_date) : new Date());
    
    const periodEnd = profile?.billing_period_end 
      ? new Date(profile.billing_period_end)
      : getNextResetDate(finalPlan, periodStart);
    
    const daysRemaining = calculateDaysRemaining(periodEnd);

    const response: any = {
      success: true,
      usage: {
        // Word-based usage (primary)
        words_used: wordsUsed,
        words_limit: finalWordsLimit,
        words_remaining: wordsRemaining,
        
        // Legacy transformation-based usage
        totalUsed: transformationsUsed,
        limit: finalTransformationsLimit,
        remaining: transformationsRemaining,
        
        plan: finalPlan,
        hasAccess,
        isAdmin: false,
        resetDate: periodEnd.toISOString(),
        billing_period_start: periodStart.toISOString(),
        billing_period_end: periodEnd.toISOString(),
        days_remaining: daysRemaining,
        
        // Legacy transformation data for backward compatibility
        transformations_used: transformationsUsed,
        transformations_limit: getTransformationsLimit(finalPlan),
        transformations_remaining: Math.max(0, getTransformationsLimit(finalPlan) - transformationsUsed)
      } as UsageData
    };

    if (corrected) {
      response.message = `Plan auto-corrected to ${finalPlan} based on Stripe data`;
    }

    return new NextResponse(
      JSON.stringify(response),
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
    console.error('📊 [Usage] Usage check error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Usage check failed' }),
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

// POST endpoint for word-based usage increment
export async function POST(req: NextRequest) {
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

    // Check if user is admin - they get unlimited usage
    const isAdmin = isUserAdmin({ email: user.email, id: user.id });
    
    if (isAdmin) {
      return new NextResponse(
        JSON.stringify({
          success: true,
          message: 'Admin usage tracked (unlimited)',
          usage: {
            words_used: 0,
            words_limit: -1,
            words_remaining: -1,
            totalUsed: 0,
            limit: -1,
            remaining: -1,
            plan: "Admin",
            hasAccess: true,
            isAdmin: true,
          } as UsageData
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
    }

    // Get request body to extract text for word counting
    const body = await req.json();
    const { text, mode = 'increment' } = body;

    // Validate word count if text is provided
    let wordsToIncrement = 0;
    if (text) {
      const validation = validateWordCount(text);
      if (!validation.isValid) {
        return new NextResponse(
          JSON.stringify({ 
            error: 'INVALID_INPUT',
            message: validation.error,
            wordCount: validation.wordCount
          }),
          { 
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          }
        );
      }
      wordsToIncrement = validation.wordCount;
    }

    // Get current usage
    const usageResponse = await GET();
    const usageData = await usageResponse.json();
    
    if (!usageData.success) {
      return new NextResponse(
        JSON.stringify({ error: 'Failed to get current usage' }),
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

    const usage = usageData.usage;
    
    // For word-based increment (paid plans)
    if (mode === 'increment' && wordsToIncrement > 0) {
      // Check if user can process this many words
      const canProcess = canProcessWords(
        wordsToIncrement,
        usage.words_used,
        usage.words_limit,
        usage.plan
      );

      if (!canProcess.canProcess) {
        const errorMessage = getWordLimitExceededMessage(
          wordsToIncrement,
          canProcess.wordsRemaining,
          usage.plan
        );

        return new NextResponse(
          JSON.stringify({ 
            error: 'WORD_LIMIT_EXCEEDED',
            message: errorMessage,
            wordsNeeded: wordsToIncrement,
            wordsRemaining: canProcess.wordsRemaining,
            upgradeUrl: '/billing'
          }),
          { 
            status: 429, // Too Many Requests
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          }
        );
      }

      // Increment word usage
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          words_used: usage.words_used + wordsToIncrement,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('📊 [Usage] Word increment error:', updateError);
        return new NextResponse(
          JSON.stringify({ error: 'Failed to record word usage' }),
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

      console.log(`📊 [Usage] ✅ Incremented ${wordsToIncrement} words for user ${user.id}`);

    } else {
      // For transformation-based increment (Free users or legacy)
      const { data: incrementResult, error: incrementError } = await supabase
        .rpc('increment_usage', { user_id: user.id });

      if (incrementError) {
        console.error('📊 [Usage] Increment usage error:', incrementError);
        return new NextResponse(
          JSON.stringify({ error: 'Failed to record usage' }),
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

      // Check if usage increment was successful
      if (!incrementResult) {
        return new NextResponse(
          JSON.stringify({ 
            error: 'TRANSFORMATION_LIMIT_EXCEEDED',
            message: 'Daily transformation limit reached. Please upgrade to a paid plan for word-based billing.',
            usage: usage
          }),
          { 
            status: 429, // Too Many Requests
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

    // Get updated usage data
    const updatedUsageResponse = await GET();
    const updatedUsageData = await updatedUsageResponse.json();

    return new NextResponse(
      JSON.stringify({
        success: true,
        message: wordsToIncrement > 0 ? 
          `Successfully recorded ${wordsToIncrement} words` : 
          'Usage recorded successfully',
        usage: updatedUsageData.usage || null,
        wordsProcessed: wordsToIncrement
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
    console.error('📊 [Usage] Usage recording error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Usage recording failed' }),
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