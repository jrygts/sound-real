# Stripe Setup Guide for SaaS Application

## Prerequisites
- A Stripe account (if you don't have one, sign up at https://dashboard.stripe.com/register)
- Your business details ready (legal name, address, tax information)
- A domain name for your webhook endpoints
- Development environment ready for testing

## Step 1: Initial Stripe Account Setup

1. Log in to your Stripe Dashboard
2. Complete your business profile:
   - Go to Settings → Business settings
   - Fill in your business details
   - Add your bank account for payouts
   - Verify your identity if required

## Step 2: Product & Price Configuration

1. Create Products:
   - Go to Products → Add Product
   - Create "Basic Plan":
     - Name: "Basic Plan"
     - Description: "Essential features for beginners"
     - Price: $6.99/month (recurring)
     - Billing period: Monthly
     - Save the Product ID: `prod_SRAbr1xRqxZcBV`

   - Create "Plus Plan":
     - Name: "Plus Plan"
     - Description: "Enhanced features for growing users"
     - Price: $19.99/month (recurring)
     - Billing period: Monthly
     - Save the Product ID: `prod_SRAcIrVMMoOwJO`

   - Create "Pro Plan":
     - Name: "Pro Plan"
     - Description: "Advanced features for professionals"
     - Price: $39.99/month (recurring)
     - Billing period: Monthly
     - Save the Product ID: `prod_SRAdsgqPORiZkI`

2. Save these Price IDs:
   - Basic Plan Price ID: `price_1RWIGTR2giDQL8gT2b4fgQeD`
   - Plus Plan Price ID: `price_1RWIH9R2giDQL8gTtQ0SIOlM`
   - Pro Plan Price ID: `price_1RWIHvR2giDQL8gTI17qjZmD`

## Step 3: API Keys & Configuration

1. Get your API keys:
   - Go to Developers → API keys
   - Save these values:
     ```
     STRIPE_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXX
     STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXX
     STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXX
     ```

2. Enable test mode:
   - Toggle "Test mode" in the Stripe Dashboard
   - Use these test card numbers:
     - Success: 4242 4242 4242 4242
     - Decline: 4000 0000 0000 0002
     - Expiry: Any future date
     - CVC: Any 3 digits

## Step 4: Webhook Configuration

1. Set up webhook endpoints:
   - Go to Developers → Webhooks
   - Add endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Select events to listen for:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`

2. Save the webhook signing secret:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXX
   ```

## Step 5: Security Checklist

- [ ] Enable 2FA on your Stripe account
- [ ] Set up IP restrictions for API access
- [ ] Configure webhook retry settings
- [ ] Set up error notifications
- [ ] Review PCI compliance requirements
- [ ] Set up fraud prevention rules
- [ ] Configure automatic tax calculation
- [ ] Set up proper error handling in your application

## Step 6: Development Testing

1. Test card numbers:
   ```
   Success: 4242 4242 4242 4242
   Decline: 4000 0000 0000 0002
   Expiry: Any future date
   CVC: Any 3 digits
   ```

2. Test webhook events:
   - Use the Stripe CLI for local testing
   - Command: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

## Information Needed for Integration

Please provide the following information after completing the setup:

1. API Keys:
   ```
   STRIPE_PUBLISHABLE_KEY=
   STRIPE_SECRET_KEY=
   STRIPE_WEBHOOK_SECRET=
   ```

2. Product & Price IDs:
   ```
   BASIC_PLAN_PRICE_ID=
   PLUS_PLAN_PRICE_ID=
   PRO_PLAN_PRICE_ID=
   ```

3. Webhook URL:
   ```
   WEBHOOK_URL=
   ```

4. Test Mode Status:
   ```
   TEST_MODE_ENABLED=true/false
   ```

## Common Troubleshooting

1. Webhook Issues:
   - Verify webhook URL is accessible
   - Check webhook signing secret
   - Ensure proper event selection
   - Test with Stripe CLI locally

2. Payment Issues:
   - Verify card details
   - Check currency settings
   - Ensure proper error handling
   - Test with different card scenarios

3. Subscription Issues:
   - Verify product/price IDs
   - Check subscription status
   - Ensure proper webhook handling
   - Test subscription lifecycle

## Next Steps

After providing the required information, we will:
1. Set up the Stripe client in your application
2. Implement subscription management
3. Add webhook handlers
4. Set up admin bypass functionality
5. Implement proper error handling
6. Add subscription status checks
7. Set up proper logging and monitoring

## Security Notes

- Never commit API keys to version control
- Use environment variables for all sensitive data
- Implement proper error handling
- Set up monitoring for failed payments
- Regular security audits
- Keep Stripe SDK updated
- Implement proper logging
- Set up alerts for suspicious activities

## Support Resources

- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- Stripe Status: https://status.stripe.com
- Stripe API Reference: https://stripe.com/docs/api 