'use client'

// froot · fit-truth — "the same label fits differently in every brand. that's not
// you, that's the industry." Enter your size in one brand → your size in every
// brand, honest about confidence. Consensus-driven (the on-body truth); flat
// catalog geometry only cross-checks, because it can't see fabric stretch.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  crossBrandTable, consensusBrands, brandRunsNote, parseSize, UK_CUPS, type FitTruthProfile, type Confidence,
} from './lib/translate'

const micro = 'text-[10px] uppercase tracking-[0.24em] text-[#8A7060]'
const CONF_COLOR: Record<Confidence, string> = { high: '#7E9B52', medium: '#C9881F', low: '#9c7b63', estimate: '#9c7b63' }
const CONF_LABEL: Record<Confidence, string> = { high: 'fitter-backed', medium: 'check this one', low: 'rough start', estimate: 'estimate' }

export default function TranslatePage() {
  const [profile, setProfile] = useState<FitTruthProfile | null>(null)
  const [brand, setBrand] = useState('Freya')
  const [band, setBand] = useState(30)
  const [cupIndex, setCupIndex] = useState(UK_CUPS.indexOf('F'))
  const [copied, setCopied] = useState(false)
  // brand from a deep link, held until the catalog loads so we can validate it
  const pendingBrand = useRef<string | null>(null)
  const urlReady = useRef(false)

  useEffect(() => {
    fetch('/data/froot/fit-truth.json').then((r) => r.json()).then((d) => setProfile(d.profile)).catch(() => setProfile({}))
  }, [])

  // ── deep links: /froot/translate?size=30G&from=Panache lands personalized ──
  // (window.location on mount — this page is client-only, so no Suspense dance.)
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search)
      const sz = q.get('size')
      if (sz) {
        const p = parseSize(sz)
        if (p) { setBand(p.band); setCupIndex(p.cupIndex) }
      }
      const from = q.get('from')
      if (from) pendingBrand.current = from
    } catch { /* no-op */ }
    urlReady.current = true
  }, [])

  // apply a deep-linked brand once the catalog can vouch for it
  useEffect(() => {
    if (!profile || !pendingBrand.current) return
    const want = pendingBrand.current.toLowerCase()
    const hit = Object.keys(profile).find((b) => b.toLowerCase() === want)
    if (hit) setBrand(hit)
    pendingBrand.current = null
  }, [profile])

  // ── every translation is a link: keep the URL in sync (shareable state) ──
  useEffect(() => {
    if (!urlReady.current) return // don't canonicalize before the deep link is read
    try {
      const url = `${window.location.pathname}?from=${encodeURIComponent(brand)}&size=${band}${UK_CUPS[cupIndex]}`
      window.history.replaceState(null, '', url)
    } catch { /* no-op */ }
  }, [brand, band, cupIndex])

  // brands worth offering as the "from": consensus brands first, then any with data
  const brands = useMemo(() => {
    if (!profile) return []
    const cons = consensusBrands().filter((b) => profile[b])
    const rest = Object.keys(profile).filter((b) => !cons.includes(b)).sort()
    return [...cons, ...rest]
  }, [profile])

  const size = `${band}${UK_CUPS[cupIndex]}`
  const rows = useMemo(() => (profile ? crossBrandTable(profile, brand, size) : []), [profile, brand, size])
  const runsNote = brandRunsNote(brand)

  return (
    <main className="min-h-screen bg-[#F3E7D6] text-[#1A0808] overflow-x-hidden">
      <div className="max-w-2xl mx-auto px-5 md:px-8 pt-12 md:pt-16 pb-20">
        <div className={micro}>froot · fit-truth</div>
        <h1 className="mt-3 text-[26px] md:text-4xl font-light leading-[1.15]">
          the same label fits<br />differently in every brand.
        </h1>
        <p className="mt-3 text-[15px] text-[#1A0808]/60 max-w-md leading-relaxed">
          that&apos;s not you — that&apos;s the industry. tell froot one size that fit, and we&apos;ll translate it across brands, the way the r/abrathatfits brain would.
        </p>

        {/* input */}
        <div className="mt-8 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className={micro}>brand</span>
            <select value={brand} onChange={(e) => setBrand(e.target.value)}
              className="bg-transparent border-b border-[#1A0808]/20 py-2 text-lg font-light focus:outline-none focus:border-[#C5352C]">
              {brands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
          <Stepper label="band" value={`${band}`} onDown={() => setBand((b) => Math.max(24, b - 2))} onUp={() => setBand((b) => Math.min(46, b + 2))} />
          <Stepper label="cup (uk)" value={UK_CUPS[cupIndex]} onDown={() => setCupIndex((c) => Math.max(0, c - 1))} onUp={() => setCupIndex((c) => Math.min(UK_CUPS.length - 1, c + 1))} />
        </div>

        {runsNote && (
          <p className="mt-3 text-[12px] text-[#8A7060]">in {brand}, this size — <span className="text-[#1A0808]/70">{runsNote}</span></p>
        )}

        {/* results */}
        <div className="mt-8 space-y-2">
          <div className="flex items-center justify-between">
            <span className={micro}>your {size} translates to</span>
            <span className="flex items-center gap-3">
              <button
                onClick={() => {
                  try {
                    void navigator.clipboard.writeText(window.location.href)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1800)
                  } catch { /* clipboard unavailable */ }
                }}
                className="text-[10px] uppercase tracking-[0.14em] text-[#8A7060] hover:text-[#C5352C] transition-colors"
              >
                {copied ? 'copied ✓' : 'copy link'}
              </button>
              <span className="text-[10px] text-[#1A0808]/40">{rows.length} brands</span>
            </span>
          </div>
          {!profile && <p className="text-sm text-[#1A0808]/50">loading the catalog…</p>}
          {rows.map(({ brand: b, t }) => (
            <div key={b} className="flex items-center gap-3 rounded-xl bg-white/55 border border-[#1A0808]/8 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-[15px]">{b}</div>
                <div className="text-[11px] text-[#8A7060] truncate">{t.note}</div>
              </div>
              <div className="text-xl font-light tabular-nums">{t.toSize}</div>
              <div className="w-[88px] text-right">
                <span className="inline-block text-[9px] uppercase tracking-[0.14em] px-2 py-1 rounded-full"
                  style={{ color: CONF_COLOR[t.confidence], background: `${CONF_COLOR[t.confidence]}1a` }}>
                  {CONF_LABEL[t.confidence]}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* the honest footer — the whole reason this is trustworthy */}
        <div className="mt-8 rounded-xl border border-[#1A0808]/10 p-4 text-[12px] text-[#1A0808]/55 leading-relaxed">
          <span className="text-[#C5352C]/80 uppercase tracking-[0.16em] text-[10px]">how this works</span>
          <p className="mt-1.5">
            translations lead with what experienced fitters actually report (the on-body truth), because a brand&apos;s flat catalog measurements <em className="not-italic underline decoration-[#C5352C]/30">can&apos;t</em> see how its fabric stretches and grips — that&apos;s why two bras that measure the same fit completely differently. where the catalog and the fitters disagree, we mark it <span style={{ color: CONF_COLOR.medium }}>check this one</span> rather than pretend. every translation gets truer as froot sees real fit outcomes.
          </p>
        </div>
      </div>
    </main>
  )
}

function Stepper({ label, value, onUp, onDown }: { label: string; value: string; onUp: () => void; onDown: () => void }) {
  return (
    <div className="rounded-xl bg-white/55 border border-[#1A0808]/10 px-3 py-1.5 min-w-[104px]">
      <div className="text-[9px] uppercase tracking-[0.2em] text-[#8A7060] text-center">{label}</div>
      <div className="flex items-center justify-between mt-0.5">
        <button aria-label={`${label} down`} onClick={onDown} className="w-7 h-7 grid place-items-center text-[#1A0808]/55 hover:text-[#C5352C] text-lg">−</button>
        <span className="text-base tabular-nums">{value}</span>
        <button aria-label={`${label} up`} onClick={onUp} className="w-7 h-7 grid place-items-center text-[#1A0808]/55 hover:text-[#C5352C] text-lg">+</button>
      </div>
    </div>
  )
}
