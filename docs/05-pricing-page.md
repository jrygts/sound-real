# Step 5: Pricing Page Implementation

## Overview

The pricing page displays subscription plans and features, following NaturalWrite's clean and modern design. It includes a free tier and two paid tiers with clear feature differentiation.

## File Location

Create `app/pricing/page.tsx`:

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

export default function PricingPage() {
  const router = useRouter()

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: '',
      features: [
        '3 transformations per day',
        '1,000 word limit',
        'Basic humanization',
        'Standard processing speed',
      ],
      cta: 'Get Started',
      href: '/signup',
      popular: false,
    },
    {
      name: 'Pro',
      price: '$9.97',
      period: '/month',
      features: [
        'Unlimited transformations',
        '10,000 word limit',
        'Advanced AI humanization',
        'Priority processing',
        'Download history',
        'Multiple writing styles',
        'API access',
        'Premium support',
      ],
      cta: 'Start Free Trial',
      href: '/signup?plan=pro',
      popular: true,
    },
    {
      name: 'Team',
      price: '$29.97',
      period: '/month',
      features: [
        'Everything in Pro',
        '5 team members',
        'Shared workspace',
        'Team analytics',
        'Priority support',
        'Custom integration',
      ],
      cta: 'Contact Sales',
      href: '/contact',
      popular: false,
    },
  ]

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-600">
            Choose the plan that fits your needs
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-white rounded-xl p-8 ${
                plan.popular
                  ? 'ring-2 ring-blue-600 shadow-xl scale-105'
                  : 'shadow-lg'
              }`}
            >
              {plan.popular && (
                <div className="bg-blue-600 text-white text-sm font-medium py-1 px-3 rounded-full inline-block mb-4">
                  Most Popular
                </div>
              )}
              
              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                {plan.name}
              </h3>
              
              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-900">
                  {plan.price}
                </span>
                <span className="text-slate-600">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 mt-0.5" />
                    <span className="text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => router.push(plan.href)}
                className={`w-full py-3 rounded-lg font-medium transition ${
                  plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-slate-600">
            All plans include a 7-day money-back guarantee
          </p>
        </div>
      </div>
    </section>
  )
}
```

## Key Features

1. **Plan Structure**
   - Free tier with basic features
   - Pro tier with advanced features
   - Team tier for multiple users

2. **Visual Design**
   - Clean, modern layout
   - Popular plan highlight
   - Feature checkmarks
   - Responsive grid

3. **Call-to-Action**
   - Clear CTAs for each plan
   - Direct links to signup
   - Plan-specific parameters

4. **Trust Elements**
   - Money-back guarantee
   - Transparent pricing
   - Feature comparison

## Dependencies

Make sure to install required packages:

```bash
npm install lucide-react
```

## Next Steps

1. Implement Stripe checkout
2. Add subscription management
3. Create team plan features
4. Set up contact form for team sales 