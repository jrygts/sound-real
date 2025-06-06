// Copy and run this in your browser console for easy environment variable reference
console.table({
  REQUIRED_PROD_VARS: {
    NEXT_PUBLIC_SITE_URL: "https://sound-real.com",
    NEXT_PUBLIC_SUPABASE_URL: "<prod-supabase-url>",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "<prod-anon-key>",
    SUPABASE_SERVICE_ROLE_KEY: "<prod-service-role-key>",
    STRIPE_SECRET_KEY: "sk_live_...",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_...",
    STRIPE_WEBHOOK_SECRET: "whsec_...",
    OPENAI_API_KEY: "<your-openai-key>",
    RESEND_API_KEY: "<your-resend-key>",
    NEXT_PUBLIC_ADMIN_EMAILS: "your-email@example.com",
    NEXT_PUBLIC_ADMIN_USER_IDS: "<your-user-id>"
  },
  REQUIRED_PREVIEW_VARS: {
    NEXT_PUBLIC_SITE_URL: "https://sound-real-preview.vercel.app",
    NEXT_PUBLIC_SUPABASE_URL: "<staging-supabase-url>",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "<staging-anon-key>",
    SUPABASE_SERVICE_ROLE_KEY: "<staging-service-role-key>",
    STRIPE_SECRET_KEY: "sk_test_...",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_...",
    STRIPE_WEBHOOK_SECRET: "whsec_...",
    OPENAI_API_KEY: "<your-openai-key>",
    RESEND_API_KEY: "<your-resend-key>",
    NEXT_PUBLIC_ADMIN_EMAILS: "your-email@example.com",
    NEXT_PUBLIC_ADMIN_USER_IDS: "<your-user-id>"
  }
});

/*  Instructions (automatic comment):
After Cursor applies the code fixes:
1. In the Supabase dashboard → Auth → URL Configuration
   – Site URL → https://sound-real.com
   – Redirect URLs → https://sound-real.com/auth/*
2. In Vercel → Project Settings → Environment Variables
   – add/override NEXT_PUBLIC_SITE_URL (Production & Preview)
3. Redeploy (Vercel will rebuild with correct env).
4. Open sound-real.com in Incognito, complete Google OAuth:
   – Should redirect to https://sound-real.com/dashboard/humanize
   (verify via Network tab that no request hits localhost).
*/ 