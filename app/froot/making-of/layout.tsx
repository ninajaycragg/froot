import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'the making of froot',
  description:
    'How froot was built: mining a decade of fitter wisdom, modeling real bodies, and closing the fit-outcome loop.',
  openGraph: {
    title: 'the making of froot',
    description: 'How froot was built — from fitter wisdom to a fit-outcome loop.',
    type: 'website',
  },
}

export default function MakingOfLayout({ children }: { children: React.ReactNode }) {
  return children
}
