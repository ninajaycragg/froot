import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

// track — the purchase-intent stream. BuyButton beacons every shop click here
// (brand/style/size/url/via). Until now this endpoint didn't exist, so the whole
// stream 404'd into the void — the (recommendation → buy intent) half of the loop
// was being thrown away. Events land in Redis:
//   froot:track-events   append-only list of small JSON events
// Analytics is never load-bearing: malformed input and missing Redis both degrade
// to a quiet 200 so the click itself is never slowed or broken.

let redis: Redis | null = null
function getRedis(): Redis | null {
  if (redis) return redis
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  redis = new Redis({ url, token })
  return redis
}

const STREAM = 'froot:track-events'
const MAX_BYTES = 4096 // shop-click events are tiny; anything bigger isn't ours

export async function POST(req: Request) {
  try {
    const raw = await req.text()
    if (!raw || raw.length > MAX_BYTES) return NextResponse.json({ ok: true, stored: false })
    const ev = JSON.parse(raw) as Record<string, unknown>
    if (typeof ev !== 'object' || ev === null || typeof ev.event !== 'string') {
      return NextResponse.json({ ok: true, stored: false })
    }
    const r = getRedis()
    if (!r) return NextResponse.json({ ok: true, stored: false })
    ev.serverTs = Date.now()
    await r.rpush(STREAM, JSON.stringify(ev))
    return NextResponse.json({ ok: true, stored: true })
  } catch {
    // never 500 an analytics beacon
    return NextResponse.json({ ok: true, stored: false })
  }
}
