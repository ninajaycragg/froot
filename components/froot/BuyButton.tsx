'use client'

// components/froot/BuyButton.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The transaction close. One on-brand "shop this →" link that the integrator
// drops onto FitTwinsPanel rows, the Top Pick CTA, and the fit-agent's confident
// recommendation. It:
//   • resolves the right shop URL via lib/affiliate.buildShopUrl (brand
//     storefront when known, Google Shopping fallback otherwise),
//   • opens in a new tab (noopener),
//   • fires a lightweight client analytics ping on click.
//
// Tracking: the repo has no analytics SDK — the only convention is the
// `?ref=froot` provenance param (handled in lib/affiliate). So the ping here is
// a no-op-safe stub: it tries navigator.sendBeacon('/api/froot/track', …) and
// silently does nothing if that endpoint isn't wired yet. Swap the stub for a
// real network tag when one exists; nothing else changes.
//
// Palette: warm bone / ink / poppy-red, 2026 graded color. No gold, no italics.

import { useCallback } from 'react'
import { buildShopUrl, buildShopUrlMeta } from '@/lib/affiliate'

interface BuyButtonProps {
  brand: string
  style?: string
  size?: string
  /** Override the link text. Defaults to "shop this →". */
  label?: string
  /**
   * Visual weight. 'primary' = filled poppy pill (Top Pick / fit-agent),
   * 'ghost' = quiet outline pill (compact FitTwins rows). Defaults to primary.
   */
  variant?: 'primary' | 'ghost'
  /** Where the click happened, for the analytics ping (e.g. 'top-pick'). */
  source?: string
  /**
   * Render nothing when there's no brand to shop (mirrors the BraRunsBadge /
   * MaterialChip convention). Unknown-but-named brands still render — they
   * degrade to a Google Shopping link, which is a real buy path — but a row
   * with no brand at all (e.g. an unnamed fit-twin) renders nothing.
   */
  hideWhenEmpty?: boolean
  /** Stretch to fill the container width (full-bleed CTA, e.g. the Top Pick). */
  block?: boolean
  className?: string
}

/** Best-effort, no-op-safe client ping. Never throws, never blocks the click. */
function pingShopClick(payload: {
  brand: string
  style?: string
  size?: string
  url: string
  via: string
  source?: string
}): void {
  if (typeof window === 'undefined') return
  try {
    const body = JSON.stringify({ event: 'shop_click', ...payload, ts: Date.now() })
    // sendBeacon survives the page-unload that follows opening a new tab.
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon('/api/froot/track', blob)
    }
    // Mirror to a global queue so a tag manager / debug overlay can pick it up.
    const w = window as unknown as { froot?: { events?: unknown[] } }
    w.froot = w.froot || {}
    w.froot.events = w.froot.events || []
    w.froot.events.push(JSON.parse(body))
  } catch {
    /* analytics is never load-bearing — swallow */
  }
}

const BONE = '#FAF6EE'
const INK = '#1A0808'
const POPPY = '#C5352C'

export default function BuyButton({
  brand,
  style,
  size,
  label = 'shop this',
  variant = 'primary',
  source,
  hideWhenEmpty,
  block,
  className,
}: BuyButtonProps) {
  // Nothing to shop without a brand — opt-in to render nothing rather than a
  // dead Google search for "".
  if (hideWhenEmpty && !brand?.trim()) return null

  const href = buildShopUrl({ brand, style, size })

  const handleClick = useCallback(() => {
    const meta = buildShopUrlMeta({ brand, style, size })
    pingShopClick({ brand, style, size, url: meta.url, via: meta.source, source })
  }, [brand, style, size, source])

  const isPrimary = variant === 'primary'

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={className}
      style={{
        display: block ? 'flex' : 'inline-flex',
        width: block ? '100%' : undefined,
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5em',
        textDecoration: 'none',
        fontFamily: 'var(--font-space-mono)',
        letterSpacing: isPrimary ? '0.15em' : '0.1em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        // Sizing
        fontSize: isPrimary ? '11px' : '9px',
        padding: isPrimary ? '14px 24px' : '6px 14px',
        borderRadius: isPrimary ? '28px' : '16px',
        // Color + depth — graded poppy, not a flat fill
        color: isPrimary ? BONE : POPPY,
        background: isPrimary
          ? `linear-gradient(180deg, #D14438 0%, ${POPPY} 55%, #A82A22 100%)`
          : 'rgba(197,53,44,0.08)',
        border: isPrimary ? `1px solid rgba(168,42,34,0.6)` : `1px solid rgba(197,53,44,0.18)`,
        boxShadow: isPrimary
          ? `0 1px 0 rgba(255,255,255,0.18) inset, 0 2px 10px rgba(197,53,44,0.28), 0 1px 2px rgba(26,8,8,0.18)`
          : '0 1px 2px rgba(26,8,8,0.04)',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.transform = 'translateY(-1px)'
        el.style.boxShadow = isPrimary
          ? `0 1px 0 rgba(255,255,255,0.22) inset, 0 4px 16px rgba(197,53,44,0.38), 0 2px 4px rgba(26,8,8,0.2)`
          : '0 2px 8px rgba(197,53,44,0.16)'
        if (!isPrimary) el.style.background = 'rgba(197,53,44,0.14)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = isPrimary
          ? `0 1px 0 rgba(255,255,255,0.18) inset, 0 2px 10px rgba(197,53,44,0.28), 0 1px 2px rgba(26,8,8,0.18)`
          : '0 1px 2px rgba(26,8,8,0.04)'
        if (!isPrimary) el.style.background = 'rgba(197,53,44,0.08)'
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(0.98)'
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
    >
      {label}
      <span aria-hidden style={{ fontSize: '0.95em', lineHeight: 1 }}>
        {'→'}
      </span>
    </a>
  )
}
