// fit-loop — THE MOAT.
//
// Everyone else outputs a size label. froot's durable asset is the labeled loop:
// every recommendation tied to (body → exact SKU → predicted fit → real outcome).
// The model is just the bootstrap; this table is the company. We log the event the
// moment a recommendation is shown, and patch it with the real outcome later
// (kept / returned / "actually fit"). One append-only stream = ground truth nobody
// else has.
'use client'

export interface FitEvent {
  /** event id (timestamp-based, stamped server-side too) */
  id: string
  ts: number
  /** anonymous body fingerprint — the shape params + raw measurements */
  body: {
    band: number
    bustDiff: number
    proj: number
    rootHalfW: number
    apexDrop: number
    projection: string
    fullness: string
    rootWidth: string
  }
  /** the exact SKU + size the field was computed against */
  sku: {
    styleId: string
    brand: string
    style: string
    size: string
    band: number
    cupUK: string
  }
  /** what froot PREDICTED (this is the label we'll grade against the outcome) */
  prediction: {
    fitScore: number
    zones: { zone: string; state: string; clr: number }[]
    bandState: string
  }
  /** filled in later when the real outcome arrives */
  outcome?: 'kept' | 'returned' | 'fit' | 'too-small' | 'too-big' | null
  /** off-policy logging: how the shown SKU was drawn (propensity = P(shown|policy)).
      Without this the outcome can't be turned into an unbiased counterfactual label. */
  policy?: {
    epsilon: number
    propensity: number
    arm: 'exploit' | 'explore'
    candidateCount: number
  }
  /** symptom-space return reason (the community's vocabulary), e.g. "cup-gaped". */
  symptom?: string
}

const LS_KEY = 'froot.fitEvents'

/** Append locally (instant, offline-safe) and fire-and-forget to the server. */
export async function logFitEvent(ev: Omit<FitEvent, 'id' | 'ts'>): Promise<string> {
  const id = `fe_${Math.round(performance.now())}_${Math.floor(performance.timeOrigin)}`
  const full: FitEvent = { ...ev, id, ts: Date.now() }
  try {
    const prior: FitEvent[] = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
    prior.push(full)
    localStorage.setItem(LS_KEY, JSON.stringify(prior.slice(-200)))
  } catch {
    /* storage may be unavailable */
  }
  try {
    await fetch('/api/froot/fit-outcome', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(full),
    })
  } catch {
    /* offline — the local copy is the fallback; we can flush later */
  }
  return id
}

/** Patch an event with its real-world outcome (the actual training label). */
export async function recordOutcome(eventId: string, outcome: NonNullable<FitEvent['outcome']>): Promise<void> {
  try {
    const prior: FitEvent[] = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
    const hit = prior.find((e) => e.id === eventId)
    if (hit) {
      hit.outcome = outcome
      localStorage.setItem(LS_KEY, JSON.stringify(prior))
    }
  } catch {
    /* ignore */
  }
  try {
    await fetch('/api/froot/fit-outcome', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: eventId, outcome }),
    })
  } catch {
    /* offline */
  }
}
