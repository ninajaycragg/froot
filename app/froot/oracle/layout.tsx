import type { Metadata } from 'next'

// Metadata lives here because page.tsx is a client component. The oracle answers
// free-text fit questions ("wire pokes my armpit") from a decade of fitter wisdom.
export const metadata: Metadata = {
  title: 'ask the fit oracle — froot',
  description:
    'Wires poking? Straps digging? Cups gaping? Ask in your own words — the oracle answers from a decade of real fitter wisdom, with the receipts.',
  openGraph: {
    title: 'ask the fit oracle — froot',
    description:
      'Ask any bra-fit question in your own words — answered from a decade of real fitter wisdom.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ask the fit oracle — froot',
    description:
      'Ask any bra-fit question in your own words — answered from a decade of real fitter wisdom.',
  },
}

export default function OracleLayout({ children }: { children: React.ReactNode }) {
  return children
}
