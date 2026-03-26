import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Space_Mono } from 'next/font/google'
import './globals.css'

const playfairDisplay = Playfair_Display({
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-dm-serif',
  display: 'swap',
})

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FAF6EE',
}

export const metadata: Metadata = {
  title: 'Froot — Find your real bra size',
  description: 'The bra fitting calculator that actually works. 6 measurements, real data from 265K+ bras, AI-powered recommendations.',
  openGraph: {
    title: 'Froot — Find your real bra size',
    description: 'The bra fitting calculator that actually works. 6 measurements, real data from 265K+ bras, AI-powered recommendations.',
    url: 'https://froot.fit',
    siteName: 'froot.fit',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${playfairDisplay.variable} ${spaceMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
