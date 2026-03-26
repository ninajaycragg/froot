'use client'

interface FrootIntroProps {
  unit: 'in' | 'cm'
  onUnitChange: (u: 'in' | 'cm') => void
  onBegin: () => void
  onDemo?: () => void
}

export default function FrootIntro({ unit, onUnitChange, onBegin, onDemo }: FrootIntroProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '40px 24px',
      textAlign: 'center',
    }}>
      {/* Brand mark */}
      <h1 style={{
        fontFamily: 'var(--font-dm-serif), Georgia, serif',
        fontStyle: 'italic',
        fontSize: 'clamp(48px, 8vw, 72px)',
        color: '#1A0808',
        fontWeight: 400,
        marginBottom: '8px',
        letterSpacing: '-0.02em',
      }}>
        Froot
      </h1>

      <p style={{
        fontFamily: 'var(--font-space-mono), monospace',
        fontSize: '11px',
        letterSpacing: '0.18em',
        color: '#8A7060',
        textTransform: 'uppercase',
        marginBottom: '48px',
      }}>
        find your fit
      </p>

      {/* Description */}
      <p style={{
        fontFamily: 'var(--font-space-mono), monospace',
        fontSize: '12px',
        lineHeight: 1.8,
        color: 'rgba(26,8,8,0.55)',
        maxWidth: '380px',
        marginBottom: '44px',
      }}>
        Six measurements. Three shape questions. No outdated +4 method, no guessing.
        We&apos;ll calculate your size using your actual body — then give you personalized
        advice on styles and brands that work for your shape.
      </p>

      {/* Unit toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0',
        marginBottom: '40px',
        border: '1px solid rgba(26,8,8,0.12)',
        borderRadius: '20px',
        overflow: 'hidden',
      }}>
        {(['in', 'cm'] as const).map((u) => (
          <button
            key={u}
            onClick={() => onUnitChange(u)}
            style={{
              fontFamily: 'var(--font-space-mono), monospace',
              fontSize: '11px',
              letterSpacing: '0.1em',
              padding: '10px 24px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              background: unit === u ? '#1A0808' : 'transparent',
              color: unit === u ? '#FAF6EE' : '#8A7060',
            }}
          >
            {u}
          </button>
        ))}
      </div>

      {/* Begin button */}
      <button
        onClick={onBegin}
        style={{
          fontFamily: 'var(--font-space-mono), monospace',
          fontSize: '11px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          padding: '14px 48px',
          border: '1px solid #D4A020',
          borderRadius: '28px',
          background: 'transparent',
          color: '#D4A020',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#D4A020'
          e.currentTarget.style.color = '#FAF6EE'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = '#D4A020'
        }}
      >
        Begin
      </button>

      {/* Fine print */}
      <p style={{
        fontFamily: 'var(--font-space-mono), monospace',
        fontSize: '9px',
        color: 'rgba(26,8,8,0.25)',
        marginTop: '32px',
        letterSpacing: '0.05em',
      }}>
        you&apos;ll need a soft measuring tape — takes about 3 minutes
      </p>

      {/* Demo link */}
      {onDemo && (
        <button
          onClick={onDemo}
          style={{
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: '9px',
            color: 'rgba(26,8,8,0.2)',
            marginTop: '16px',
            letterSpacing: '0.05em',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
            padding: 0,
          }}
        >
          or try with sample data
        </button>
      )}
    </div>
  )
}
