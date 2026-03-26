// ── Froot Sizing Algorithm ──
// Shape-aware bra sizing that improves on the ABTF method
// by weighting bust measurements based on projection profile.

export interface Measurements {
  looseUnderbust: number
  snugUnderbust: number
  tightUnderbust: number
  standingBust: number
  leaningBust: number
  lyingBust: number
  unit: 'in' | 'cm'
}

export interface ShapeProfile {
  projection: 'projected' | 'moderate' | 'shallow'
  fullness: 'full-on-top' | 'even' | 'full-on-bottom'
  rootWidth: 'narrow' | 'average' | 'wide'
}

export type AestheticGoal = 'lifted' | 'cleavage' | 'natural' | 'smooth' | 'comfortable'

export interface SizeResult {
  bandSize: number
  cupIndex: number
  cupUS: string
  cupUK: string
  sizeUS: string
  sizeUK: string
  sisterUp: { us: string; uk: string }
  sisterDown: { us: string; uk: string }
  bustDifference: number
  shapeProfile: ShapeProfile
  notes: string[]
}

// ── Cup progressions ──

const US_CUPS = [
  'A', 'B', 'C', 'D', 'DD', 'DDD/F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N',
]

const UK_CUPS = [
  'A', 'B', 'C', 'D', 'DD', 'E', 'F', 'FF', 'G', 'GG', 'H', 'HH', 'J', 'JJ', 'K', 'KK', 'L',
]

// ── Helpers ──

function toInches(value: number, unit: 'in' | 'cm'): number {
  return unit === 'cm' ? value / 2.54 : value
}

function roundToEven(n: number): number {
  const rounded = Math.round(n)
  return rounded % 2 === 0 ? rounded : (n - Math.floor(n) >= 0.5 ? rounded + 1 : rounded - 1)
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

// ── Band ──

function calculateBand(m: Measurements): { band: number; notes: string[] } {
  const snug = toInches(m.snugUnderbust, m.unit)
  const tight = toInches(m.tightUnderbust, m.unit)
  const loose = toInches(m.looseUnderbust, m.unit)
  const notes: string[] = []

  let band = roundToEven(snug)
  band = clamp(band, 26, 48)

  // Compression tolerance flags
  const compressionRange = snug - tight
  if (compressionRange > 3) {
    notes.push('You have a very compressible ribcage — if the band feels loose, try sizing down.')
  } else if (compressionRange < 1) {
    notes.push('Your ribcage has low compressibility — if the band feels tight, try sizing up.')
  }

  // Loose vs snug gap
  if (loose - snug > 2.5) {
    notes.push('There\'s a big difference between your loose and snug underbust, so band comfort may vary between brands.')
  }

  return { band, notes }
}

// ── Cup ──

function calculateCup(
  m: Measurements,
  band: number,
  shape: ShapeProfile,
): { cupIndex: number; difference: number; notes: string[] } {
  const snug = toInches(m.snugUnderbust, m.unit)
  const standing = toInches(m.standingBust, m.unit) - snug
  const leaning = toInches(m.leaningBust, m.unit) - snug
  const lying = toInches(m.lyingBust, m.unit) - snug
  const notes: string[] = []

  // Shape-weighted average
  let avg: number
  if (shape.projection === 'projected') {
    avg = (standing + leaning * 2 + lying) / 4
  } else if (shape.projection === 'shallow') {
    avg = (standing * 2 + leaning + lying) / 4
  } else {
    avg = (standing + leaning + lying) / 3
  }

  // Safety cap for very projected tissue
  if (leaning - standing > 2.5) {
    const capped = (standing + lying) / 2 + 1
    avg = Math.min(avg, capped)
    notes.push('Your leaning measurement is significantly larger than standing — you likely have projected tissue.')
  }

  const cupIndex = clamp(Math.round(avg) - 1, 0, UK_CUPS.length - 1)

  return { cupIndex, difference: avg, notes }
}

// ── Sister sizes ──

function formatSize(band: number, cupIndex: number, system: 'us' | 'uk'): string {
  const cups = system === 'us' ? US_CUPS : UK_CUPS
  const idx = clamp(cupIndex, 0, cups.length - 1)
  return `${band}${cups[idx]}`
}

function sisterSizes(band: number, cupIndex: number): {
  up: { us: string; uk: string }
  down: { us: string; uk: string }
} {
  const upBand = band + 2
  const upCup = Math.max(cupIndex - 1, 0)
  const downBand = Math.max(band - 2, 26)
  const downCup = Math.min(cupIndex + 1, UK_CUPS.length - 1)

  return {
    up: { us: formatSize(upBand, upCup, 'us'), uk: formatSize(upBand, upCup, 'uk') },
    down: { us: formatSize(downBand, downCup, 'us'), uk: formatSize(downBand, downCup, 'uk') },
  }
}

// ── Shape notes ──

function shapeNotes(shape: ShapeProfile): string[] {
  const notes: string[] = []

  if (shape.projection === 'projected') {
    notes.push('Unlined seamed bras and balconettes tend to work best for projected shapes.')
  } else if (shape.projection === 'shallow') {
    notes.push('Molded cups, demi styles, and bralettes often fit better for shallow shapes.')
  }

  if (shape.fullness === 'full-on-top') {
    notes.push('Full-coverage and balconette styles can help with upper fullness.')
  } else if (shape.fullness === 'full-on-bottom') {
    notes.push('Half-cups and plunge styles tend to complement bottom-heavy fullness.')
  }

  if (shape.rootWidth === 'narrow') {
    notes.push('Look for bras with narrower wires — Polish brands (Ewa Michalak, Comexim) and some Japanese brands tend to have narrower cuts.')
  } else if (shape.rootWidth === 'wide') {
    notes.push('Wider-wired bras from brands like Elomi, Goddess, and Curvy Kate may be more comfortable.')
  }

  return notes
}

// ── Fit Check types ──

export type BandFit = 'too_tight' | 'slightly_tight' | 'good' | 'too_loose'
export type CupFit = 'spilling' | 'gaping' | 'too_shallow' | 'good'

export interface FitCheckInput {
  currentBrand: string
  currentSize: string
  bandFit: BandFit
  cupFit: CupFit
  issues: string[]
  shape: ShapeProfile
}

// ── Fit Check sizing ──

// Common US cup aliases → UK cup index
const CUP_ALIASES: Record<string, number> = {
  'DDD': 5,    // UK E
  'DDDD': 6,   // UK F
  'G': 8,      // US G = UK G (index 8)
  'H': 10,     // US H = UK H (index 10)
  'I': 8,      // US I ≈ UK G
  'J': 12,     // US J = UK J (index 12)
}

function parseBraSize(sizeStr: string): { band: number; cupIndex: number } | null {
  const match = sizeStr.trim().match(/^(\d{2,3})\s*([A-Za-z]+)$/i)
  if (!match) return null
  const band = parseInt(match[1], 10)
  const cupStr = match[2].toUpperCase()

  // Try UK cups first (most granular)
  let cupIndex = UK_CUPS.indexOf(cupStr)
  if (cupIndex >= 0) return { band, cupIndex }

  // Try US cups
  const usIdx = US_CUPS.indexOf(cupStr)
  if (usIdx >= 0) return { band, cupIndex: usIdx }

  // Try common aliases (DDD, DDDD, etc.)
  if (CUP_ALIASES[cupStr] !== undefined) return { band, cupIndex: CUP_ALIASES[cupStr] }

  return null
}

export function calculateFromFitCheck(
  input: FitCheckInput,
  braData?: Record<string, Record<string, Record<string, number>>>,
): SizeResult {
  const parsed = parseBraSize(input.currentSize)
  const notes: string[] = []

  let band = parsed?.band ?? 34
  let cupIndex = parsed?.cupIndex ?? 3

  // Band adjustment
  if (input.bandFit === 'too_tight') {
    band += 2
    cupIndex = Math.max(cupIndex - 1, 0) // maintain volume
    notes.push('Your current band is too tight — we\'ve sized up the band and adjusted the cup to keep the same volume.')
  } else if (input.bandFit === 'slightly_tight') {
    notes.push('Your band is a little snug. Try your current band size on the loosest hook — if it still digs in, go up a band and down a cup.')
  } else if (input.bandFit === 'too_loose') {
    band -= 2
    cupIndex = Math.min(cupIndex + 1, UK_CUPS.length - 1) // maintain volume
    notes.push('Your band is too loose — we\'ve sized down the band and adjusted the cup to keep the same volume.')
  }

  // Cup adjustment
  if (input.cupFit === 'spilling') {
    cupIndex = Math.min(cupIndex + 1, UK_CUPS.length - 1)
    notes.push('Spilling out of the cups means you need more cup volume — we\'ve sized up one cup.')
  } else if (input.cupFit === 'gaping') {
    cupIndex = Math.max(cupIndex - 1, 0)
    notes.push('Gaps at the top suggest too much cup — we\'ve sized down one cup.')
  } else if (input.cupFit === 'too_shallow') {
    notes.push('Cups feeling flat/shallow is usually a shape issue, not a size issue — try projected, unlined styles with seamed cups.')
  }

  // Issue-based refinements
  if (input.issues.includes('straps_falling')) {
    if (input.bandFit === 'too_loose') {
      notes.push('Straps falling off reinforces that the band is too loose — the band size-down should help anchor the straps.')
    } else if (input.bandFit === 'good' && !input.issues.includes('band_rides_up')) {
      // Band rides up already handles the band adjustment
      band -= 2
      cupIndex = Math.min(cupIndex + 1, UK_CUPS.length - 1)
      notes.push('Straps falling off usually means the band is too loose — we\'ve sized down the band (and up a cup to keep volume).')
    } else {
      notes.push('Straps falling off can also be a strap style issue — try racerback or convertible straps.')
    }
  }
  if (input.issues.includes('wire_pain')) {
    notes.push('Wire pain can mean the cups are too small (wires sit on tissue) or the wire shape doesn\'t match your root — look for wider wires or try a cup size up.')
    if (input.cupFit !== 'spilling') {
      cupIndex = Math.min(cupIndex + 1, UK_CUPS.length - 1)
    }
  }
  if (input.issues.includes('gore_not_flat')) {
    notes.push('The gore not tacking flat is a classic sign of too-small cups — we\'ve added a cup size.')
    cupIndex = Math.min(cupIndex + 1, UK_CUPS.length - 1)
  }
  if (input.issues.includes('band_rides_up')) {
    if (input.bandFit === 'too_tight' || input.bandFit === 'slightly_tight') {
      notes.push('You said the band feels tight but rides up — this usually means the cups are too small, forcing the band up. A cup size up should help.')
    } else if (input.bandFit === 'too_loose') {
      // Already sized down from bandFit, just reinforce
      notes.push('Band riding up confirms it\'s too loose — the band size-down should help.')
    } else {
      // Band feels "good" but rides up → it's actually too loose
      band -= 2
      cupIndex = Math.min(cupIndex + 1, UK_CUPS.length - 1)
      notes.push('A band riding up in back means it\'s too loose — we\'ve sized down the band (and up a cup to keep volume).')
    }
  }

  // Clamp
  band = clamp(band, 26, 48)
  cupIndex = clamp(cupIndex, 0, UK_CUPS.length - 1)

  // Cross-reference with bra data
  if (braData && parsed) {
    const brandData = braData[input.currentBrand]
    const sizeKey = `${parsed.band}${UK_CUPS[parsed.cupIndex]}`
    if (brandData && brandData[sizeKey]) {
      const currentMeasurements = brandData[sizeKey]
      notes.push(`Your ${input.currentBrand} ${input.currentSize} measures: cup depth ${currentMeasurements.cd}", cup width ${currentMeasurements.cw}", wire length ${currentMeasurements.wl || '?'}".`)
    }
  }

  const shapeAdvice = shapeNotes(input.shape)
  const sisters = sisterSizes(band, cupIndex)

  return {
    bandSize: band,
    cupIndex,
    cupUS: US_CUPS[clamp(cupIndex, 0, US_CUPS.length - 1)],
    cupUK: UK_CUPS[clamp(cupIndex, 0, UK_CUPS.length - 1)],
    sizeUS: formatSize(band, cupIndex, 'us'),
    sizeUK: formatSize(band, cupIndex, 'uk'),
    sisterUp: sisters.up,
    sisterDown: sisters.down,
    bustDifference: cupIndex + 1,
    shapeProfile: input.shape,
    notes: [...notes, ...shapeAdvice],
  }
}

// ── Main export ──

export function calculateSize(m: Measurements, shape: ShapeProfile): SizeResult {
  const { band, notes: bandNotes } = calculateBand(m)
  const { cupIndex, difference, notes: cupNotes } = calculateCup(m, band, shape)
  const sisters = sisterSizes(band, cupIndex)
  const shapeAdvice = shapeNotes(shape)

  return {
    bandSize: band,
    cupIndex,
    cupUS: US_CUPS[clamp(cupIndex, 0, US_CUPS.length - 1)],
    cupUK: UK_CUPS[clamp(cupIndex, 0, UK_CUPS.length - 1)],
    sizeUS: formatSize(band, cupIndex, 'us'),
    sizeUK: formatSize(band, cupIndex, 'uk'),
    sisterUp: sisters.up,
    sisterDown: sisters.down,
    bustDifference: difference,
    shapeProfile: shape,
    notes: [...bandNotes, ...cupNotes, ...shapeAdvice],
  }
}
