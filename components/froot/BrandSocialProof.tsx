'use client'

interface BrandSocialProofProps {
  brand: string
  brandStories: Record<string, { quote: string; sizes: string[] }[]>
  communityScore?: number
}

function findBrandStories(
  brand: string,
  brandStories: Record<string, { quote: string; sizes: string[] }[]>
): { quote: string; sizes: string[] }[] | undefined {
  // Try exact match first
  if (brandStories[brand]) return brandStories[brand]

  // Case-insensitive fallback
  const lowerBrand = brand.toLowerCase()
  for (const key of Object.keys(brandStories)) {
    if (key.toLowerCase() === lowerBrand) return brandStories[key]
  }

  return undefined
}

function cleanQuote(raw: string): string {
  let q = raw.trim()
  // Strip leading/trailing quotation marks
  if ((q.startsWith('"') && q.endsWith('"')) || (q.startsWith('\u201C') && q.endsWith('\u201D'))) {
    q = q.slice(1, -1).trim()
  }
  return q
}

function truncateQuote(text: string, max: number): string {
  if (text.length <= max) return text
  const truncated = text.slice(0, max)
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > max * 0.6) {
    return truncated.slice(0, lastSpace) + '\u2026'
  }
  return truncated + '\u2026'
}

export default function BrandSocialProof({ brand, brandStories }: BrandSocialProofProps) {
  const stories = findBrandStories(brand, brandStories)
  if (!stories || stories.length === 0) return null

  const raw = stories[0].quote
  const cleaned = cleanQuote(raw)
  const display = truncateQuote(cleaned, 120)

  return (
    <div style={{
      borderLeft: '2px solid rgba(212,160,32,0.15)',
      paddingLeft: 10,
      marginTop: 8,
    }}>
      <p style={{
        fontFamily: 'var(--font-space-mono), monospace',
        fontSize: 9,
        fontStyle: 'italic',
        color: 'rgba(26,8,8,0.35)',
        lineHeight: 1.6,
        margin: 0,
      }}>
        {'\u201C'}{display}{'\u201D'}
      </p>
      <p style={{
        fontFamily: 'var(--font-space-mono), monospace',
        fontSize: 8,
        color: 'rgba(26,8,8,0.2)',
        margin: '3px 0 0 0',
        letterSpacing: '0.04em',
      }}>
        r/ABraThatFits
      </p>
    </div>
  )
}
