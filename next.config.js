/** @type {import('next').NextConfig} */
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
