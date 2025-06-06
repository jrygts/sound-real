// Runtime guard to prevent localhost URLs in production
if (process.env.NODE_ENV === "production") {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.toLowerCase();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.toLowerCase();
  
  // Check NEXT_PUBLIC_SITE_URL (primary)
  if (!siteUrl?.startsWith("https://sound-real.com")) {
    throw new Error(
      `❌ NEXT_PUBLIC_SITE_URL mis-configured in production: ${siteUrl || 'undefined'}`
    );
  }
  
  // Check NEXT_PUBLIC_APP_URL if it exists (should match SITE_URL)
  if (appUrl && !appUrl.startsWith("https://sound-real.com")) {
    throw new Error(
      `❌ NEXT_PUBLIC_APP_URL mis-configured in production: ${appUrl}`
    );
  }
  
  console.log("✅ [Production] Site URL validation passed:", siteUrl);
} 