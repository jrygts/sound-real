# 🛠 OAuth Redirect Fix - Environment Variables Checklist

## ✅ Code Changes Applied

1. **Runtime Guard Added**: `lib/ensureSiteUrl.ts` - Prevents localhost in production
2. **Consistent Environment Variables**: Standardized on `NEXT_PUBLIC_SITE_URL`
3. **Hard-coded localhost References**: Fixed with proper fallbacks

## 📋 Required Environment Variables

### 🚀 PRODUCTION Environment (Vercel)

```bash
# Site Configuration
NEXT_PUBLIC_SITE_URL=https://sound-real.com

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=<your-prod-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-prod-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-prod-service-role-key>

# Stripe Configuration (LIVE KEYS)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OpenAI Configuration
OPENAI_API_KEY=<your-openai-key>

# Email Configuration
RESEND_API_KEY=<your-resend-key>

# Admin Configuration (optional)
NEXT_PUBLIC_ADMIN_EMAILS=your-email@example.com
NEXT_PUBLIC_ADMIN_USER_IDS=<your-user-id>
```

### 🔍 PREVIEW Environment (Vercel)

```bash
# Site Configuration (use your preview domain)
NEXT_PUBLIC_SITE_URL=https://sound-real-preview.vercel.app

# Supabase Configuration (same as prod or separate staging)
NEXT_PUBLIC_SUPABASE_URL=<your-staging-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-staging-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-staging-service-role-key>

# Stripe Configuration (TEST KEYS for preview)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Other keys (same as production)
OPENAI_API_KEY=<your-openai-key>
RESEND_API_KEY=<your-resend-key>
NEXT_PUBLIC_ADMIN_EMAILS=your-email@example.com
NEXT_PUBLIC_ADMIN_USER_IDS=<your-user-id>
```

## 🔧 Supabase Configuration

### 1. Production Supabase Settings

**Auth → URL Configuration:**
- **Site URL**: `https://sound-real.com`
- **Redirect URLs**: 
  - `https://sound-real.com/auth/*`
  - `https://sound-real.com/auth/post-login`

### 2. Preview/Staging Supabase Settings

**Auth → URL Configuration:**
- **Site URL**: `https://your-preview-domain.vercel.app`
- **Redirect URLs**: 
  - `https://your-preview-domain.vercel.app/auth/*`
  - `https://your-preview-domain.vercel.app/auth/post-login`

## 🚀 Deployment Steps

### 1. Vercel Environment Variables

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Add all the **Production** variables above for the **Production** environment
3. Add all the **Preview** variables above for the **Preview** environment
4. **Important**: Make sure `NEXT_PUBLIC_SITE_URL` is set correctly for each environment

### 2. Vercel Deployment

1. **Redeploy** your application from Vercel dashboard or push to main branch
2. The runtime guard will now prevent localhost URLs in production
3. All OAuth redirects will use the correct domain

### 3. Testing Checklist

**After deployment, test these scenarios:**

- [ ] **Production OAuth Flow**:
  - Visit `https://sound-real.com` in incognito mode
  - Click "Sign in with Google"
  - Verify redirect goes to `https://sound-real.com/auth/post-login`
  - Check Network tab - no requests to localhost:3000
  
- [ ] **Preview OAuth Flow**:
  - Visit your preview URL in incognito mode
  - Complete OAuth flow
  - Verify redirect stays on preview domain
  
- [ ] **Stripe Customer Portal**:
  - Test the billing/customer portal redirect
  - Should return to `https://sound-real.com/dashboard/billing`

## 🔍 Debugging

### If OAuth still redirects to localhost:

1. **Check Vercel Environment Variables**: Ensure `NEXT_PUBLIC_SITE_URL` is set correctly
2. **Check Supabase Auth Settings**: Verify Site URL and Redirect URLs match your domain
3. **Clear Browser Cache**: OAuth providers cache redirect URLs
4. **Check Runtime Guard**: Should throw error if localhost detected in production

### Console Commands for Testing

```bash
# Test environment variables are loaded correctly
curl -I https://sound-real.com/api/debug/stripe

# Test usage API (should not hit localhost)
curl https://sound-real.com/api/subscription/usage
```

## 📞 Support

If you continue to have issues:

1. Check Vercel deployment logs for runtime guard errors
2. Verify all environment variables are set in Vercel dashboard
3. Test in incognito mode to avoid cached redirects
4. Check Supabase Auth logs for redirect attempts

---

**Summary**: This fix ensures all OAuth flows redirect to the correct production domain by using consistent environment variables and adding production guards against localhost references. 