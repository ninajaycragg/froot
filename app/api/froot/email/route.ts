import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

// email — subscriber capture. Previously wrote to data/froot-subscribers.json via
// writeFileSync, which 500s on Vercel's read-only filesystem — every subscriber
// was silently lost in prod. Now lands in Redis (same store as the fit loop):
//   froot:subscribers   hash keyed by lowercased email → record (free dedupe)
// Degrades gracefully: without Redis env we still 200 (never punish the signup),
// flagged stored:false so it's visible in dev.
// TODO: wire actual sending (Resend) — capture is the durable part; send can wait.

let redis: Redis | null = null
function getRedis(): Redis | null {
  if (redis) return redis
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  redis = new Redis({ url, token })
  return redis
}

const HASH = 'froot:subscribers'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, sizeUK, sizeUS, shape, goal, topMatches } = body

    if (typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }
    const key = email.toLowerCase().trim()

    const r = getRedis()
    if (!r) return NextResponse.json({ ok: true, message: 'Subscribed', stored: false })

    // hash keyed by email → duplicate signups just refresh the record
    await r.hset(HASH, {
      [key]: JSON.stringify({
        email: key,
        sizeUK,
        sizeUS,
        shape,
        goal,
        topMatches: Array.isArray(topMatches) ? topMatches.slice(0, 5) : undefined,
        timestamp: new Date().toISOString(),
      }),
    })

    return NextResponse.json({ ok: true, message: 'Subscribed', stored: true })
  } catch (err) {
    console.error('Email subscribe error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
