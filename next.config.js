/** @type {import('next').NextConfig} */

// Check environment variables only in development or when starting the server
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production') {
  try {
    require('./lib/checkEnv');
  } catch (e) {
    // Skip env check during build/lint phases
  }
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      // NextJS <Image> component needs to whitelist domains for src={}
      "lh3.googleusercontent.com",
      "pbs.twimg.com",
      "images.unsplash.com",
      "logos-world.net",
    ],
  },
  env: { 
    NEXT_PUBLIC_SITE_URL: SITE 
  },
};

module.exports = nextConfig;
