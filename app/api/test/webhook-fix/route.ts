import { createClient } from "@/libs/supabase/server";
import { NextResponse, NextRequest } from "next/server";
import { isUserAdmin } from "@/libs/admin";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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

    const { testUserId, mockCustomerId } = await request.json();
    
    if (!testUserId) {
      return NextResponse.json({ error: 'testUserId is required' }, { status: 400 });
    }

    console.log(`🧪 [Webhook Fix Test] Testing webhook logic for user: ${testUserId}`);

    // Simulate the webhook's new logic
    const mockCustomerIdFinal = mockCustomerId || `cus_test_${Date.now()}`;
    let profileId = null;
    let needsCustomerId = false;

    // 1️⃣ Try to find profile by Supabase UUID (most reliable)
    const { data: profileByUid, error: profileError } = await supabase
      .from("profiles")
      .select("id, stripe_customer_id, plan_type, has_access")
      .eq("id", testUserId)
      .single();

    if (profileError) {
      console.error(`❌ [Test] Failed to find profile by UUID ${testUserId}:`, profileError);
      return NextResponse.json({ 
        success: false, 
        error: `Profile not found: ${profileError.message}` 
      }, { status: 404 });
    } else if (profileByUid) {
      profileId = profileByUid.id;
      needsCustomerId = !profileByUid.stripe_customer_id;
      console.log(`✅ [Test] Found profile by UUID: ${profileId}, needs customer ID: ${needsCustomerId}`);
    }

    // 2️⃣ Simulate the update
    const updateData: any = {
      plan_type: 'Basic',
      words_limit: 5000,
      transformations_limit: 200,
      stripe_subscription_status: 'active',
      stripe_subscription_id: `sub_test_${Date.now()}`,
      has_access: true,
      updated_at: new Date().toISOString()
    };

    // Backfill stripe_customer_id if needed
    if (needsCustomerId) {
      updateData.stripe_customer_id = mockCustomerIdFinal;
      console.log(`🔧 [Test] Would backfill stripe_customer_id: ${mockCustomerIdFinal}`);
    }

    // Update by profile ID (not customer ID)
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', profileId)
      .select('id, plan_type, words_used, words_limit, stripe_customer_id, has_access')
      .single();

    if (updateError) {
      console.error('❌ [Test] Database update failed:', updateError);
      return NextResponse.json({ 
        success: false, 
        error: `Update failed: ${updateError.message}` 
      }, { status: 500 });
    }

    console.log(`✅ [Test] Successfully updated profile to Basic plan`);

    return NextResponse.json({
      success: true,
      message: 'Webhook fix test completed successfully',
      testResults: {
        foundByUuid: true,
        profileId: profileId,
        neededCustomerIdBackfill: needsCustomerId,
        updatedProfile: {
          id: updatedProfile?.id,
          plan_type: updatedProfile?.plan_type,
          words_limit: updatedProfile?.words_limit,
          stripe_customer_id: updatedProfile?.stripe_customer_id,
          has_access: updatedProfile?.has_access
        }
      },
      originalProfile: {
        id: profileByUid?.id,
        plan_type: profileByUid?.plan_type,
        stripe_customer_id: profileByUid?.stripe_customer_id,
        has_access: profileByUid?.has_access
      }
    });

  } catch (error) {
    console.error('🧪 [Test] Webhook fix test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Webhook Fix Test Endpoint',
    usage: {
      method: 'POST',
      body: {
        testUserId: 'string (required) - UUID of user to test',
        mockCustomerId: 'string (optional) - Mock Stripe customer ID'
      },
      description: 'Tests the new webhook logic that finds users by UUID and backfills stripe_customer_id'
    }
  });
} 