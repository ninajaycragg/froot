import type { Metadata, Viewport } from 'next'
import { Fraunces, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const fraunces = Fraunces({
  style: ['normal', 'italic'],
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-dm-serif',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#15170F',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://froot.fit'),
  title: 'froot — find your real size',
  description: 'A bra sizing tool that actually works. 6 measurements, shape-aware algorithm, 265K+ data points.',
  openGraph: {
    title: 'froot — find your real size',
    description: 'A bra sizing tool that actually works. 6 measurements, shape-aware algorithm, 265K+ data points.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
