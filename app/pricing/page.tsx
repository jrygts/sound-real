"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PLAN_CONFIGS } from "@/libs/stripe/plans";
import { createClient } from "@/libs/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase.auth]);

  async function handleSubscribe(priceId: string, planName: string) {
    if (!user) {
      router.push('/auth');
      return;
    }

    setLoading(priceId);
    
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/dashboard`,
          cancelUrl: `${window.location.origin}/pricing`,
          mode: "subscription",
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform AI text into natural, human-like content that bypasses detection and engages readers.
          </p>
        </div>

        <section className="mx-auto max-w-6xl grid gap-8 md:grid-cols-3">
          {Object.values(PLAN_CONFIGS).map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative flex flex-col ${
                plan.name === "Plus" ? "md:-translate-y-2 shadow-lg border-primary" : ""
              }`}
            >
              {plan.name === "Plus" && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">${plan.amount / 100}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 space-y-6">
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>{plan.words.toLocaleString()} words per month</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>{plan.tx.toLocaleString()} transformations per month</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Advanced AI detection bypass</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Priority support</span>
                  </li>
                  {plan.name === "Ultra" && (
                    <li className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>API access (coming soon)</span>
                    </li>
                  )}
                </ul>
                
                <div className="pt-4">
                  <Button
                    onClick={() => handleSubscribe(plan.priceId, plan.name)}
                    disabled={loading === plan.priceId}
                    className={`w-full ${
                      plan.name === "Plus" 
                        ? "bg-primary hover:bg-primary/90" 
                        : "bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                    }`}
                  >
                    {loading === plan.priceId ? "Loading..." : `Choose ${plan.name}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
        
        <div className="text-center mt-16">
          <p className="text-muted-foreground">
            All plans include a 7-day money-back guarantee. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
} 