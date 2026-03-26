import { ImageResponse } from 'next/og'
import { FRUIT_TYPES } from '@/components/froot/fruitTypes'

export const runtime = 'edge'
export const alt = "What's Your Froot?"
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ fruit: string }> }) {
  const { fruit: id } = await params
  const fruit = FRUIT_TYPES[id]

  if (!fruit) {
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            background: '#FAF6EE',
            fontSize: 40,
          }}
        >
          froot.fit
        </div>
      ),
      { ...size },
    )
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: `linear-gradient(135deg, ${fruit.color}, ${fruit.colorEnd})`,
          color: fruit.textColor,
        }}
      >
        <div style={{ fontSize: 100 }}>{fruit.emoji}</div>
        <div
          style={{
            fontSize: 56,
            fontStyle: 'italic',
            fontFamily: 'Georgia, serif',
            marginTop: 16,
          }}
        >
          {fruit.name}
        </div>
        <div
          style={{
            fontSize: 20,
            opacity: 0.7,
            marginTop: 12,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {fruit.tagline}
        </div>
        <div
          style={{
            fontSize: 16,
            opacity: 0.4,
            marginTop: 40,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          what&apos;s your froot? &mdash; froot.fit/quiz
        </div>
      </div>
    ),
    { ...size },
  )
}
