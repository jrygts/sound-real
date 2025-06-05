'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useState } from 'react'
import { AppHeader } from "@/components/shared/header"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { GradientButton } from "@/components/gradient-button"
import { Check, Zap, Shield, Gem } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { cn } from "@/lib/utils"
import { soundrealBlue } from "@/lib/theme"
import { toast } from "sonner"

const plans = [
  {
    name: "Basic",
    icon: <Zap className="h-6 w-6 text-soundrealBlue" />,
    priceMonthly: 6.99,
    description: "Perfect for occasional use and trying out SoundReal.",
    features: ["5,000 words/month", "200 transformations/month", "Standard processing", "Community support"],
    wordLimit: 5000,
    transformationLimit: 200,
    cta: "Get Started with Basic",
    stripeLink: "/api/stripe/create-checkout?priceId=price_1RWIGTR2giDQL8gT2b4fgQeD"
  },
  {
    name: "Plus",
    icon: <Shield className="h-6 w-6 text-soundrealBlue" />,
    priceMonthly: 19.99,
    description: "Ideal for regular users and small content teams.",
    features: [
      "15,000 words/month",
      "600 transformations/month",
      "Priority processing",
      "Email support",
      "Early access to new features",
    ],
    wordLimit: 15000,
    transformationLimit: 600,
    isMostPopular: true,
    cta: "Choose Plus Plan",
    stripeLink: "/api/stripe/create-checkout?priceId=price_1RWIH9R2giDQL8gTtQ0SIOlM"
  },
  {
    name: "Ultra",
    icon: <Gem className="h-6 w-6 text-soundrealBlue" />,
    priceMonthly: 39.99,
    description: "For power users and agencies with high volume needs.",
    features: [
      "35,000 words/month",
      "1,200 transformations/month",
      "Highest priority processing",
      "Dedicated account manager",
      "API Access (soon)",
    ],
    wordLimit: 35000,
    transformationLimit: 1200,
    cta: "Go Ultra",
    stripeLink: "/api/stripe/create-checkout?priceId=price_1RWIHvR2giDQL8gTI17qjZmD"
  },
]

const ProgressRing = ({
  value,
  limit,
  label,
  color,
}: { value: number; limit: number; label: string; color: string }) => {
  const isUnlimited = limit === Number.POSITIVE_INFINITY
  const percentage = isUnlimited ? 100 : Math.min((value / limit) * 100, 100)
  const data = [
    { name: "Used", value: percentage, fill: color },
    { name: "Remaining", value: 100 - percentage, fill: "hsl(var(--muted))" },
  ]

  return (
    <div className="w-24 h-24 mx-auto">
      <ChartContainer config={{}} className="aspect-square h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="70%"
              outerRadius="100%"
              startAngle={90}
              endAngle={450}
              cy="50%"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold font-mono">{isUnlimited ? "∞" : value.toLocaleString()}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

function PricingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isAnnual, setIsAnnual] = useState(false)
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null)
  
  const intent = searchParams.get('intent')
  const wasPreview = searchParams.get('preview')
  const isAuthenticated = searchParams.get('authenticated')
  const converted = searchParams.get('converted')

  // Dummy usage data for progress rings
  const usageData = {
    Basic: { words: 2300, transformations: 150 },
    Plus: { words: 8500, transformations: 380 },
    Ultra: { words: 25000, transformations: 800 },
  }

  const getHeadlineMessage = () => {
    if (converted === 'true') {
      return "🔥 Complete Your Transformation - Unlimited Access Awaits"
    } else if (wasPreview === 'true') {
      return "✨ You've Seen the Power - Now Get Full Access"
    } else if (intent === 'transform') {
      return "⚡ Transform Your AI Text Right Now"
    } else {
      return "Find the Perfect Plan"
    }
  }

  const getSubheadline = () => {
    if (converted === 'true') {
      return "Unlock the complete transformation you just previewed + unlimited processing"
    } else if (wasPreview === 'true') {
      return "Complete your transformation and unlock unlimited processing power"
    } else if (intent === 'transform') {
      return "Join 2,847+ users transforming AI text into human-sounding content"
    } else {
      return "Choose the plan that fits your needs and start transforming your content today. No hidden fees, cancel anytime."
    }
  }

  const getUrgencyBanner = () => {
    if (wasPreview === 'true' || converted === 'true') {
      return (
        <div className="bg-gradient-to-r from-soundrealBlue to-blue-400 text-primary-foreground py-3 px-4 text-center">
          <p className="font-medium">
            🎯 <strong>Your preview is waiting!</strong> Complete your transformation with unlimited access
          </p>
        </div>
      )
    } else if (intent === 'transform') {
      return (
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 text-center">
          <p className="font-medium">
            ⚡ <strong>Ready to transform?</strong> Join 2,847+ users saving hours daily
          </p>
        </div>
      )
    }
    return null
  }

  const handleStripeCheckout = (plan: typeof plans[0]) => {
    if (plan.stripeLink) {
      window.location.href = plan.stripeLink
    } else {
      toast.info(`Proceeding to checkout for ${plan.name}... (Stripe integration needed)`)
    }
  }

  return (
    <>
      <div className="flex flex-col min-h-screen">
        <AppHeader />
        {getUrgencyBanner()}
        <main className="flex-grow py-12 md:py-20 bg-muted/30 dark:bg-background">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12 md:mb-16">
              <h1 className="text-4xl font-heading sm:text-5xl font-bold mb-4">{getHeadlineMessage()}</h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                {getSubheadline()}
              </p>

              {/* Enhanced social proof for high-intent traffic */}
              {(wasPreview === 'true' || intent === 'transform') && (
                <Card className="max-w-2xl mx-auto mb-8">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-soundrealBlue">2,847+</div>
                        <div className="text-muted-foreground">Happy Users</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">10hrs</div>
                        <div className="text-muted-foreground">Saved Weekly</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">99.9%</div>
                        <div className="text-muted-foreground">Success Rate</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex items-center justify-center space-x-2 mt-8">
                <Label htmlFor="billing-cycle">Monthly</Label>
                <Switch
                  id="billing-cycle"
                  checked={isAnnual}
                  onCheckedChange={setIsAnnual}
                  aria-label="Toggle billing cycle between monthly and annual"
                />
                <Label htmlFor="billing-cycle">
                  Annual (Save 20% <span className="text-xs text-soundrealBlue font-semibold">SOON</span>)
                </Label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
              {plans.map((plan) => {
                const price = isAnnual ? plan.priceMonthly * 12 * 0.8 : plan.priceMonthly
                const currentUsage = usageData[plan.name as keyof typeof usageData] || { words: 0, transformations: 0 }
                const showProgressRings = hoveredPlan === plan.name

                return (
                  <Card
                    key={plan.name}
                    className={cn(
                      "flex flex-col shadow-soft hover:shadow-soft-md transition-shadow duration-300 relative overflow-hidden",
                      plan.isMostPopular
                        ? "border-2 border-soundrealBlue dark:border-soundrealBlue/70 ring-4 ring-soundrealBlue/10"
                        : "",
                    )}
                    onMouseEnter={() => setHoveredPlan(plan.name)}
                    onMouseLeave={() => setHoveredPlan(null)}
                  >
                    {plan.isMostPopular && (
                      <div className="absolute top-0 right-0 bg-soundrealBlue text-primary-foreground text-xs font-semibold px-3 py-1 rounded-bl-lg">
                        Most Popular
                      </div>
                    )}
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3 mb-2">
                        {plan.icon}
                        <CardTitle className="text-2xl font-heading">{plan.name}</CardTitle>
                      </div>
                      <CardDescription className="min-h-[40px]">{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <div className="mb-6 text-center">
                        <span className="text-4xl font-bold font-mono">${price.toFixed(2)}</span>
                        <span className="text-muted-foreground">/month</span>
                        {isAnnual && plan.priceMonthly > 0 && (
                          <p className="text-xs text-soundrealBlue">
                            Billed ${(plan.priceMonthly * 12 * 0.8).toFixed(0)} annually
                          </p>
                        )}
                      </div>

                      {showProgressRings && plan.wordLimit > 0 ? (
                        <div className="grid grid-cols-2 gap-4 mb-6 min-h-[120px] items-center justify-center">
                          <div className="relative">
                            <ProgressRing
                              value={currentUsage.words}
                              limit={plan.wordLimit}
                              label="Words"
                              color={soundrealBlue}
                            />
                          </div>
                          <div className="relative">
                            <ProgressRing
                              value={currentUsage.transformations}
                              limit={plan.transformationLimit}
                              label="Transforms"
                              color="#8A85FF"
                            />
                          </div>
                        </div>
                      ) : (
                        <ul className="space-y-2 mb-6 min-h-[120px]">
                          {plan.features.map((feature) => (
                            <li key={feature} className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-500" />
                              <span className="text-sm">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                    <CardFooter>
                      <GradientButton
                        onClick={() => handleStripeCheckout(plan)}
                        className="w-full py-3 text-base"
                        variant={plan.isMostPopular ? "default" : "outline"}
                        aria-label={`Choose ${plan.name} plan`}
                      >
                        {plan.cta}
                      </GradientButton>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>

            {/* Extra conversion elements for high-intent traffic */}
            {(wasPreview === 'true' || intent === 'transform') && (
              <div className="mt-12 text-center">
                <Card className="max-w-3xl mx-auto">
                  <CardHeader>
                    <CardTitle className="text-2xl font-heading">
                      Why 2,847+ Users Choose SoundReal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <div className="text-soundrealBlue font-bold text-lg mb-2">⚡ Instant Results</div>
                        <p className="text-muted-foreground text-sm">
                          Transform any AI text in seconds, not hours of manual editing
                        </p>
                      </div>
                      <div>
                        <div className="text-green-600 font-bold text-lg mb-2">🛡️ 100% Undetectable</div>
                        <p className="text-muted-foreground text-sm">
                          Bypass all major AI detectors with our advanced algorithms
                        </p>
                      </div>
                      <div>
                        <div className="text-purple-600 font-bold text-lg mb-2">💰 Money-Back Guarantee</div>
                                                 <p className="text-muted-foreground text-sm">
                           30-day full refund if you&apos;re not completely satisfied
                         </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="mt-16 text-center">
              <p className="text-muted-foreground">
                Questions?{" "}
                <a href="/contact" className="text-soundrealBlue hover:underline">
                  Contact us
                </a>
                .
              </p>
            </div>
          </div>
        </main>
        <footer className="py-8 border-t">
          <div className="container text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} SoundReal. All rights reserved.
          </div>
        </footer>
      </div>
    </>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-soundrealBlue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading pricing options...</p>
        </div>
      </div>
    }>
      <PricingContent />
    </Suspense>
  )
} 