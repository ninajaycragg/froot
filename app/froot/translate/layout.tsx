import type { Metadata } from 'next'

// Metadata lives here because page.tsx is a client component. This is the page
// meant to rank for "bra size in different brands" queries and to unfurl richly
// when a translation link is shared — the OG card is opengraph-image.tsx.
export const metadata: Metadata = {
  title: 'your size in every brand — froot fit-truth',
  description:
    'The same bra size fits differently in every brand — Panache runs small, Freya runs large. Enter one size that fit and see your true size in 77 brands, backed by real fitter consensus.',
  openGraph: {
    title: 'your size in every brand — froot fit-truth',
    description:
      'The same label fits differently in every brand. That’s not you — that’s the industry. See your size in 77 brands.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'your size in every brand — froot fit-truth',
    description:
      'The same label fits differently in every brand. See your size in 77 brands, backed by real fitter consensus.',
  },
}

export default function TranslateLayout({ children }: { children: React.ReactNode }) {
  return children
}
