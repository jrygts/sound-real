import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/libs/supabase/server';
import config from '@/config';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-08-16',
  typescript: true,
});

export async function GET(req: NextRequest) {
  const diagnostics: any = {};
  
  try {
    // ENVIRONMENT VARIABLES CHECK
    diagnostics.env = {
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? '[SET]' : '[MISSING]',
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? '[SET]' : '[MISSING]',
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? '[SET]' : '[MISSING]',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '[SET]' : '[MISSING]',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '[SET]' : '[MISSING]',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '[SET]' : '[MISSING]',
    };

    // SUPABASE CONNECTION TEST
    const supabase = createClient();
    try {
      const { data: connectionTest, error: connectionError } = await supabase.from('transformations').select('id').limit(1);
      diagnostics.supabaseConnection = connectionError ? 'FAIL' : 'OK';
      diagnostics.supabaseConnectionError = connectionError || null;
    } catch (e) {
      diagnostics.supabaseConnection = 'FAIL';
      diagnostics.supabaseConnectionError = e.message;
    }

    // TABLE EXISTENCE CHECK
    diagnostics.tableChecks = {};
    const tables = ['profiles', 'transformations', 'usage_tracking'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        diagnostics.tableChecks[table] = error ? 'MISSING_OR_ERROR' : 'EXISTS';
        if (error) {
          diagnostics.tableChecks[`${table}_error`] = error.message;
        }
      } catch (e) {
        diagnostics.tableChecks[table] = 'MISSING_OR_ERROR';
        diagnostics.tableChecks[`${table}_error`] = e.message;
      }
    }

    // STRIPE API KEY TEST
    try {
      const account = await stripe.accounts.retrieve();
      diagnostics.stripeApiKey = 'OK';
      diagnostics.stripeAccount = {
        id: account.id,
        country: account.country,
        email: account.email
      };
    } catch (e) {
      diagnostics.stripeApiKey = 'FAIL';
      diagnostics.stripeAccountError = e.message;
    }

    // PRICE ID TEST
    diagnostics.priceIdResults = [];
    for (const plan of config.stripe.plans) {
      try {
        const price = await stripe.prices.retrieve(plan.priceId);
        diagnostics.priceIdResults.push({ 
          priceId: plan.priceId, 
          status: 'OK', 
          price: {
            id: price.id,
            currency: price.currency,
            unit_amount: price.unit_amount,
            active: price.active
          }
        });
      } catch (e) {
        diagnostics.priceIdResults.push({ priceId: plan.priceId, status: 'FAIL', error: e.message });
      }
    }

    // USER AUTH TEST
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    diagnostics.userAuth = user ? 'OK' : 'FAIL';
    diagnostics.user = user ? {
      id: user.id,
      email: user.email,
      created_at: user.created_at
    } : null;
    diagnostics.userError = userError || null;

    // USER PROFILE TEST (only if user exists and profiles table exists)
    if (user && diagnostics.tableChecks.profiles === 'EXISTS') {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        diagnostics.userProfile = profile || null;
        diagnostics.userProfileError = profileError || null;
      } catch (e) {
        diagnostics.userProfile = null;
        diagnostics.userProfileError = e.message;
      }
    } else if (user) {
      diagnostics.userProfile = 'PROFILES_TABLE_MISSING';
      diagnostics.userProfileError = 'Profiles table does not exist in database';
    }

    // SUMMARY AND RECOMMENDATIONS
    diagnostics.summary = {
      critical_issues: [],
      recommendations: []
    };

    if (diagnostics.tableChecks.profiles !== 'EXISTS') {
      diagnostics.summary.critical_issues.push('PROFILES_TABLE_MISSING');
      diagnostics.summary.recommendations.push('Run the SQL in lib/supabase/schema/06-profiles-table.sql');
    }

    if (diagnostics.stripeApiKey !== 'OK') {
      diagnostics.summary.critical_issues.push('STRIPE_API_KEY_INVALID');
      diagnostics.summary.recommendations.push('Check STRIPE_SECRET_KEY in environment variables');
    }

    if (diagnostics.userAuth !== 'OK') {
      diagnostics.summary.critical_issues.push('USER_NOT_AUTHENTICATED');
      diagnostics.summary.recommendations.push('Sign in to test Stripe checkout');
    }

    if (diagnostics.priceIdResults.some((p: any) => p.status === 'FAIL')) {
      diagnostics.summary.critical_issues.push('INVALID_PRICE_IDS');
      diagnostics.summary.recommendations.push('Update price IDs in config.ts to match Stripe dashboard');
    }

    return NextResponse.json({ diagnostics });
  } catch (error) {
    return NextResponse.json({ 
      error: error?.message || 'Unknown error', 
      diagnostics,
      stack: error.stack 
    }, { status: 500 });
  }
} 