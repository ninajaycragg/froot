import type { Metadata } from 'next'

// Metadata lives here because page.tsx is a client component. The mirror is the
// hero surface — this is what a shared fit-field link unfurls as.
export const metadata: Metadata = {
  title: 'see it fit your shape — froot fit field',
  description:
    "We don't guess a size. froot drapes the real bra on your real shape in 3D — warm where it digs, cool where it gapes, green where it fits — before you ever put it on.",
  openGraph: {
    title: 'see it fit your shape — froot fit field',
    description:
      'The fitting-room mirror that x-rays the fit: a real bra draped on your real shape, before you ever put it on.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'see it fit your shape — froot fit field',
    description:
      'The fitting-room mirror that x-rays the fit: a real bra draped on your real shape, before you ever put it on.',
  },
}

export default function FitFieldLayout({ children }: { children: React.ReactNode }) {
  return children
}
