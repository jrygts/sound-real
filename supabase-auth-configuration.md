# Supabase Auth Security Configuration

This guide covers the essential Supabase Auth security settings that need to be configured in your Supabase Dashboard.

## 1. Magic Link / OTP Expiration Settings

Navigate to **Authentication > Settings** in your Supabase Dashboard and configure:

### Email Auth Settings
```
Magic link expiry: 15 minutes (900 seconds)
OTP expiry: 15 minutes (900 seconds)
```

**Why this matters:** Default expiration times are often too long (1 hour), creating security vulnerabilities. 15 minutes provides a good balance between security and user experience.

### How to Configure:
1. Go to your Supabase Dashboard
2. Navigate to **Authentication > Settings**
3. Scroll to **Auth Settings**
4. Set **Magic link expiry** to `900` (seconds)
5. Set **OTP expiry** to `900` (seconds)
6. Click **Save**

## 2. Leaked Password Protection

Enable this feature to prevent users from choosing passwords that have been compromised in known data breaches.

### Configuration:
```
Enable Leaked Password Protection: ON
```

### How to Configure:
1. In **Authentication > Settings**
2. Find **Security Settings**
3. Toggle **Enable Leaked Password Protection** to ON
4. Click **Save**

## 3. Additional Recommended Security Settings

### Session Settings
```
JWT expiry: 3600 seconds (1 hour)
Refresh token rotation: Enabled
```

### Password Requirements
```
Minimum password length: 8 characters
Require special characters: Enabled
Require numbers: Enabled
Require uppercase letters: Enabled
```

### Rate Limiting
```
Email signup rate limit: 10 per hour per IP
Password reset rate limit: 5 per hour per IP
```

## 4. Environment Variables

Ensure these are set in your `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

## 5. Verification Checklist

After applying these settings, verify:

- [ ] Magic link expiry set to 15 minutes
- [ ] OTP expiry set to 15 minutes  
- [ ] Leaked password protection enabled
- [ ] Password requirements configured
- [ ] Rate limiting enabled
- [ ] Environment variables set correctly

## 6. Testing

Test the configuration:

1. **Magic Link Expiry**: Send a magic link and wait 16 minutes - it should be expired
2. **Leaked Password Protection**: Try to sign up with a common password like "password123" - it should be rejected
3. **Rate Limiting**: Attempt multiple signups rapidly - they should be rate limited

## Security Notes

- Always use HTTPS in production
- Regularly rotate your service role keys
- Monitor authentication logs for suspicious activity
- Consider implementing 2FA for admin accounts
- Keep Supabase and all dependencies updated

## Support

If you encounter issues with these settings:
1. Check the Supabase Dashboard logs
2. Verify your environment variables
3. Test in an incognito/private browser window
4. Consult the Supabase documentation 