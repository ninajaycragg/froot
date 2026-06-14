'use client'

// ─────────────────────────────────────────────────────────────────────────────
// BrandAutocomplete — a polished brand typeahead for the "add a bra" flow.
//
// The contract that matters: onSelect emits the EXACT canonical Title-Case brand
// string the catalog is keyed by ("Freya", "Victoria's Secret", "1st & Curve").
// Downstream measurement + sentiment lookups (and BraRunsBadge via getBraRuns)
// are exact-string keyed, so a free-typed "freya " silently misses. This input
// guarantees a canonical value on select — but also stays usable when someone
// types a brand we don't have, by leaving their text intact via onChange.
//
// Matching is ranked, not just substring: exact > prefix > word-start >
// subsequence, tie-broken by the brand's popularity weight (w) from the index.
// Aliases ("vs" → Victoria's Secret, "m&s" → Marks & Spencer) match too.
//
// Self-contained: imports only the prebuilt brand-index.json + framer-motion.
// Drop-in for the FitFeedbackModal manual-entry brand field.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import RAW_INDEX from '@/data/froot/brand-index.json'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

// On-brand Froot palette (matches FitFeedbackModal exactly).
const INK = '#1A0808'
const BONE = '#FAF6EE'
const GOLD = '#D4A020'

interface BrandRow {
  n: string // canonical Title-Case name (what we emit)
  k: string // normalized search key
  w: number // popularity weight 0..~95
  m: boolean // has catalog measurements
  a?: string[] // normalized aliases
}

const INDEX = RAW_INDEX as BrandRow[]

interface Scored {
  row: BrandRow
  score: number
}

const MAX_RESULTS = 7

// Normalize a query the same way the index keys were built, so they're comparable.
function normQuery(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

// Is `q` a subsequence of `s`? (chars in order, gaps allowed) — fuzzy fallback.
function isSubsequence(q: string, s: string): boolean {
  let i = 0
  for (let j = 0; j < s.length && i < q.length; j++) {
    if (s[j] === q[i]) i++
  }
  return i === q.length
}

// Rank one row against the normalized query. Higher = better; -1 = no match.
// Tiers (so a prefix always beats a buried subsequence regardless of popularity):
//   1000 exact · 800 prefix · 600 word-start · 400 contains · 200 subsequence
//   + alias hits one tier below their text equivalent · + popularity (0..1).
function scoreRow(row: BrandRow, q: string): number {
  const keys: Array<{ k: string; aliasPenalty: number }> = [{ k: row.k, aliasPenalty: 0 }]
  if (row.a) for (const a of row.a) keys.push({ k: a, aliasPenalty: 150 })

  let best = -1
  for (const { k, aliasPenalty } of keys) {
    let tier = -1
    if (k === q) tier = 1000
    else if (k.startsWith(q)) tier = 800
    else if (k.split(' ').some((w) => w.startsWith(q))) tier = 600
    else if (k.includes(q)) tier = 400
    else if (isSubsequence(q, k)) tier = 200
    if (tier < 0) continue
    const s = tier - aliasPenalty
    if (s > best) best = s
  }
  if (best < 0) return -1
  // Popularity as a sub-1 tiebreak so it never crosses a tier boundary.
  return best + row.w / 100
}

export interface BrandAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect: (brand: string) => void
  placeholder?: string
  /** Optional: focus the input on mount (e.g. when the modal opens). */
  autoFocus?: boolean
}

export default function BrandAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'brand (e.g. Freya)',
  autoFocus,
}: BrandAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  // Tracks the value at the moment of the last select, so we don't immediately
  // re-open the dropdown when the controlled value flows back in as `value`.
  const justSelected = useRef<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const results = useMemo<Scored[]>(() => {
    const q = normQuery(value)
    if (!q) return []
    const out: Scored[] = []
    for (const row of INDEX) {
      const score = scoreRow(row, q)
      if (score > 0) out.push({ row, score })
    }
    out.sort((a, b) => b.score - a.score)
    return out.slice(0, MAX_RESULTS)
  }, [value])

  // Whether the typed value already exactly equals a canonical brand.
  const exactCanonical = useMemo(() => {
    const q = normQuery(value)
    return !!q && INDEX.some((r) => r.k === q)
  }, [value])

  const showDropdown = open && results.length > 0 && !exactCanonical

  // Reset highlight when the result set changes.
  useEffect(() => {
    setActive(0)
  }, [value])

  // Keep the active row scrolled into view during keyboard nav.
  useEffect(() => {
    if (!showDropdown || !listRef.current) return
    const el = listRef.current.children[active] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [active, showDropdown])

  // Close on outside click / tap (mobile-friendly).
  useEffect(() => {
    function onDocPointer(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onDocPointer)
    return () => document.removeEventListener('pointerdown', onDocPointer)
  }, [])

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const choose = useCallback(
    (row: BrandRow) => {
      justSelected.current = row.n
      onChange(row.n) // mirror the canonical text back into the field
      onSelect(row.n) // emit canonical string for downstream lookups
      setOpen(false)
    },
    [onChange, onSelect],
  )

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    onChange(v)
    // Reopen on any edit that isn't the echo of a just-made selection.
    if (justSelected.current !== null && v === justSelected.current) return
    justSelected.current = null
    setOpen(true)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) {
      // ArrowDown re-opens a closed list when there are matches to show.
      if (e.key === 'ArrowDown' && results.length > 0 && !exactCanonical) {
        setOpen(true)
        e.preventDefault()
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActive((a) => (a + 1) % results.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setActive((a) => (a - 1 + results.length) % results.length)
        break
      case 'Enter':
        e.preventDefault()
        if (results[active]) choose(results[active].row)
        break
      case 'Tab':
        // Tab autocompletes to the highlighted brand without leaving prematurely.
        if (results[active]) {
          e.preventDefault()
          choose(results[active].row)
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onFocus={() => {
          justSelected.current = null
          setOpen(true)
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-controls="brand-ac-list"
        aria-activedescendant={showDropdown ? `brand-ac-opt-${active}` : undefined}
        style={{
          width: '100%',
          padding: '11px 12px',
          borderRadius: '10px',
          border: 'none',
          background: 'rgba(26,8,8,0.02)',
          boxShadow: showDropdown
            ? `0 1px 3px rgba(26,8,8,0.04) inset, 0 0 0 1.5px rgba(212,160,32,0.4)`
            : '0 1px 3px rgba(26,8,8,0.04) inset',
          fontFamily: 'var(--font-space-mono)',
          fontSize: '11px',
          color: INK,
          outline: 'none',
          transition: 'box-shadow 0.18s ease',
        }}
      />

      {/* Canonical-match tick — quiet confirmation the brand will resolve. */}
      {exactCanonical && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontFamily: 'var(--font-space-mono)',
            fontSize: '10px',
            color: GOLD,
            pointerEvents: 'none',
          }}
        >
          ✓
        </span>
      )}

      <AnimatePresence>
        {showDropdown && (
          <motion.ul
            id="brand-ac-list"
            ref={listRef}
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: EASE }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              zIndex: 20,
              margin: 0,
              padding: '4px',
              listStyle: 'none',
              background: BONE,
              borderRadius: '12px',
              boxShadow: '0 12px 32px rgba(26,8,8,0.16), 0 0 0 1px rgba(26,8,8,0.04)',
              maxHeight: '240px',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {results.map(({ row }, i) => {
              const isActive = i === active
              return (
                <li
                  key={row.n}
                  id={`brand-ac-opt-${i}`}
                  role="option"
                  aria-selected={isActive}
                  onPointerEnter={() => setActive(i)}
                  // pointerDown (not click) so the choice lands before the
                  // input's blur closes the list.
                  onPointerDown={(e) => {
                    e.preventDefault()
                    choose(row)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '9px 10px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: isActive ? 'rgba(212,160,32,0.1)' : 'transparent',
                    transition: 'background 0.12s ease',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-space-mono)',
                      fontSize: '11px',
                      color: isActive ? GOLD : INK,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {row.n}
                  </span>
                  {row.m && (
                    <span
                      style={{
                        flexShrink: 0,
                        fontFamily: 'var(--font-space-mono)',
                        fontSize: '7px',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: isActive ? 'rgba(212,160,32,0.8)' : 'rgba(26,8,8,0.25)',
                      }}
                    >
                      fit data
                    </span>
                  )}
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
