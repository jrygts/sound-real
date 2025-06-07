import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from "@/libs/supabase/server";
import { isUserAdmin } from "@/libs/admin";

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
});

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: true });
  }

  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const hours = parseInt(searchParams.get('hours') || '24');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Check if user is admin OR if they're accessing their own data
    const isAdmin = isUserAdmin({ email: user.email, id: user.id });
    const isOwnData = userId === user.id;
    
    if (!isAdmin && !isOwnData) {
      return NextResponse.json({ error: 'Admin access required or you can only access your own data' }, { status: 403 });
    }

    console.log(`🔬 [Debug] Fetching Stripe events for user: ${userId}, last ${hours} hours`);
    
    // Get user's Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, plan_type, words_used, words_limit, stripe_subscription_id, billing_period_start, billing_period_end')
      .eq('id', userId)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    if (!profile.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 });
    }
    
    // Get recent Stripe events for this customer
    const since = Math.floor((Date.now() - (hours * 60 * 60 * 1000)) / 1000);
    const events = await stripe.events.list({
      created: { gte: since },
      limit: 100,
    });
    
    console.log(`🔬 [Debug] Found ${events.data.length} total Stripe events in last ${hours} hours`);
    
    // Filter events related to this customer
    const customerEvents = events.data.filter(event => {
      const data = event.data.object as any;
      const customerId = profile.stripe_customer_id;
      
      // Check various ways the customer ID might be present
      return data.customer === customerId ||
             data.subscription?.customer === customerId ||
             data.object?.customer === customerId ||
             (event.type.includes('subscription') && data.customer === customerId) ||
             (event.type.includes('invoice') && data.customer === customerId);
    });
    
    console.log(`🔬 [Debug] Found ${customerEvents.length} events for customer: ${profile.stripe_customer_id}`);
    
    // Get current subscription details
    let subscriptions: Stripe.Subscription[] = [];
    let subscriptionError = null;
    try {
      const subList = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        limit: 10,
      });
      subscriptions = subList.data;
    } catch (error) {
      subscriptionError = error.message;
      console.error(`🔬 [Debug] Error fetching subscriptions:`, error);
    }
    
    // Get recent invoices
    let invoices: Stripe.Invoice[] = [];
    let invoiceError = null;
    try {
      const invList = await stripe.invoices.list({
        customer: profile.stripe_customer_id,
        limit: 10,
      });
      invoices = invList.data;
    } catch (error) {
      invoiceError = error.message;
      console.error(`🔬 [Debug] Error fetching invoices:`, error);
    }

    // Get price details for analysis
    const priceConfigs: Record<string, { name: string; words: number }> = {
      [process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID!]: { name: 'Basic', words: 5000 },
      [process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID!]: { name: 'Plus', words: 15000 },
      [process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!]: { name: 'Ultra', words: 35000 }
    };

    // Analyze recent events for patterns
    const subscriptionUpdates = customerEvents.filter(e => e.type === 'customer.subscription.updated');
    const invoicePayments = customerEvents.filter(e => e.type === 'invoice.payment_succeeded');
    const invoiceCreated = customerEvents.filter(e => e.type === 'invoice.created');
    
    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: profile.email,
        plan_type: profile.plan_type,
        words_used: profile.words_used,
        words_limit: profile.words_limit,
        stripe_customer_id: profile.stripe_customer_id,
        stripe_subscription_id: profile.stripe_subscription_id,
        billing_period_start: profile.billing_period_start,
        billing_period_end: profile.billing_period_end,
      },
      events: customerEvents.map(event => {
        const data = event.data.object as any;
        const prevAttrs = (event.data as any).previous_attributes || {};
        
        // Analyze subscription updates
        let analysis: string[] = [];
        if (event.type === 'customer.subscription.updated') {
          if (prevAttrs.items) {
            const oldPriceId = prevAttrs.items?.data?.[0]?.price?.id || 'unknown';
            const newPriceId = data.items?.data?.[0]?.price?.id || 'unknown';
            const oldPlan = priceConfigs[oldPriceId as keyof typeof priceConfigs]?.name || oldPriceId;
            const newPlan = priceConfigs[newPriceId as keyof typeof priceConfigs]?.name || newPriceId;
            analysis.push(`🔄 PLAN CHANGE: ${oldPlan} → ${newPlan}`);
          }
          if (prevAttrs.current_period_start) {
            analysis.push('📅 BILLING PERIOD CHANGED');
          }
          if (prevAttrs.status) {
            analysis.push(`📊 STATUS: ${prevAttrs.status} → ${data.status}`);
          }
        }
        
        if (event.type === 'invoice.payment_succeeded') {
          const invoice = data as Stripe.Invoice;
          analysis.push(`💰 PAYMENT: $${(invoice.amount_paid || 0) / 100} (${invoice.billing_reason})`);
        }

        return {
          id: event.id,
          type: event.type,
          created: new Date(event.created * 1000).toISOString(),
          livemode: event.livemode,
          analysis,
          data: {
            // Essential fields only to avoid huge responses
            id: data.id,
            status: data.status,
            customer: data.customer,
            amount: data.amount || data.amount_paid || data.amount_due,
            billing_reason: data.billing_reason,
            subscription: data.subscription,
            items: data.items?.data?.map((item: any) => ({
              price_id: item.price?.id,
              price_amount: item.price?.unit_amount,
              quantity: item.quantity,
            })),
            current_period_start: data.current_period_start,
            current_period_end: data.current_period_end,
          },
          previous_attributes: prevAttrs,
        };
      }),
      subscriptions: subscriptions.map(sub => ({
        id: sub.id,
        status: sub.status,
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        livemode: sub.livemode,
        items: sub.items.data.map(item => ({
          price_id: item.price.id,
          product_name: item.price.nickname || item.price.id,
          amount: item.price.unit_amount,
          currency: item.price.currency,
        })),
      })),
      invoices: invoices.map(inv => ({
        id: inv.id,
        status: inv.status,
        amount_due: inv.amount_due,
        amount_paid: inv.amount_paid,
        subtotal: inv.subtotal,
        total: inv.total,
        billing_reason: inv.billing_reason,
        created: new Date(inv.created * 1000).toISOString(),
        subscription_id: inv.subscription,
        livemode: inv.livemode,
        lines: inv.lines.data.map(line => ({
          description: line.description,
          amount: line.amount,
          quantity: line.quantity,
          period: line.period ? {
            start: new Date(line.period.start * 1000).toISOString(),
            end: new Date(line.period.end * 1000).toISOString(),
          } : null,
        })),
      })),
      analysis: {
        total_events: customerEvents.length,
        event_types: Array.from(new Set(customerEvents.map(e => e.type))),
        test_mode: !customerEvents.some(e => e.livemode),
        subscription_updates: subscriptionUpdates.length,
        recent_invoice_payments: invoicePayments.length,
        recent_invoice_created: invoiceCreated.length,
        zero_amount_payments: invoicePayments.filter(e => {
          const invoice = e.data.object as any;
          return (invoice.amount_paid || 0) === 0;
        }).length,
        price_configs: priceConfigs,
      },
      errors: {
        subscription_error: subscriptionError,
        invoice_error: invoiceError,
      }
    });
    
  } catch (error) {
    console.error('❌ [Debug] Stripe events error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch Stripe events',
      details: error.message 
    }, { status: 500 });
  }
} 