import { createClient } from "@/libs/supabase/server";
import { isUserAdmin } from "@/libs/admin";
import { NextResponse, NextRequest } from "next/server";
import { resetBillingCycle } from "@/lib/wordUtils";

// 🧪 TESTING: Manual billing cycle reset endpoint (Admin only)
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = isUserAdmin({ email: user.email, id: user.id });
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, resetType = 'manual' } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    console.log(`🔄 [AdminReset] Admin ${user.email} resetting billing cycle for user: ${userId}`);

    try {
      await resetBillingCycle(userId);
      
      console.log(`✅ [AdminReset] Successfully reset billing cycle for user: ${userId}`);
      
      return NextResponse.json({
        success: true,
        message: `Billing cycle reset successfully for user ${userId}`,
        resetType,
        resetBy: user.email,
        resetAt: new Date().toISOString()
      });
    } catch (resetError) {
      console.error(`❌ [AdminReset] Failed to reset billing cycle:`, resetError);
      
      return NextResponse.json({
        error: 'Failed to reset billing cycle',
        details: resetError.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ [AdminReset] Endpoint error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

// GET endpoint to check if user can access this endpoint
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
      message: 'Admin billing reset endpoint available',
      user: {
        id: user.id,
        email: user.email,
        isAdmin: true
      },
      usage: {
        endpoint: '/api/admin/reset-billing-cycle',
        method: 'POST',
        body: {
          userId: 'string (required)',
          resetType: 'string (optional, default: "manual")'
        }
      }
    });

  } catch (error) {
    console.error('❌ [AdminReset] GET error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
} 