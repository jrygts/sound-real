import { createClient } from "@/libs/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createClient();
    
    console.log('🧪 [Schema Test] Testing database schema...');
    
    // Test if we can select all required columns
    const { data, error } = await supabase
      .from('profiles')
      .select('id, stripe_customer_id, plan_type, has_access, words_used, words_limit, transformations_used, transformations_limit, stripe_subscription_id, stripe_subscription_status, billing_period_start, billing_period_end')
      .limit(1);
      
    if (error) {
      console.error('❌ [Schema Test] Error selecting columns:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        missingColumns: 'Unable to determine - query failed'
      }, { status: 500 });
    }
    
    console.log('✅ [Schema Test] All required columns exist');
    
    return NextResponse.json({ 
      success: true, 
      message: 'All required columns exist in profiles table',
      columns: [
        'id', 'stripe_customer_id', 'plan_type', 'has_access', 
        'words_used', 'words_limit', 'transformations_used', 'transformations_limit',
        'stripe_subscription_id', 'stripe_subscription_status', 
        'billing_period_start', 'billing_period_end'
      ],
      sampleData: data?.[0] || null
    });
    
  } catch (error) {
    console.error('💥 [Schema Test] Fatal error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 