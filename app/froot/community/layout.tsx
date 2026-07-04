import type { Metadata } from 'next'

// Metadata lives here because page.tsx is a client component.
export const metadata: Metadata = {
  title: 'what the community knows — froot',
  description:
    'A decade of collective bra-fitting wisdom, distilled: the sizes people actually land on, the brands they trust, and what changed their minds.',
  openGraph: {
    title: 'what the community knows — froot',
    description: 'A decade of collective bra-fitting wisdom, distilled.',
    type: 'website',
  },
}

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return children
}
