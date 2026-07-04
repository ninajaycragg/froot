import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

// fit-outcome — THE MOAT's write path. Every fit-field verdict shown becomes a
// (body → exact SKU → prediction → outcome) row. Events land in Redis:
//   froot:fitev:<id>       the full event (90-day TTL until an outcome arrives)
//   froot:fit-events       append-only id stream
// Degrades gracefully: without Redis env the client's localStorage copy is the log.

let redis: Redis | null = null
function getRedis(): Redis | null {
  if (redis) return redis
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  redis = new Redis({ url, token })
  return redis
}

const KEY = (id: string) => `froot:fitev:${id}`
const STREAM = 'froot:fit-events'
const PENDING_TTL = 60 * 60 * 24 * 90 // unlabeled rows expire; labeled rows persist

export async function POST(req: Request) {
  try {
    const ev = await req.json()
    if (!ev?.id || !ev?.sku?.styleId || !ev?.body) {
      return NextResponse.json({ error: 'malformed fit event' }, { status: 400 })
    }
    const r = getRedis()
    if (!r) return NextResponse.json({ ok: true, stored: false })
    ev.serverTs = Date.now()
    await r.set(KEY(ev.id), ev, ev.outcome ? undefined : { ex: PENDING_TTL })
    await r.rpush(STREAM, ev.id)
    return NextResponse.json({ ok: true, stored: true })
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, outcome, symptom } = await req.json()
    if (!id || !outcome) {
      return NextResponse.json({ error: 'id and outcome required' }, { status: 400 })
    }
    const r = getRedis()
    if (!r) return NextResponse.json({ ok: true, stored: false })
    const ev = await r.get<Record<string, unknown>>(KEY(id))
    if (!ev) return NextResponse.json({ error: 'unknown event' }, { status: 404 })
    ev.outcome = outcome
    if (symptom) ev.symptom = symptom
    ev.outcomeTs = Date.now()
    await r.set(KEY(id), ev) // labeled — drop the TTL, this row is the company
    return NextResponse.json({ ok: true, stored: true })
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
}
