'use client'

import { ReactNode, CSSProperties } from 'react'
import Link from 'next/link'
import FilmGrain from '@/components/FilmGrain'
import Vignette from '@/components/Vignette'

const serif: CSSProperties = { fontFamily: 'var(--font-cormorant), Georgia, serif' }
const mono: CSSProperties = { fontFamily: 'var(--font-space-mono), monospace' }

/* ── Content helpers ── */

export function P({ children }: { children: ReactNode }) {
  return (
    <p style={{ margin: '0 0 20px', lineHeight: 1.8, color: '#c8c0b4', ...mono, fontSize: 13 }}>
      {children}
    </p>
  )
}

export function B({ children }: { children: ReactNode }) {
  return <strong style={{ color: '#e8e0d6', fontWeight: 700 }}>{children}</strong>
}

export function Accent({ children }: { children: ReactNode }) {
  return <span style={{ color: '#C5352C' }}>{children}</span>
}

export function Muted({ children }: { children: ReactNode }) {
  return <span style={{ color: '#8a7060' }}>{children}</span>
}

export function IC({ children }: { children: string }) {
  return (
    <code style={{
      background: '#141414',
      padding: '1px 5px',
      borderRadius: 3,
      fontSize: 11.5,
      color: '#d4a020',
      ...mono,
    }}>
      {children}
    </code>
  )
}

export function Pre({ children, label }: { children: string; label?: string }) {
  return (
    <div style={{ margin: '16px 0 24px' }}>
      {label && (
        <div style={{
          ...mono,
          fontSize: 10,
          color: '#8a7060',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 6,
        }}>
          {label}
        </div>
      )}
      <pre style={{
        background: '#0f0f0f',
        border: '1px solid #1a1a1a',
        borderRadius: 4,
        padding: '14px 18px',
        overflowX: 'auto',
        fontSize: 11.5,
        lineHeight: 1.65,
        color: '#a89880',
        ...mono,
        margin: 0,
      }}>
        <code>{children}</code>
      </pre>
    </div>
  )
}

export function Divider() {
  return <hr style={{ border: 'none', borderTop: '1px solid #1a1a1a', margin: '32px 0' }} />
}

/* ── Main layout ── */

interface Section {
  title: string
  content: ReactNode
}

interface CaseStudyProps {
  projectName: string
  hook: string
  backHref: string
  backLabel: string
  sections: Section[]
}

export default function CaseStudy({ projectName, hook, backHref, backLabel, sections }: CaseStudyProps) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0a0a0a',
      color: '#c8c0b4',
      ...mono,
      fontSize: 13,
      overflowY: 'auto',
      zIndex: 50,
    }}>
      {/* Nav */}
      <nav style={{
        padding: '16px 24px',
        borderBottom: '1px solid #1a1a1a',
        position: 'sticky',
        top: 0,
        background: '#0a0a0aee',
        backdropFilter: 'blur(8px)',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Link href={backHref} style={{
          color: '#8a7060',
          textDecoration: 'none',
          fontSize: 11,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          transition: 'color 0.2s',
        }}>
          &larr; {backLabel}
        </Link>
        <span style={{
          ...mono,
          fontSize: 10,
          color: '#3a3530',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          Making Of
        </span>
      </nav>

      {/* Hero */}
      <header style={{
        padding: 'clamp(48px, 10vw, 100px) 24px clamp(40px, 8vw, 72px)',
        maxWidth: 720,
        margin: '0 auto',
      }}>
        <h1 style={{
          ...serif,
          fontSize: 'clamp(40px, 7vw, 64px)',
          fontWeight: 300,
          color: '#e8e0d6',
          margin: 0,
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
        }}>
          {projectName}
        </h1>
        <p style={{
          ...mono,
          fontSize: 'clamp(12px, 2vw, 14px)',
          color: '#8a7060',
          marginTop: 20,
          maxWidth: 540,
          lineHeight: 1.6,
        }}>
          {hook}
        </p>
      </header>

      {/* Sections */}
      <main style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '0 24px 120px',
      }}>
        {sections.map((section, i) => (
          <section key={i} style={{
            marginBottom: 56,
            paddingTop: 48,
            borderTop: '1px solid #1a1a1a',
          }}>
            <h2 style={{
              ...serif,
              fontSize: 'clamp(26px, 4vw, 34px)',
              fontWeight: 300,
              color: '#e8e0d6',
              margin: '0 0 28px 0',
              letterSpacing: '-0.01em',
            }}>
              {section.title}
            </h2>
            <div>{section.content}</div>
          </section>
        ))}
      </main>
      <FilmGrain />
      <Vignette />
    </div>
  )
}
