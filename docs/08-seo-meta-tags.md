# Step 8: SEO and Meta Tags Setup

## Overview

Proper SEO implementation is crucial for organic traffic. This step covers the setup of meta tags, sitemap, and other SEO-related configurations.

## Root Layout Configuration

Update `app/layout.tsx`:

```typescript
export const metadata = {
  title: 'SoundReal - Make AI Text Sound Human | AI Humanizer',
  description: 'Transform AI-generated content into natural, human-sounding text that bypasses AI detectors. Free AI humanizer tool with instant results.',
  keywords: 'ai humanizer, make ai text human, bypass ai detector, chatgpt humanizer, ai to human text, undetectable ai',
  openGraph: {
    title: 'SoundReal - Make AI Text Sound Human',
    description: 'Transform AI content into natural human text instantly',
    url: 'https://sound-real.com',
    siteName: 'SoundReal',
    images: [
      {
        url: 'https://sound-real.com/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SoundReal - Make AI Text Sound Human',
    description: 'Transform AI content into natural human text instantly',
    images: ['https://sound-real.com/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}
```

## Sitemap Configuration

Create or update `next-sitemap.config.js`:

```javascript
/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://sound-real.com',
  generateRobotsTxt: true,
  sitemapSize: 7000,
  changefreq: 'daily',
  priority: 0.7,
  exclude: ['/admin/*', '/api/*'],
  robotsTxtOptions: {
    additionalSitemaps: [
      'https://sound-real.com/server-sitemap.xml',
    ],
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/*', '/admin/*'],
      },
    ],
  },
}
```

## Robots.txt

Create `public/robots.txt`:

```txt
# Allow all crawlers
User-agent: *
Allow: /

# Disallow admin and API routes
Disallow: /admin/
Disallow: /api/

# Sitemap
Sitemap: https://sound-real.com/sitemap.xml
```

## Schema Markup

Add schema markup to your homepage (`app/page.tsx`):

```typescript
// Add this inside your page component
const schema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'SoundReal',
  applicationCategory: 'Text Editor',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '9.97',
    priceCurrency: 'USD'
  },
  description: 'Transform AI-generated content into natural, human-sounding text that bypasses AI detectors.',
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '1250'
  }
}

// Add this in your page's head
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
/>
```

## Key Features

1. **Meta Tags**
   - Title and description
   - OpenGraph tags
   - Twitter cards
   - Keywords

2. **Sitemap**
   - Automatic generation
   - Priority settings
   - Change frequency
   - Exclusion rules

3. **Schema Markup**
   - Software application type
   - Pricing information
   - Ratings
   - Operating system

4. **Robots.txt**
   - Crawler directives
   - Sitemap location
   - Protected routes
   - Allow/Disallow rules

## Implementation Notes

1. **Meta Tags**
   - Keep titles under 60 characters
   - Descriptions under 160 characters
   - Use relevant keywords naturally
   - Include brand name

2. **Sitemap**
   - Update regularly
   - Include all important pages
   - Set appropriate priorities
   - Handle dynamic routes

3. **Schema Markup**
   - Follow Google guidelines
   - Include all required fields
   - Keep data accurate
   - Update regularly

## Next Steps

1. Set up Google Search Console
2. Implement canonical URLs
3. Add structured data for blog posts
4. Create XML sitemap for blog 