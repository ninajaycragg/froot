import type { Metadata } from 'next'

// Metadata lives here because page.tsx is a client component.
export const metadata: Metadata = {
  title: 'real fit stories — froot',
  description:
    'Real sizing journeys from a decade of fitter discussion — the moment the right size clicked, in their own words.',
  openGraph: {
    title: 'real fit stories — froot',
    description: 'Real sizing journeys — the moment the right size clicked, in their own words.',
    type: 'website',
  },
}

export default function StoriesLayout({ children }: { children: React.ReactNode }) {
  return children
}
