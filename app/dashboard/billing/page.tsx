"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GradientButton } from "@/components/gradient-button"
import { 
  CreditCard, 
  Download, 
  Calendar, 
  ArrowUpRight, 
  CheckCircle, 
  AlertCircle,
  DollarSign 
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/libs/supabase/client"
import { PLAN_CONFIGS, type PlanKey } from "@/libs/stripe/plans"

export default function BillingPage() {
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        // Fetch subscription status
        const response = await fetch('/api/subscription/status')
        if (response.ok) {
          const data = await response.json()
          setSubscription(data)
        }
      } catch (error) {
        console.error('Failed to fetch billing data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBillingData()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>
      case 'past_due':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Past Due</Badge>
      case 'canceled':
        return <Badge variant="secondary">Canceled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-semibold">Billing & Subscription</h1>
          <p className="text-muted-foreground">
            Manage your subscription, payment methods, and billing history.
          </p>
        </div>
        <div className="flex items-center justify-center py-8">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-semibold">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription, payment methods, and billing history.
        </p>
      </div>

      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Current Subscription</span>
            {subscription?.status && getStatusBadge(subscription.status)}
          </CardTitle>
          <CardDescription>
            Your active plan and billing information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              {subscription ? (
                <>
                  <h3 className="font-semibold text-lg mb-2">
                    {subscription.plan_name} Plan
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-mono">
                        ${(subscription.amount / 100).toFixed(2)}/{subscription.interval || 'month'}
                      </span>
                    </div>
                    {subscription.current_period_start && subscription.current_period_end && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Billing Period:</span>
                        <span>
                          {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Auto-renew:</span>
                      <span>{subscription.cancel_at_period_end ? "Disabled" : "Enabled"}</span>
                    </div>
                    
                    {/* Show plan features */}
                    {PLAN_CONFIGS[subscription.plan_name as PlanKey] && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Plan includes:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• {PLAN_CONFIGS[subscription.plan_name as PlanKey].words.toLocaleString()} words/month</li>
                          <li>• {PLAN_CONFIGS[subscription.plan_name as PlanKey].tx.toLocaleString()} transformations/month</li>
                          <li>• Advanced AI detection bypass</li>
                          <li>• Priority support</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h3 className="font-semibold text-lg mb-2">Free Trial</h3>
                  <p className="text-sm text-muted-foreground">You don&apos;t have an active subscription.</p>
                </>
              )}
            </div>
            
            <div className="space-y-3">
              <GradientButton asChild>
                <Link href="/pricing">
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  {subscription?.status === 'active' ? 'Upgrade Plan' : 'Choose Plan'}
                </Link>
              </GradientButton>
              {subscription && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/stripe/customer-portal", { method: "POST" });
                      if (res.ok) {
                        const { url } = await res.json();
                        window.location.href = url;
                      } else {
                        alert("Failed to open customer portal. Please try again.");
                      }
                    } catch (error) {
                      console.error("Portal error:", error);
                      alert("Failed to open customer portal. Please try again.");
                    }
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Manage Subscription
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      {subscription?.payment_method && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>
              Your default payment method for subscription charges.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-6 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center text-white text-xs font-bold">
                  {subscription.payment_method.brand?.toUpperCase() || 'CARD'}
                </div>
                <div>
                  <p className="font-medium">•••• •••• •••• {subscription.payment_method.last4}</p>
                  <p className="text-sm text-muted-foreground">
                    Expires {subscription.payment_method.exp_month}/{subscription.payment_method.exp_year}
                  </p>
                </div>
              </div>
              {subscription && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/stripe/customer-portal", { method: "POST" });
                      if (res.ok) {
                        const { url } = await res.json();
                        window.location.href = url;
                      }
                    } catch (error) {
                      console.error("Portal error:", error);
                    }
                  }}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Update
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            Download receipts and view your payment history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {subscription?.invoices && subscription.invoices.length > 0 ? (
              subscription.invoices.map((invoice: any) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{invoice.description || `${subscription.plan_name} Plan`}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(invoice.created * 1000).toLocaleDateString()} • Invoice #{invoice.number || invoice.id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="font-bold">${(invoice.amount_paid / 100).toFixed(2)}</p>
                      <Badge variant={invoice.status === 'paid' ? 'default' : 'destructive'} className="text-xs">
                        {invoice.status}
                      </Badge>
                    </div>
                    {invoice.invoice_pdf && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={invoice.invoice_pdf} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No billing history available.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Support */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            Contact our support team for billing questions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="outline" className="justify-start">
                <span>📧</span>
                <span className="ml-2">Email Support</span>
              </Button>
              <Button variant="outline" className="justify-start">
                <span>💬</span>
                <span className="ml-2">Live Chat</span>
              </Button>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> Billing changes take effect at the start of your next billing cycle. 
                Downgrades and cancellations will be processed at the end of your current period.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 