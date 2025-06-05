import { createClient } from "@/libs/supabase/server";
import { isUserAdmin } from "@/libs/admin";
import { NextResponse, NextRequest } from "next/server";

// 🧪 TESTING: Webhook simulation endpoint for debugging billing scenarios
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is admin (optional - you may want to allow regular users for testing)
    const isAdmin = isUserAdmin({ email: user.email, id: user.id });
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required for webhook testing' }, { status: 403 });
    }

    const { eventType, userId, scenario, customData } = await request.json();
    
    console.log(`🧪 [WebhookTest] Admin ${user.email} simulating webhook scenario:`, {
      eventType,
      userId,
      scenario,
      customData
    });

    // Get current user data
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !currentProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    let updateData: any = {};
    let resultMessage = '';

    switch (scenario) {
      case 'plan_change_preserve_usage':
        // Simulate plan change without billing period change - should preserve usage
        updateData = {
          plan_type: customData?.newPlan || 'Ultra',
          words_limit: customData?.newLimit || 35000,
          transformations_limit: customData?.newTransformationsLimit || 1200,
          updated_at: new Date().toISOString()
          // Note: NOT updating words_used or billing periods
        };
        resultMessage = `Plan changed from ${currentProfile.plan_type} to ${updateData.plan_type}, usage preserved`;
        console.log(`🧪 [Test] Simulating plan change for user ${userId} - preserving ${currentProfile.words_used} words used`);
        break;
        
      case 'billing_renewal_reset_usage': {
        // Simulate billing period renewal - should reset usage
        const currentPeriodStart = new Date();
        const currentPeriodEnd = new Date();
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
        
        updateData = {
          words_used: 0,
          transformations_used: 0,
          last_reset_date: currentPeriodStart.toISOString(),
          billing_period_start: currentPeriodStart.toISOString(),
          billing_period_end: currentPeriodEnd.toISOString(),
          updated_at: new Date().toISOString()
        };
        resultMessage = `Billing cycle renewed, usage reset from ${currentProfile.words_used} to 0`;
        console.log(`🧪 [Test] Simulating billing renewal for user ${userId} - resetting usage`);
        break;
      }
        
      case 'new_subscription': {
        // Simulate new subscription - should reset usage and set plan
        const newPeriodStart = new Date();
        const newPeriodEnd = new Date();
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
        
        updateData = {
          plan_type: customData?.plan || 'Basic',
          words_limit: customData?.wordsLimit || 5000,
          transformations_limit: customData?.transformationsLimit || 200,
          words_used: 0,
          transformations_used: 0,
          stripe_subscription_status: 'active',
          has_access: true,
          billing_period_start: newPeriodStart.toISOString(),
          billing_period_end: newPeriodEnd.toISOString(),
          last_reset_date: newPeriodStart.toISOString(),
          updated_at: new Date().toISOString()
        };
        resultMessage = `New subscription created for ${updateData.plan_type} plan`;
        console.log(`🧪 [Test] Simulating new subscription for user ${userId}`);
        break;
      }

      case 'plan_change_at_billing_boundary': {
        // Simulate plan change that happens at billing renewal - should reset usage
        const boundaryPeriodStart = new Date();
        const boundaryPeriodEnd = new Date();
        boundaryPeriodEnd.setMonth(boundaryPeriodEnd.getMonth() + 1);
        
        updateData = {
          plan_type: customData?.newPlan || 'Plus',
          words_limit: customData?.newLimit || 15000,
          transformations_limit: customData?.newTransformationsLimit || 600,
          words_used: 0, // Reset because it's at billing boundary
          transformations_used: 0,
          billing_period_start: boundaryPeriodStart.toISOString(),
          billing_period_end: boundaryPeriodEnd.toISOString(),
          last_reset_date: boundaryPeriodStart.toISOString(),
          updated_at: new Date().toISOString()
        };
        resultMessage = `Plan changed at billing boundary, usage reset and new billing period started`;
        console.log(`🧪 [Test] Simulating plan change at billing boundary for user ${userId}`);
        break;
      }

      case 'subscription_cancellation':
        // Simulate subscription cancellation - revert to Free, preserve usage until daily reset
        updateData = {
          plan_type: 'Free',
          words_limit: 0,
          transformations_limit: 5,
          stripe_subscription_status: 'canceled',
          stripe_subscription_id: null,
          has_access: false,
          updated_at: new Date().toISOString()
          // Note: NOT resetting words_used - let it carry over until daily reset
        };
        resultMessage = `Subscription canceled, reverted to Free plan, usage preserved until daily reset`;
        console.log(`🧪 [Test] Simulating subscription cancellation for user ${userId}`);
        break;
        
      default:
        return NextResponse.json({ 
          error: 'Unknown scenario',
          availableScenarios: [
            'plan_change_preserve_usage',
            'billing_renewal_reset_usage', 
            'new_subscription',
            'plan_change_at_billing_boundary',
            'subscription_cancellation'
          ]
        }, { status: 400 });
    }

    // Apply the update
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error(`🧪 [Test] Failed to update profile:`, updateError);
      return NextResponse.json({ 
        error: 'Failed to simulate scenario',
        details: updateError.message 
      }, { status: 500 });
    }

    console.log(`🧪 [Test] ✅ Successfully simulated ${scenario} for user ${userId}`);

    return NextResponse.json({
      success: true,
      scenario,
      message: resultMessage,
      before: {
        plan_type: currentProfile.plan_type,
        words_used: currentProfile.words_used,
        words_limit: currentProfile.words_limit,
        billing_period_start: currentProfile.billing_period_start,
        billing_period_end: currentProfile.billing_period_end
      },
      after: {
        plan_type: updatedProfile.plan_type,
        words_used: updatedProfile.words_used,
        words_limit: updatedProfile.words_limit,
        billing_period_start: updatedProfile.billing_period_start,
        billing_period_end: updatedProfile.billing_period_end
      },
      simulatedBy: user.email,
      simulatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('🧪 [Test] Webhook simulation error:', error);
    return NextResponse.json({
      error: 'Webhook simulation failed',
      details: error.message
    }, { status: 500 });
  }
}

// GET endpoint to show available test scenarios
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const isAdmin = isUserAdmin({ email: user.email, id: user.id });
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook simulation testing endpoint',
      user: {
        id: user.id,
        email: user.email,
        isAdmin: true
      },
      usage: {
        endpoint: '/api/test/webhook-simulation',
        method: 'POST',
        body: {
          userId: 'string (required) - Target user ID',
          scenario: 'string (required) - Test scenario to simulate',
          customData: 'object (optional) - Custom data for scenario'
        },
        availableScenarios: [
          {
            name: 'plan_change_preserve_usage',
            description: 'Simulate plan change mid-cycle - should preserve current word usage',
            customData: {
              newPlan: 'string (e.g., "Ultra")',
              newLimit: 'number (e.g., 35000)', 
              newTransformationsLimit: 'number (e.g., 1200)'
            }
          },
          {
            name: 'billing_renewal_reset_usage',
            description: 'Simulate billing period renewal - should reset word usage to 0',
            customData: 'none'
          },
          {
            name: 'new_subscription',
            description: 'Simulate new subscription creation - should reset usage and set plan',
            customData: {
              plan: 'string (e.g., "Basic")',
              wordsLimit: 'number (e.g., 5000)',
              transformationsLimit: 'number (e.g., 200)'
            }
          },
          {
            name: 'plan_change_at_billing_boundary',
            description: 'Simulate plan change at billing renewal - should reset usage and update billing period',
            customData: {
              newPlan: 'string (e.g., "Plus")',
              newLimit: 'number (e.g., 15000)',
              newTransformationsLimit: 'number (e.g., 600)'
            }
          },
          {
            name: 'subscription_cancellation', 
            description: 'Simulate subscription cancellation - should revert to Free plan, preserve usage',
            customData: 'none'
          }
        ]
      }
    });

  } catch (error) {
    console.error('🧪 [Test] GET error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
} 