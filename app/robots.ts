import type { MetadataRoute } from 'next'

// Crawl policy: everything public is fair game; the API surface is not a page.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: 'https://froot.fit/sitemap.xml',
  }
}
