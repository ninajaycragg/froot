// Tests for the fit-truth translator. Run: `node translate.test.ts`.
// Verifies the HONEST fusion: consensus drives the direction (matching fitters),
// geometry only cross-checks, disagreements are flagged not silently trusted, and
// the real profile loads. Loads the actual built fit-truth.json.
import { readFileSync } from 'node:fs'
import {
  translate, crossBrandTable, parseSize, sizeLabel, UK_CUPS,
  type FitTruthProfile,
} from './translate.ts'

const profile: FitTruthProfile = JSON.parse(readFileSync(new URL('../../../../public/data/froot/fit-truth.json', import.meta.url), 'utf8')).profile

let pass = 0, fail = 0
const check = (n: string, c: boolean, d = '') => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}  ${d}`)) }
const cupIdx = (s: string) => parseSize(s)!.cupIndex

console.log('\n── parsing + labels ──')
{
  check('parse 30G', parseSize('30G')?.cupIndex === UK_CUPS.indexOf('G'))
  check('parse 28FF', parseSize('28FF')?.cupIndex === UK_CUPS.indexOf('FF'))
  check('label round-trips', sizeLabel(30, UK_CUPS.indexOf('G')) === '30G')
  check('rejects junk', parseSize('hello') === null)
}

console.log('\n── identity ──')
{
  const t = translate(profile, 'Panache', '30G', 'Panache')!
  check('same brand → same size, high conf', t.toSize === '30G' && t.confidence === 'high' && t.basis === 'identity')
}

console.log('\n── THE DIRECTION TEST: consensus matches what fitters actually say ──')
{
  // Comexim runs ~2 cups small → from a neutral-ish brand you SIZE UP into Comexim.
  // Freya cups run large → SIZE DOWN. So Freya→Comexim should jump UP several cups.
  const fc = translate(profile, 'Freya', '30F', 'Comexim')!
  console.log(`    Freya 30F → Comexim ${fc.toSize}  (${fc.basis}, ${fc.confidence})`)
  check('Freya→Comexim sizes UP in cup (runs-small + runs-large stack)', cupIdx(fc.toSize) > cupIdx('30F'), fc.toSize)

  // Panache runs small → from Freya (runs large) into Panache you size up.
  const fp = translate(profile, 'Freya', '30F', 'Panache')!
  check('Freya→Panache sizes UP in cup', cupIdx(fp.toSize) > cupIdx('30F'), fp.toSize)

  // reverse: Comexim → Freya should size DOWN (Comexim stingy → Freya generous)
  const cf = translate(profile, 'Comexim', '30GG', 'Freya')!
  check('Comexim→Freya sizes DOWN in cup', cupIdx(cf.toSize) < cupIdx('30GG'), cf.toSize)

  // Elomi bands run large → from Freya you size DOWN a band in Elomi
  const fe = translate(profile, 'Freya', '32G', 'Elomi')!
  check('Freya→Elomi drops a band', fe.band < 32, `band=${fe.band}`)
}

console.log('\n── round-trip A→B→A returns near the start ──')
{
  for (const [a, b, sz] of [['Freya', 'Panache', '30F'], ['Comexim', 'Fantasie', '28FF'], ['Wacoal', 'Cleo', '34DD']] as const) {
    const fwd = translate(profile, a, sz, b)
    if (!fwd) { check(`${a}→${b} exists`, false); continue }
    const back = translate(profile, b, fwd.toSize, a)!
    const d = Math.abs(cupIdx(back.toSize) - cupIdx(sz)) + Math.abs(back.band - parseSize(sz)!.band) / 2
    check(`${a} ${sz} →${b} ${fwd.toSize} →${a} ${back.toSize} (≈ start)`, d <= 1, `drift ${d}`)
  }
}

console.log('\n── HONESTY: geometry/consensus disagreement is FLAGGED, not hidden ──')
{
  // Across all consensus-brand pairs, any translation where geometry disagrees >1 cup
  // must be downgraded from "high" and carry the "unverified" note — never silently high.
  let flagged = 0, conflicts = 0
  const cb = ['Freya', 'Panache', 'Cleo', 'Fantasie', 'Elomi', 'Comexim', 'Ewa Michalak', 'Wacoal']
  for (const a of cb) for (const b of cb) {
    if (a === b) continue
    const t = translate(profile, a, '30F', b)
    if (!t || t.disagreementCups === undefined) continue
    if (t.disagreementCups > 1) {
      conflicts++
      if (t.confidence !== 'high' && /unverified/.test(t.note)) flagged++
    }
  }
  console.log(`    ${conflicts} geometry/consensus conflicts found; ${flagged} correctly downgraded+flagged`)
  check('every conflict is downgraded + flagged (never silently high)', conflicts === 0 || flagged === conflicts)
}

console.log('\n── geometry-only fallback for non-consensus brands is marked low-confidence ──')
{
  // pick a brand with profile data but no consensus entry
  const noConsensus = Object.keys(profile).find((b) => !['Freya', 'Panache', 'Cleo', 'Sculptresse', 'Ewa Michalak', 'Natori', 'Elomi', 'Wacoal', 'Fantasie', 'Curvy Kate', 'Comexim'].includes(b))
  if (noConsensus) {
    const t = translate(profile, 'Freya', '30F', noConsensus)
    check(`Freya→${noConsensus} is geometry/low-confidence`, !t || t.confidence === 'low' || t.basis === 'geometry', `${t?.confidence} ${t?.basis}`)
  } else check('found a non-consensus brand', false)
}

console.log('\n── cross-brand table is ordered by confidence ──')
{
  const rows = crossBrandTable(profile, 'Freya', '30F')
  check('returns many brands', rows.length > 8, `${rows.length}`)
  const order = ['high', 'medium', 'low', 'estimate']
  let ok = true
  for (let i = 1; i < rows.length; i++) if (order.indexOf(rows[i].t.confidence) < order.indexOf(rows[i - 1].t.confidence)) ok = false
  check('sorted best-confidence first', ok)
  check('high-confidence rows exist (consensus brands)', rows.some((r) => r.t.confidence === 'high'))
}

console.log(`\n${fail === 0 ? '✅ ALL PASS' : '❌ FAILURES'} — ${pass} passed, ${fail} failed\n`)
if (fail > 0) process.exit(1)
