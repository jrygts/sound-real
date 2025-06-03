# Step 10: Landing Page Variations

## Overview

Creating multiple landing page variations allows for A/B testing and targeting different user segments. Each variation maintains the core functionality while adapting the messaging and design for specific audiences.

## Implementation

Create `app/lp/[variant]/page.tsx`:

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, Zap, Shield, Clock } from 'lucide-react'

const variants = {
  students: {
    headline: 'Make Your Essays Undetectable',
    subheadline: 'Transform AI-generated essays into authentic student writing',
    cta: 'Humanize My Essay',
    features: [
      'Bypass Turnitin detection',
      'Maintain academic integrity',
      'Save hours of editing',
      'Get better grades',
    ],
  },
  professionals: {
    headline: 'Professional AI Text Humanizer',
    subheadline: 'Create authentic business content that maintains your voice',
    cta: 'Start Writing Naturally',
    features: [
      'Bypass AI detection tools',
      'Maintain brand voice',
      'Save time on editing',
      'Improve content quality',
    ],
  },
  writers: {
    headline: 'AI Writing That Sounds Like You',
    subheadline: 'Maintain your unique writing style while using AI assistance',
    cta: 'Transform Your Writing',
    features: [
      'Preserve your voice',
      'Bypass AI detectors',
      'Save editing time',
      'Improve readability',
    ],
  },
}

export default function LandingPageVariant({ params }: { params: { variant: string } }) {
  const router = useRouter()
  const variant = variants[params.variant as keyof typeof variants] || variants.students

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
            {variant.headline}
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            {variant.subheadline}
          </p>
          
          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              <span className="text-slate-700">Instant Results</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500" />
              <span className="text-slate-700">100% Undetectable</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <span className="text-slate-700">Save Hours Daily</span>
            </div>
          </div>
        </div>

        {/* Main Interface */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 md:p-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Features */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Why Choose SoundReal?
              </h2>
              <ul className="space-y-4">
                {variant.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA Section */}
            <div className="bg-slate-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">
                Ready to Get Started?
              </h3>
              <p className="text-slate-600 mb-6">
                Join thousands of users who trust SoundReal for their content needs.
              </p>
              <button
                onClick={() => router.push('/signup')}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                {variant.cta}
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-center text-sm text-slate-500 mt-4">
                Free trial available • No credit card required
              </p>
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">
            Trusted by Thousands
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-slate-600 mb-4">
                "SoundReal has been a game-changer for my academic writing. It's like having a professional editor at your fingertips."
              </p>
              <p className="font-medium text-slate-900">Sarah M.</p>
              <p className="text-sm text-slate-500">Graduate Student</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-slate-600 mb-4">
                "The quality of our content has improved significantly since we started using SoundReal. It's an essential tool for our team."
              </p>
              <p className="font-medium text-slate-900">Michael R.</p>
              <p className="text-sm text-slate-500">Content Director</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-slate-600 mb-4">
                "As a freelance writer, SoundReal helps me maintain my unique voice while leveraging AI tools. Highly recommended!"
              </p>
              <p className="font-medium text-slate-900">Emma L.</p>
              <p className="text-sm text-slate-500">Freelance Writer</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

## Key Features

1. **Audience-Specific Content**
   - Students: Focus on academic integrity
   - Professionals: Emphasis on brand voice
   - Writers: Highlight style preservation

2. **Dynamic Messaging**
   - Custom headlines
   - Targeted subheadlines
   - Relevant CTAs
   - Audience-specific features

3. **Social Proof**
   - Testimonials by audience
   - Role-based credibility
   - Real-world examples
   - Trust indicators

4. **Conversion Optimization**
   - Clear value proposition
   - Strong CTAs
   - Trust badges
   - Free trial offer

## Implementation Notes

1. **URL Structure**
   - `/lp/students`
   - `/lp/professionals`
   - `/lp/writers`

2. **Analytics Setup**
   - Track conversion rates
   - Monitor user behavior
   - A/B test variations
   - Measure engagement

3. **Content Strategy**
   - Regular updates
   - Performance tracking
   - User feedback
   - Continuous optimization

## Next Steps

1. Set up A/B testing
2. Implement analytics tracking
3. Create more variations
4. Add dynamic content loading 