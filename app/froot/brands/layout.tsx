import type { Metadata } from 'next'

// Metadata lives here because page.tsx is a client component. This is the page
// meant to rank for "does <brand> run small" / "which bra brands run big" — the
// brand-sentiment directory mined from a decade of real fitter discussion.
export const metadata: Metadata = {
  title: 'which bra brands run small? — froot brand truth',
  description:
    'Does Panache run small? Does Freya run big? Real answers from a decade of fitter discussion — sentiment, sizing quirks, and year-by-year trends for every major bra brand.',
  openGraph: {
    title: 'which bra brands run small? — froot brand truth',
    description:
      'Real answers from a decade of fitter discussion — sentiment and sizing quirks for every major bra brand.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'which bra brands run small? — froot brand truth',
    description:
      'Does Panache run small? Does Freya run big? Real answers from a decade of fitter discussion.',
  },
}

export default function BrandsLayout({ children }: { children: React.ReactNode }) {
  return children
}
