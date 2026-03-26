import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FRUIT_TYPES } from '@/components/froot/fruitTypes'
import FruitCard from '@/components/froot/FruitCard'
import FilmGrain from '@/components/FilmGrain'

export function generateStaticParams() {
  return Object.keys(FRUIT_TYPES).map((fruit) => ({ fruit }))
}

export async function generateMetadata({ params }: { params: Promise<{ fruit: string }> }): Promise<Metadata> {
  const { fruit: id } = await params
  const fruit = FRUIT_TYPES[id]
  if (!fruit) return {}

  return {
    title: `${fruit.emoji} ${fruit.name} \u2014 froot.fit`,
    description: `${fruit.tagline} ${fruit.description}`,
    openGraph: {
      title: `I'm a ${fruit.emoji} ${fruit.name}`,
      description: `${fruit.tagline} \u2014 what's your froot?`,
      url: `https://froot.fit/result/${id}`,
    },
  }
}

export default async function ResultPage({ params }: { params: Promise<{ fruit: string }> }) {
  const { fruit: id } = await params
  const fruit = FRUIT_TYPES[id]
  if (!fruit) notFound()

  return (
    <main
      style={{
        position: 'relative',
        width: '100vw',
        minHeight: '100vh',
        background: `linear-gradient(180deg, #FAF6EE 0%, ${fruit.colorEnd}15 50%, #FAF6EE 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px',
      }}
    >
      <FilmGrain />

      <FruitCard fruit={fruit} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          marginTop: 40,
          zIndex: 10,
        }}
      >
        <a
          href="/quiz"
          style={{
            padding: '16px 40px',
            background: '#1A0808',
            color: '#FAF6EE',
            borderRadius: 100,
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: 12,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          take the quiz &rarr;
        </a>
        <a
          href="/froot"
          style={{
            padding: '14px 32px',
            background: 'transparent',
            color: '#1A0808',
            border: '1px solid rgba(26,8,8,0.15)',
            borderRadius: 100,
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: 11,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          find your exact size
        </a>
      </div>

      {/* All 8 types */}
      <div style={{ display: 'flex', gap: 8, marginTop: 40, alignItems: 'center' }}>
        {Object.values(FRUIT_TYPES).map((f) => (
          <a
            key={f.id}
            href={`/result/${f.id}`}
            style={{
              fontSize: f.id === id ? 28 : 20,
              opacity: f.id === id ? 1 : 0.35,
              textDecoration: 'none',
            }}
          >
            {f.emoji}
          </a>
        ))}
      </div>
    </main>
  )
}
