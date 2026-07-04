'use client'

// SizeCardCapture — the closing beat of the result page: save your size card.
// She just got her size; this keeps it. Saving stores her fit profile durably
// (Redis via /api/froot/email) and immediately reveals the cross-brand size
// card (the translator) — no inbox promise, because sending isn't wired yet.
// Every word in the copy is true today: the card is saved, updates will come.
import { useState } from 'react'

const INK = '#1A0808'
const POPPY = '#C5352C'

interface SizeCardCaptureProps {
  sizeUK: string
  sizeUS: string
  shape?: unknown
  goal?: unknown
  topMatches?: Array<{ brand: string; style: string; bestSize?: string }>
}

export default function SizeCardCapture({ sizeUK, sizeUS, shape, goal, topMatches }: SizeCardCaptureProps) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function save() {
    if (!email.includes('@') || state === 'saving') return
    setState('saving')
    try {
      const res = await fetch('/api/froot/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, sizeUK, sizeUS, shape, goal, topMatches }),
      })
      setState(res.ok ? 'saved' : 'error')
    } catch {
      setState('error')
    }
  }

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 440,
        borderRadius: 20,
        border: '1px solid rgba(26,8,8,0.08)',
        background: 'rgba(255,255,255,0.5)',
        padding: '20px 22px',
        textAlign: 'center',
      }}
    >
      {state !== 'saved' ? (
        <>
          <div
            style={{
              fontFamily: 'var(--font-space-mono)', fontSize: 9, letterSpacing: '0.22em',
              textTransform: 'uppercase', color: 'rgba(26,8,8,0.35)',
            }}
          >
            keep your size card
          </div>
          <p style={{ margin: '8px 0 14px', fontSize: 13, color: 'rgba(26,8,8,0.6)', lineHeight: 1.5 }}>
            {sizeUK} is just the start — save your card and see your size in 77 brands,
            plus updates as froot learns your fit.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <input
              type="email"
              value={email}
              placeholder="your email"
              onChange={(e) => { setEmail(e.target.value); if (state === 'error') setState('idle') }}
              onKeyDown={(e) => { if (e.key === 'Enter') void save() }}
              style={{
                flex: '1 1 180px', minWidth: 0, padding: '10px 14px', fontSize: 13,
                borderRadius: 22, border: `1px solid ${state === 'error' ? 'rgba(197,53,44,0.5)' : 'rgba(26,8,8,0.15)'}`,
                background: 'rgba(255,255,255,0.8)', color: INK, outline: 'none',
              }}
            />
            <button
              onClick={() => void save()}
              disabled={state === 'saving'}
              style={{
                fontFamily: 'var(--font-space-mono)', fontSize: 10, letterSpacing: '0.12em',
                textTransform: 'uppercase', padding: '10px 20px', borderRadius: 22,
                border: 'none', background: POPPY, color: '#FAF6EE',
                cursor: state === 'saving' ? 'default' : 'pointer',
                opacity: state === 'saving' ? 0.6 : 1, transition: 'opacity 0.2s ease',
              }}
            >
              {state === 'saving' ? 'saving…' : 'save my card'}
            </button>
          </div>
          {state === 'error' && (
            <p style={{ margin: '8px 0 0', fontSize: 11, color: POPPY }}>
              that didn&apos;t save — check the email and try again
            </p>
          )}
        </>
      ) : (
        <>
          <div
            style={{
              fontFamily: 'var(--font-space-mono)', fontSize: 9, letterSpacing: '0.22em',
              textTransform: 'uppercase', color: '#7E9B52',
            }}
          >
            saved
          </div>
          <p style={{ margin: '8px 0 12px', fontSize: 13, color: 'rgba(26,8,8,0.6)', lineHeight: 1.5 }}>
            your card is ready — {sizeUK} UK / {sizeUS} US, kept safe.
          </p>
          {/* from=Fantasie: the true-to-size anchor (delta 0,0) — her quiz size is a
              NEUTRAL size, not a brand label, so it must not pick up a brand's delta */}
          <a
            href={`/froot/translate?from=Fantasie&size=${encodeURIComponent(sizeUK)}`}
            style={{
              display: 'inline-block',
              fontFamily: 'var(--font-space-mono)', fontSize: 10, letterSpacing: '0.12em',
              textTransform: 'uppercase', padding: '10px 22px', borderRadius: 22,
              background: 'rgba(26,8,8,0.05)', color: INK, textDecoration: 'none',
            }}
          >
            see your size in 77 brands &rarr;
          </a>
        </>
      )}
    </div>
  )
}
