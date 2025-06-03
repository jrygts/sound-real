# Step 2: Environment Setup

## Required Environment Variables

Add the following variables to your `.env.local` file:

```bash
# OpenAI API Key for text transformation
OPENAI_API_KEY=your_openai_api_key

# Stripe Price ID for monthly subscription
NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY=price_xxxxx

# Your application URL
NEXT_PUBLIC_APP_URL=https://sound-real.com
```

## Environment Variables Explanation

1. **OPENAI_API_KEY**
   - Required for the text transformation service
   - Used to access GPT-4 for humanizing text
   - Keep this secure and never expose it client-side

2. **NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY**
   - Your Stripe price ID for the monthly subscription
   - Used in the pricing page and checkout flow
   - Must be prefixed with `NEXT_PUBLIC_` as it's used client-side

3. **NEXT_PUBLIC_APP_URL**
   - Your application's base URL
   - Used for generating absolute URLs
   - Important for webhooks and redirects

## Security Notes

- Never commit `.env.local` to version control
- Keep API keys secure and rotate them periodically
- Use environment-specific variables for development/staging/production 