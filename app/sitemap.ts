import type { MetadataRoute } from 'next'

// The crawl map. The content suite (brands/myths/oracle/stories/community/
// making-of) exists to rank; without a sitemap, crawlers only link-walk.
// URLs resolve against metadataBase (https://froot.fit) once DNS is live.

const BASE = 'https://froot.fit'

const FRUITS = ['cherry', 'lemon', 'tangerine', 'apple', 'pear', 'mango', 'peach', 'melon']

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const core: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/quiz`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/froot`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/froot/fit-field`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/froot/translate`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/lookup`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/froot/lab`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ]

  // the SEO landers — the pages built to rank
  const content: MetadataRoute.Sitemap = [
    { url: `${BASE}/froot/brands`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/froot/myths`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/froot/oracle`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/froot/stories`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/froot/community`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/froot/making-of`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
  ]

  // shareable quiz-result pages (SSG)
  const fruits: MetadataRoute.Sitemap = FRUITS.map((f) => ({
    url: `${BASE}/result/${f}`,
    lastModified: now,
    changeFrequency: 'yearly' as const,
    priority: 0.3,
  }))

  return [...core, ...content, ...fruits]
}
