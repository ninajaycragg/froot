import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = "What's Your Froot?"
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
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
          background: 'linear-gradient(135deg, #FAF6EE 0%, #F7F1E6 100%)',
          color: '#1A0808',
        }}
      >
        <div style={{ fontSize: 64, fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>
          what&apos;s your froot?
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
          {['🍒', '🍋', '🍊', '🍎', '🍐', '🥭', '🍑', '🍈'].map((e) => (
            <div key={e} style={{ fontSize: 48 }}>
              {e}
            </div>
          ))}
        </div>
        <div
          style={{
            fontSize: 20,
            opacity: 0.4,
            marginTop: 32,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          3 questions &middot; 10 seconds &middot; unhinged accuracy
        </div>
      </div>
    ),
    { ...size },
  )
}
