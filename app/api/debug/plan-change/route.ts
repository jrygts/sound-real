import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from "@/libs/supabase/server";
import { isUserAdmin } from "@/libs/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { userId, newPriceId, currentUsage } = await request.json();
    
    if (!userId || !newPriceId) {
      return NextResponse.json({ error: 'userId and newPriceId required' }, { status: 400 });
    }

    // Check if user is admin OR if they're accessing their own data
    const isAdmin = isUserAdmin({ email: user.email, id: user.id });
    const isOwnData = userId === user.id;
    
    if (!isAdmin && !isOwnData) {
      return NextResponse.json({ error: 'Admin access required or you can only access your own data' }, { status: 403 });
    }

    console.log(`🔬 [Debug] Analyzing plan change for user: ${userId} to price: ${newPriceId}`);
    
    // Get user's current subscription
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    if (!profile.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }
    
    // Get current subscription from Stripe
    const currentSubscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    const currentPriceId = currentSubscription.items.data[0].price.id;
    
    if (currentPriceId === newPriceId) {
      return NextResponse.json({
        error: 'User is already on the requested plan',
        current_price_id: currentPriceId,
        requested_price_id: newPriceId
      }, { status: 400 });
    }
    
    // Calculate what would happen with upcoming invoice preview
    let preview: Stripe.UpcomingInvoice | null = null;
    let previewError: string | null = null;
    
    try {
      preview = await stripe.invoices.retrieveUpcoming({
        customer: profile.stripe_customer_id,
        subscription: profile.stripe_subscription_id,
        subscription_items: [{
          id: currentSubscription.items.data[0].id,
          price: newPriceId,
        }],
      });
    } catch (error) {
      previewError = error.message;
      console.error(`🔬 [Debug] Preview error:`, error);
    }
    
    // Analyze the prices
    const currentPrice = await stripe.prices.retrieve(currentPriceId);
    const newPrice = await stripe.prices.retrieve(newPriceId);
    
    // Get price configurations
    const priceConfigs: Record<string, { name: string; words: number; amount: number }> = {
      'price_1RWIGTR2giDQL8gT2b4fgQeD': { name: 'Basic', words: 5000, amount: 699 },
      'price_1RWIH9R2giDQL8gTtQ0SIOlM': { name: 'Plus', words: 15000, amount: 1999 },
      'price_1RWIHvR2giDQL8gTI17qjZmD': { name: 'Ultra', words: 35000, amount: 3999 }
    };
    
    const currentPlan = priceConfigs[currentPriceId as keyof typeof priceConfigs];
    const newPlan = priceConfigs[newPriceId as keyof typeof priceConfigs];
    
    // Calculate time remaining in current period
    const now = Date.now() / 1000;
    const periodStart = currentSubscription.current_period_start;
    const periodEnd = currentSubscription.current_period_end;
    const periodLength = periodEnd - periodStart;
    const timeElapsed = now - periodStart;
    const timeRemaining = periodEnd - now;
    const percentElapsed = (timeElapsed / periodLength) * 100;
    
    // Analyze billing behavior
    const analysis = {
      is_upgrade: (newPrice.unit_amount || 0) > (currentPrice.unit_amount || 0),
      is_downgrade: (newPrice.unit_amount || 0) < (currentPrice.unit_amount || 0),
      is_same_price: (newPrice.unit_amount || 0) === (currentPrice.unit_amount || 0),
      amount_difference: (newPrice.unit_amount || 0) - (currentPrice.unit_amount || 0),
      will_prorate: true, // Stripe typically prorates by default
      period_percent_elapsed: Math.round(percentElapsed),
      days_remaining: Math.ceil(timeRemaining / (24 * 60 * 60)),
    };
    
    // Determine expected behavior
    let expectedBehavior = '';
    if (analysis.is_same_price) {
      expectedBehavior = 'No charge expected - same price tier';
    } else if (analysis.is_upgrade) {
      expectedBehavior = `Prorated charge expected: ~$${Math.abs(analysis.amount_difference * (timeRemaining / periodLength) / 100).toFixed(2)}`;
    } else {
      expectedBehavior = 'Credit applied for downgrade - may result in $0 charge';
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: profile.email,
        stripe_customer_id: profile.stripe_customer_id,
        current_plan: profile.plan_type,
        words_used: profile.words_used,
        words_limit: profile.words_limit,
      },
      current_state: {
        subscription_id: currentSubscription.id,
        status: currentSubscription.status,
        current_price_id: currentPriceId,
        current_plan_name: currentPlan?.name || 'Unknown',
        current_amount: currentPrice.unit_amount,
        current_period_start: new Date(currentSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(currentSubscription.current_period_end * 1000).toISOString(),
        livemode: currentSubscription.livemode,
        test_mode: !currentSubscription.livemode,
      },
      proposed_change: {
        new_price_id: newPriceId,
        new_plan_name: newPlan?.name || 'Unknown',
        new_amount: newPrice.unit_amount,
        new_words_limit: newPlan?.words || 0,
        price_difference: analysis.amount_difference,
        price_difference_formatted: `$${(analysis.amount_difference / 100).toFixed(2)}`,
      },
      billing_period: {
        period_start: new Date(periodStart * 1000).toISOString(),
        period_end: new Date(periodEnd * 1000).toISOString(),
        period_length_days: Math.ceil(periodLength / (24 * 60 * 60)),
        percent_elapsed: analysis.period_percent_elapsed,
        days_remaining: analysis.days_remaining,
        time_remaining_hours: Math.ceil(timeRemaining / (60 * 60)),
      },
      preview_invoice: preview ? {
        amount_due: preview.amount_due,
        amount_due_formatted: `$${(preview.amount_due / 100).toFixed(2)}`,
        subtotal: preview.subtotal,
        total: preview.total,
        tax: preview.tax || 0,
        lines: preview.lines.data.map(line => ({
          description: line.description,
          amount: line.amount,
          amount_formatted: `$${(line.amount / 100).toFixed(2)}`,
          quantity: line.quantity,
          period: line.period ? {
            start: new Date(line.period.start * 1000).toISOString(),
            end: new Date(line.period.end * 1000).toISOString(),
          } : null,
          proration: line.proration || false,
        })),
      } : null,
      analysis: {
        ...analysis,
        expected_behavior: expectedBehavior,
        will_charge_immediately: preview ? preview.amount_due > 0 : null,
        billing_reason_expected: 'subscription_update',
        webhook_events_expected: [
          'customer.subscription.updated',
          'invoice.created',
          'invoice.finalized',
          preview && preview.amount_due > 0 ? 'invoice.payment_succeeded' : 'invoice.paid',
        ].filter(Boolean),
        usage_reset_expected: false, // Mid-cycle plan changes should preserve usage
        recommendation: analysis.is_same_price ? 
          '⚠️ No financial change - verify this is intentional' :
          analysis.amount_difference === 0 ?
            '💰 No immediate charge expected due to proration' :
            `💳 Immediate ${analysis.is_upgrade ? 'charge' : 'credit'} expected`,
      },
      errors: {
        preview_error: previewError,
      }
    });
    
  } catch (error) {
    console.error('❌ [Debug] Plan change analysis error:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze plan change',
      details: error.message 
    }, { status: 500 });
  }
} 