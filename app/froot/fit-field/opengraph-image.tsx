import { ImageResponse } from 'next/og'

// OG card for the fit-field mirror — the hero surface's unfurl. Right panel is a
// stylized fit field in the page's own zone colors (dig poppy / fit sage / gape
// slate), so the card previews the product's actual magic, not a stock image.

export const runtime = 'edge'
export const alt = 'see it fit your shape — froot fit field'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const INK = '#1A0808'
const WARM = '#8A7060'
const DIG = '#C5352C'
const FIT = '#7E9B52'
const GAPE = '#5E7787'

function Legend({ clr, label }: { clr: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 14, height: 14, borderRadius: 7, background: clr }} />
      <div style={{ fontSize: 16, letterSpacing: '0.14em', textTransform: 'uppercase', color: WARM }}>{label}</div>
    </div>
  )
}

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: '#F3E7D6',
          color: INK,
          padding: '64px 72px',
          alignItems: 'center',
          gap: 56,
        }}
      >
        {/* left: the thesis */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontSize: 18, letterSpacing: '0.24em', textTransform: 'uppercase', color: WARM }}>
            froot · fit field
          </div>
          <div
            style={{
              fontSize: 50,
              fontFamily: 'Georgia, serif',
              lineHeight: 1.14,
              marginTop: 20,
            }}
          >
            see it fit your shape — before you ever put it on.
          </div>
          <div style={{ fontSize: 22, color: WARM, marginTop: 22, lineHeight: 1.4, maxWidth: 460 }}>
            we don&apos;t guess a size. we drape the real bra on your real shape and show you where it lands.
          </div>
          <div
            style={{
              fontSize: 17,
              marginTop: 40,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'rgba(26,8,8,0.4)',
            }}
          >
            froot.fit/froot/fit-field
          </div>
        </div>

        {/* right: the mirror — stylized fit field in the real zone colors */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 360,
            height: 470,
            borderRadius: 28,
            background: 'linear-gradient(180deg, #f6ecdd 0%, #ecdcc6 100%)',
            border: '1px solid rgba(26,8,8,0.08)',
            padding: 26,
            justifyContent: 'space-between',
          }}
        >
          {/* the body-field blob: warm where it digs, cool where it gapes, green where it fits */}
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: 320,
              borderRadius: 20,
              background:
                `radial-gradient(90px 70px at 30% 22%, ${DIG}cc 0%, ${DIG}00 70%), ` +
                `radial-gradient(110px 90px at 74% 38%, ${GAPE}bb 0%, ${GAPE}00 70%), ` +
                `radial-gradient(150px 130px at 48% 68%, ${FIT}cc 0%, ${FIT}00 72%), ` +
                'linear-gradient(180deg, #efe2cf 0%, #e7d5bd 100%)',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
            <Legend clr={DIG} label="digs in" />
            <Legend clr={FIT} label="fits" />
            <Legend clr={GAPE} label="gapes" />
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
