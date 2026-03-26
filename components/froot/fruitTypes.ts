export interface FruitType {
  id: string
  emoji: string
  name: string
  tagline: string
  description: string
  braTip: string
  rarity: 'common' | 'uncommon' | 'rare'
  color: string
  colorEnd: string
  textColor: string
}

export const FRUIT_TYPES: Record<string, FruitType> = {
  cherry: {
    id: 'cherry',
    emoji: '🍒',
    name: 'Cherry',
    tagline: 'Compact. Close-set. Quietly powerful.',
    description:
      "You're the reason 'small' is a lie the bra industry tells. Narrow root, low projection — you don't need padding, you need cups that actually sit flat instead of gaping. Most A and B cups are designed wrong for you.",
    braTip: "Plunge and demi styles. Skip anything with wide-set straps — they'll slide right off.",
    rarity: 'common',
    color: '#9B1B30',
    colorEnd: '#DC143C',
    textColor: '#FFF5F5',
  },
  lemon: {
    id: 'lemon',
    emoji: '🍋',
    name: 'Lemon',
    tagline: 'Wide-set. Subtle. Deceptively complex.',
    description:
      "You confuse fitters because your tissue spreads wide but sits close to your chest. Nothing 'small' about your actual volume — it's just distributed. You've been sized down when you should have been sized out.",
    braTip: "Side-support bras, wide underwire. Skip push-ups — you don't need the lift, you need the width.",
    rarity: 'uncommon',
    color: '#B45309',
    colorEnd: '#F59E0B',
    textColor: '#451A03',
  },
  tangerine: {
    id: 'tangerine',
    emoji: '🍊',
    name: 'Tangerine',
    tagline: 'Top-full. Balanced. Almost easy to fit.',
    description:
      "You're the shape most bras are designed for, which sounds great — except brands assume your bottom matches your top. You overflow at the top of cups that technically 'fit.' Sister sizing up is your secret weapon.",
    braTip: "Full coverage or balconette. Skip demi cups — you'll spill over before lunch.",
    rarity: 'common',
    color: '#C2410C',
    colorEnd: '#FB923C',
    textColor: '#FFF7ED',
  },
  apple: {
    id: 'apple',
    emoji: '🍎',
    name: 'Apple',
    tagline: 'Round. Even. The golden ratio.',
    description:
      "Equal fullness top and bottom, moderate everything. You're the shape bra designers dream about. Most styles work — your real challenge is finding the ones that work perfectly instead of just fine.",
    braTip: "You can wear almost anything. Lean into what you love, not what a chart says you 'should' wear.",
    rarity: 'common',
    color: '#BE123C',
    colorEnd: '#FB7185',
    textColor: '#FFF1F2',
  },
  pear: {
    id: 'pear',
    emoji: '🍐',
    name: 'Pear',
    tagline: 'Bottom-heavy. Teardrop. Gravitational elegance.',
    description:
      "Your volume sits low. Cups that fit the top half leave empty space below. Cups that fit the bottom gap at the top. Molded foam fights your shape — unlined bras surrender to it in the best way.",
    braTip: "Unlined seamed cups, three-part construction. Skip molded foam — it'll never match your natural shape.",
    rarity: 'common',
    color: '#4D7C0F',
    colorEnd: '#84CC16',
    textColor: '#F7FEE7',
  },
  mango: {
    id: 'mango',
    emoji: '🥭',
    name: 'Mango',
    tagline: 'Projected. Narrow. The unicorn shape.',
    description:
      "You need DEPTH, not width. Most bras flatten you because they're built for wide, shallow tissue. When you lean forward, everything goes straight ahead. You've been sized into cups that are too wide and too shallow your entire life.",
    braTip: 'Polish brands (Ewa Michalak) and UK brands (Panache, Freya). Skip VS — their cups are way too shallow for you.',
    rarity: 'rare',
    color: '#D97706',
    colorEnd: '#FBBF24',
    textColor: '#451A03',
  },
  peach: {
    id: 'peach',
    emoji: '🍑',
    name: 'Peach',
    tagline: 'Full. Round. Projected. Main character energy.',
    description:
      "Volume, projection, and bottom fullness — the trifecta. When you find the right bra, the difference is visible from across the room. Balconettes were invented for you. Stop settling for 'close enough.'",
    braTip: 'Balconettes and unlined seamed cups. Skip minimizers forever — embrace the peach.',
    rarity: 'uncommon',
    color: '#EA580C',
    colorEnd: '#FDBA74',
    textColor: '#431407',
  },
  melon: {
    id: 'melon',
    emoji: '🍈',
    name: 'Melon',
    tagline: 'Big. Wide-rooted. Unapologetically present.',
    description:
      "Wide root, serious projection — you take up space and the bra industry wants you in beige minimizers. Your tissue extends under your arms, so narrow underwires dig in. You need width AND depth, which most brands refuse to make.",
    braTip: 'Elomi, Goddess, Curvy Kate. Wide wires, tall gores, side panels. Skip anything that promises to minimize.',
    rarity: 'uncommon',
    color: '#059669',
    colorEnd: '#6EE7B7',
    textColor: '#022C22',
  },
}

export type Projection = 'shallow' | 'average' | 'projected'
export type Fullness = 'full-on-top' | 'even' | 'full-on-bottom'
export type RootWidth = 'narrow' | 'average' | 'wide'

export function getFruitType(projection: Projection, fullness: Fullness, rootWidth: RootWidth): FruitType {
  // Wide root + projected always → melon
  if (projection === 'projected' && rootWidth === 'wide') return FRUIT_TYPES.melon

  if (projection === 'shallow') {
    return rootWidth === 'narrow' ? FRUIT_TYPES.cherry : FRUIT_TYPES.lemon
  }

  if (projection === 'average') {
    if (fullness === 'full-on-top') return FRUIT_TYPES.tangerine
    if (fullness === 'even') return FRUIT_TYPES.apple
    return FRUIT_TYPES.pear
  }

  // projected + narrow/average root
  if (fullness === 'full-on-bottom') return FRUIT_TYPES.peach
  return FRUIT_TYPES.mango
}
