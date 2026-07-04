import type { Metadata } from 'next'

// Metadata lives here because page.tsx is a client component. This page targets
// the myth queries ("is 34B a normal size", "add 4 inches bra sizing") with the
// receipts: a decade of fitter data debunking each one.
export const metadata: Metadata = {
  title: 'bra sizing myths, debunked with data — froot',
  description:
    '"34B is average." "Add 4 inches to your band." "DD is huge." A decade of real fitting data says otherwise — the biggest bra myths, debunked with receipts.',
  openGraph: {
    title: 'bra sizing myths, debunked with data — froot',
    description:
      'The biggest bra-sizing myths, debunked with a decade of real fitting data.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'bra sizing myths, debunked with data — froot',
    description:
      'The biggest bra-sizing myths, debunked with a decade of real fitting data.',
  },
}

export default function MythsLayout({ children }: { children: React.ReactNode }) {
  return children
}
