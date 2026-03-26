'use client'

import type { FruitType } from './fruitTypes'

interface FruitCardProps {
  fruit: FruitType
  ref?: React.Ref<HTMLDivElement>
}

export default function FruitCard({ fruit, ref }: FruitCardProps) {
  return (
    <div
      ref={ref}
      style={{
        width: 360,
        maxWidth: '100%',
        padding: '48px 36px',
        borderRadius: 24,
        background: `linear-gradient(150deg, ${fruit.color} 0%, ${fruit.colorEnd} 100%)`,
        color: fruit.textColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        fontFamily: 'var(--font-space-mono), monospace',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {fruit.rarity !== 'common' && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 24,
            fontSize: 9,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            opacity: 0.5,
            fontFamily: 'var(--font-space-mono), monospace',
          }}
        >
          {fruit.rarity}
        </div>
      )}

      <div style={{ fontSize: 80, lineHeight: 1 }}>{fruit.emoji}</div>

      <div
        style={{
          fontFamily: 'var(--font-dm-serif), Georgia, serif',
          fontStyle: 'italic',
          fontSize: 42,
          marginTop: 16,
          lineHeight: 1.1,
        }}
      >
        {fruit.name}
      </div>

      <div
        style={{
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginTop: 14,
          opacity: 0.6,
          lineHeight: 1.5,
          maxWidth: 260,
        }}
      >
        {fruit.tagline}
      </div>

      <div
        style={{
          fontSize: 13,
          lineHeight: 1.75,
          marginTop: 24,
          maxWidth: 290,
          opacity: 0.85,
        }}
      >
        {fruit.description}
      </div>

      <div
        style={{
          width: 32,
          height: 1,
          background: 'currentColor',
          opacity: 0.2,
          marginTop: 24,
        }}
      />

      <div
        style={{
          fontSize: 9,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginTop: 20,
          opacity: 0.4,
        }}
      >
        the move
      </div>
      <div
        style={{
          fontSize: 12,
          lineHeight: 1.65,
          marginTop: 8,
          maxWidth: 260,
          opacity: 0.75,
        }}
      >
        {fruit.braTip}
      </div>

      <div
        style={{
          fontSize: 9,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          marginTop: 32,
          opacity: 0.25,
        }}
      >
        froot.fit/quiz
      </div>
    </div>
  )
}
