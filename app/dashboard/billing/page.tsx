"use client"

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

// TODO: Replace with actual data from your API
const billingData = {
  subscription: {
    plan: "Plus",
    status: "active",
    amount: 19.99,
    currency: "USD",
    interval: "month",
    currentPeriodStart: "2024-12-01",
    currentPeriodEnd: "2024-12-31",
    cancelAtPeriodEnd: false,
  },
  paymentMethod: {
    type: "card",
    brand: "visa",
    last4: "4242",
    expiryMonth: 12,
    expiryYear: 2025,
  },
  invoices: [
    {
      id: "inv_123",
      date: "2024-12-01",
      amount: 19.99,
      status: "paid",
      description: "Plus Plan - December 2024",
      downloadUrl: "#",
    },
    {
      id: "inv_122",
      date: "2024-11-01", 
      amount: 19.99,
      status: "paid",
      description: "Plus Plan - November 2024",
      downloadUrl: "#",
    },
    {
      id: "inv_121",
      date: "2024-10-01",
      amount: 19.99,
      status: "paid", 
      description: "Plus Plan - October 2024",
      downloadUrl: "#",
    },
  ]
}

export default function BillingPage() {
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
            {getStatusBadge(billingData.subscription.status)}
          </CardTitle>
          <CardDescription>
            Your active plan and billing information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-semibold text-lg mb-2">{billingData.subscription.plan} Plan</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-mono">
                    ${billingData.subscription.amount}/{billingData.subscription.interval}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Billing Period:</span>
                  <span>
                    {formatDate(billingData.subscription.currentPeriodStart)} - {formatDate(billingData.subscription.currentPeriodEnd)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Auto-renew:</span>
                  <span>{billingData.subscription.cancelAtPeriodEnd ? "Disabled" : "Enabled"}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <GradientButton asChild>
                <Link href="/pricing">
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Upgrade Plan
                </Link>
              </GradientButton>
              <Button variant="outline" className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Manage Subscription
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
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
                {billingData.paymentMethod.brand.toUpperCase()}
              </div>
              <div>
                <p className="font-medium">•••• •••• •••• {billingData.paymentMethod.last4}</p>
                <p className="text-sm text-muted-foreground">
                  Expires {billingData.paymentMethod.expiryMonth}/{billingData.paymentMethod.expiryYear}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <CreditCard className="h-4 w-4 mr-2" />
              Update
            </Button>
          </div>
        </CardContent>
      </Card>

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
            {billingData.invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{invoice.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(invoice.date)} • Invoice #{invoice.id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="font-bold">${invoice.amount}</p>
                    <Badge variant={invoice.status === 'paid' ? 'default' : 'destructive'} className="text-xs">
                      {invoice.status}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={invoice.downloadUrl} download>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            ))}
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