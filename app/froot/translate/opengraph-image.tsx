import { ImageResponse } from 'next/og'

// OG card for the size translator — the unfurl for every shared translation link.
// The example row is consensus-correct for a true 30F: Panache runs small (+1 cup
// → 30FF), Freya runs large (−1 → 30E), Fantasie fits true (30F). Same breast,
// three labels — the whole thesis in one image.

export const runtime = 'edge'
export const alt = 'your size in every brand — froot fit-truth'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Playfair Display 500 (OFL) — the site's own serif; edge has no system Georgia.
const serif = fetch(new URL('../og-serif.ttf', import.meta.url)).then((r) => r.arrayBuffer())

const INK = '#1A0808'
const POPPY = '#C5352C'
const SAGE = '#7E9B52'
const WARM = '#8A7060'

function Chip({ brand, label, tone }: { brand: string; label: string; tone: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '22px 34px',
        borderRadius: 22,
        background: 'rgba(255,255,255,0.55)',
        border: '1px solid rgba(26,8,8,0.08)',
      }}
    >
      <div style={{ fontSize: 46, fontFamily: 'Playfair', color: INK }}>{label}</div>
      <div style={{ fontSize: 17, marginTop: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: tone }}>
        {brand}
      </div>
    </div>
  )
}

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: '#F3E7D6',
          color: INK,
          padding: '64px 80px',
        }}
      >
        <div style={{ fontSize: 18, letterSpacing: '0.24em', textTransform: 'uppercase', color: WARM }}>
          froot · fit-truth
        </div>
        <div
          style={{
            fontSize: 62,
            fontFamily: 'Playfair',
            lineHeight: 1.12,
            marginTop: 20,
            maxWidth: 900,
          }}
        >
          the same label fits differently in every brand.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 44 }}>
          <Chip brand="Panache" label="30FF" tone={POPPY} />
          <Chip brand="Fantasie" label="30F" tone={SAGE} />
          <Chip brand="Freya" label="30E" tone={POPPY} />
          <div style={{ fontSize: 22, color: WARM, marginLeft: 10, maxWidth: 240, lineHeight: 1.35 }}>
            same body. three labels. that&apos;s the industry — not you.
          </div>
        </div>
        <div
          style={{
            fontSize: 18,
            marginTop: 52,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'rgba(26,8,8,0.4)',
          }}
        >
          see your size in 77 brands — froot.fit/froot/translate
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Playfair', data: await serif, weight: 500 as const, style: 'normal' as const }],
    },
  )
}
