/** @type {import('next-sitemap').IConfig} */
module.exports = {
  // REQUIRED: add your own domain name here
  siteUrl: process.env.SITE_URL || "https://sound-real.com",
  generateRobotsTxt: true,
  sitemapSize: 7000,
  changefreq: 'weekly',
  priority: 0.7,
  // use this to exclude routes from the sitemap (i.e. a user dashboard). By default, NextJS app router metadata files are excluded (https://nextjs.org/docs/app/api-reference/file-conventions/metadata)
  exclude: [
    "/twitter-image.*", 
    "/opengraph-image.*", 
    "/icon.*",
    "/admin/*",
    "/api/*", 
    "/dashboard/*",
    "/profile/*",
    "/auth/*",
    "/signin/*"
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/dashboard/', '/auth/', '/signin/'],
      },
      // Block AI crawler bots to protect our AI humanization service
      {
        userAgent: 'GPTBot',
        disallow: '/',
      },
      {
        userAgent: 'ChatGPT-User',
        disallow: '/',
      },
      {
        userAgent: 'CCBot',
        disallow: '/',
      },
      {
        userAgent: 'anthropic-ai',
        disallow: '/',
      },
      {
        userAgent: 'Claude-Web',
        disallow: '/',
      },
    ],
    additionalSitemaps: [
      'https://sound-real.com/sitemap-blog.xml',
    ],
  },
  transform: async (config, path) => {
    // Custom priority based on page importance for AI humanization tool
    const priorities = {
      '/': 1.0,           // Homepage - highest priority
      '/pricing': 0.9,    // Pricing page - very important
      '/blog': 0.8,       // Blog - important for SEO content
      '/privacy-policy': 0.3,
      '/tos': 0.3,
    }
    
    // Custom changefreq based on content type
    const changefreqs = {
      '/': 'weekly',
      '/pricing': 'monthly', 
      '/blog': 'weekly',
      '/privacy-policy': 'yearly',
      '/tos': 'yearly',
    }
    
    return {
      loc: path,
      changefreq: changefreqs[path] || config.changefreq,
      priority: priorities[path] || config.priority,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      alternateRefs: config.alternateRefs ?? [],
    }
  },
};
