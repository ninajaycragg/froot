// fit-truth oracle — the callable cross-brand translation endpoint.
// GET /api/froot/fit-truth?from=Freya&size=30G&to=Panache   → one translation
// GET /api/froot/fit-truth?from=Freya&size=30G              → your size in every brand
// Built to be the fit-verification tool an AI shopping agent (or a brand) calls
// before committing a cart. Honest: every answer carries a confidence + basis.
import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import path from 'path'
import { translate, crossBrandTable, type FitTruthProfile } from '../../../froot/translate/lib/translate'

let cached: FitTruthProfile | null = null
function loadProfile(): FitTruthProfile {
  if (cached) return cached
  const p = path.join(process.cwd(), 'public', 'data', 'froot', 'fit-truth.json')
  cached = JSON.parse(readFileSync(p, 'utf8')).profile as FitTruthProfile
  return cached
}

export function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const from = url.searchParams.get('from')
    const size = url.searchParams.get('size')
    const to = url.searchParams.get('to')
    if (!from || !size) {
      return NextResponse.json({ ok: false, error: 'required: from, size (optional: to)' }, { status: 400 })
    }
    const profile = loadProfile()
    if (!profile[from]) {
      return NextResponse.json({ ok: false, error: `unknown brand "${from}"`, brands: Object.keys(profile) }, { status: 404 })
    }
    if (to) {
      const t = translate(profile, from, size, to)
      if (!t) return NextResponse.json({ ok: false, error: 'could not translate (bad size or unknown target)' }, { status: 422 })
      return NextResponse.json({ ok: true, translation: t })
    }
    const table = crossBrandTable(profile, from, size).map((r) => ({
      brand: r.brand, size: r.t.toSize, confidence: r.t.confidence, basis: r.t.basis, note: r.t.note,
    }))
    return NextResponse.json({ ok: true, from, size, table })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
