import type { ShapeProfile, AestheticGoal } from './sizing'

// ── Goal → style tag affinity ──
// How well each bra style achieves each aesthetic goal (0–1)
const GOAL_AFFINITY: Record<AestheticGoal, Record<string, number>> = {
  lifted: {
    'push up': 1.0, balconette: 0.9, plunge: 0.7, molded: 0.6,
    'full coverage': 0.5, demi: 0.7, sports: 0.3, wireless: 0.2,
    unlined: 0.4, strapless: 0.5, seamed: 0.5, minimizer: 0.1,
  },
  cleavage: {
    plunge: 1.0, 'push up': 0.9, demi: 0.7, balconette: 0.6,
    molded: 0.4, 'full coverage': 0.1, sports: 0.0, wireless: 0.1,
    unlined: 0.3, strapless: 0.3, minimizer: 0.0,
  },
  natural: {
    unlined: 1.0, seamed: 0.9, wireless: 0.8, balconette: 0.6,
    'full coverage': 0.5, plunge: 0.5, demi: 0.5, molded: 0.2,
    'push up': 0.1, sports: 0.4, minimizer: 0.3,
  },
  smooth: {
    molded: 1.0, 't-shirt': 1.0, 'push up': 0.6, strapless: 0.7,
    'full coverage': 0.6, plunge: 0.5, demi: 0.5, minimizer: 0.7,
    unlined: 0.1, seamed: 0.0, wireless: 0.3,
  },
  comfortable: {
    wireless: 1.0, sports: 0.9, unlined: 0.8, 'full coverage': 0.6,
    molded: 0.5, seamed: 0.5, balconette: 0.3, plunge: 0.3,
    'push up': 0.1, demi: 0.3, strapless: 0.1, minimizer: 0.5,
  },
}

// How well a goal matches a shape combination → score boost
// Some goals work better with certain shapes
const SHAPE_GOAL_BOOST: Record<AestheticGoal, (shape: ShapeProfile) => number> = {
  lifted: (s) => {
    let boost = 0
    if (s.fullness === 'full-on-bottom') boost += 0.15 // bottom fullness benefits most from lift
    if (s.projection === 'shallow') boost += 0.1 // shallow shapes look perkier with push-up
    return boost
  },
  cleavage: (s) => {
    let boost = 0
    if (s.projection === 'projected') boost += 0.15 // projected = more natural cleavage
    if (s.rootWidth === 'narrow') boost += 0.1 // narrow roots push tissue closer together
    if (s.fullness === 'full-on-top') boost += 0.1
    return boost
  },
  natural: (s) => {
    let boost = 0
    if (s.projection === 'projected') boost += 0.1 // projected shapes look great unlined
    if (s.fullness === 'even') boost += 0.05
    return boost
  },
  smooth: () => 0, // works for everyone equally
  comfortable: (s) => {
    let boost = 0
    if (s.rootWidth === 'wide') boost += 0.1 // wide roots benefit more from wireless
    if (s.projection === 'shallow') boost += 0.05
    return boost
  },
}

// ── Visual outcome descriptions ──
// (goal × style tag × shape) → what this bra will actually do for you
type DescriptionFn = (shape: ShapeProfile) => string

const LOOK_DESCRIPTIONS: Record<string, Record<AestheticGoal, DescriptionFn>> = {
  plunge: {
    lifted: (s) => s.projection === 'projected'
      ? 'lifts your natural shape forward and up'
      : 'pushes tissue forward for a perkier profile',
    cleavage: (s) => s.rootWidth === 'narrow'
      ? 'deep, centered cleavage \u2014 your narrow roots make this effortless'
      : 'brings everything together for a defined V',
    natural: () => 'your natural shape with a low neckline',
    smooth: () => 'clean plunge line under V-necks',
    comfortable: () => 'open neckline without pressure at the center',
  },
  balconette: {
    lifted: (s) => s.fullness === 'full-on-bottom'
      ? 'shelf-like lift that rounds you out on top'
      : 'lifts and frames your natural shape beautifully',
    cleavage: () => 'soft, rounded cleavage with a wider set',
    natural: () => 'shows off your shape with a straight-across cut',
    smooth: () => 'smooth lift under square and boat necklines',
    comfortable: () => 'wider straps, less digging, all-day lift',
  },
  'push up': {
    lifted: (s) => s.fullness === 'full-on-bottom'
      ? 'maximizes your lift \u2014 rounds out your top half'
      : 'amplifies your natural perkiness',
    cleavage: (s) => s.projection === 'shallow'
      ? 'adds the projection you want for visible cleavage'
      : 'pushes your natural projection together and up',
    natural: () => 'enhanced but still looks like you',
    smooth: () => 'rounded, symmetrical shape under anything',
    comfortable: () => 'padded support with a gentle push',
  },
  'full coverage': {
    lifted: () => 'full support that keeps everything lifted all day',
    cleavage: () => 'modest coverage \u2014 not a cleavage style',
    natural: () => 'encases your full shape for an even silhouette',
    smooth: () => 'no spillage, no lines \u2014 completely smooth',
    comfortable: () => 'full support, full comfort, nothing poking out',
  },
  molded: {
    lifted: () => 'structured lift with a consistent shape',
    cleavage: () => 'rounded shape with a subtle push together',
    natural: () => 'light shaping that follows your contour',
    smooth: () => 'invisible under t-shirts \u2014 no seams, no texture',
    comfortable: () => 'light foam cushion, consistent fit',
  },
  't-shirt': {
    lifted: () => 'subtle lift with a seamless look',
    cleavage: () => 'smooth, rounded shape under everything',
    natural: () => 'your shape, but smoother',
    smooth: () => 'literally invisible under anything \u2014 that\u2019s the whole point',
    comfortable: () => 'the everyday bra that disappears',
  },
  unlined: {
    lifted: (s) => s.projection === 'projected'
      ? 'your natural forward shape, just lifted'
      : 'gentle lift without changing your shape',
    cleavage: () => 'shows what you\u2019ve got without adding anything',
    natural: (s) => s.projection === 'projected'
      ? 'lets your natural projection shine \u2014 no foam fighting your shape'
      : 'your real shape, just supported',
    smooth: () => 'not the smoothest option, but the most honest',
    comfortable: () => 'nothing between you and the fabric \u2014 just support',
  },
  wireless: {
    lifted: () => 'soft lift without any wire pressure',
    cleavage: () => 'relaxed, natural \u2014 not a cleavage style',
    natural: () => 'closest to going braless while still supported',
    smooth: () => 'soft shape, no wire lines',
    comfortable: (s) => s.rootWidth === 'wide'
      ? 'no wire digging into your wide roots \u2014 freedom'
      : 'all-day comfort without a single wire',
  },
  sports: {
    lifted: () => 'compression lift that locks everything in place',
    cleavage: () => 'not the vibe \u2014 but you\u2019ll look athletic',
    natural: () => 'minimized for movement',
    smooth: () => 'streamlined silhouette under activewear',
    comfortable: () => 'built to move with you, not against you',
  },
  demi: {
    lifted: (s) => s.fullness === 'full-on-top'
      ? 'shows off your top fullness with a perky half-cup lift'
      : 'pushes tissue up into a rounder shape',
    cleavage: () => 'half-cup cut that creates natural-looking cleavage',
    natural: () => 'less coverage, more of your natural shape',
    smooth: () => 'low-cut and smooth under scoop necks',
    comfortable: () => 'lighter coverage, less fabric, still supportive',
  },
  minimizer: {
    lifted: () => 'redistributes tissue for a flatter, lifted look',
    cleavage: () => 'designed to minimize, not enhance',
    natural: () => 'reduces your silhouette by about a cup size',
    smooth: () => 'flatter profile under structured tops and blazers',
    comfortable: () => 'spreads the weight for a lighter feel',
  },
  strapless: {
    lifted: () => 'grip-based lift without straps',
    cleavage: () => 'subtle cleavage that works off-shoulder',
    natural: () => 'your shape without strap lines',
    smooth: () => 'bare shoulders, clean lines',
    comfortable: () => 'the best strapless is one you forget about',
  },
}

// Fallback for tags not in the lookup
const FALLBACK: Record<AestheticGoal, string> = {
  lifted: 'supportive lift',
  cleavage: 'shapes and centers',
  natural: 'lets your shape lead',
  smooth: 'clean lines under clothes',
  comfortable: 'easy, all-day wear',
}

/**
 * Get the affinity score for a style's tags against a goal
 */
export function goalAffinity(tags: string[], goal: AestheticGoal, shape: ShapeProfile): number {
  const affinities = GOAL_AFFINITY[goal]
  if (!affinities) return 0

  // Take the best matching tag
  let best = 0
  for (const tag of tags) {
    const score = affinities[tag] ?? 0.3
    if (score > best) best = score
  }

  // Add shape-specific boost
  const boost = SHAPE_GOAL_BOOST[goal]?.(shape) ?? 0
  return Math.min(1, best + boost)
}

/**
 * Get a one-line description of what this bra does for this person
 */
export function getLookDescription(tags: string[], goal: AestheticGoal, shape: ShapeProfile): string {
  // Find the most specific matching tag
  for (const tag of tags) {
    const descriptions = LOOK_DESCRIPTIONS[tag]
    if (descriptions?.[goal]) {
      return descriptions[goal](shape)
    }
  }
  return FALLBACK[goal]
}
