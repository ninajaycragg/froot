import { NextResponse } from 'next/server'
import { appendFileSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'

const SUBSCRIBERS_FILE = join(process.cwd(), 'data', 'froot-subscribers.json')

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, sizeUK, sizeUS, shape, goal, topMatches } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    // Load existing subscribers
    let subscribers: Array<Record<string, unknown>> = []
    if (existsSync(SUBSCRIBERS_FILE)) {
      try {
        subscribers = JSON.parse(readFileSync(SUBSCRIBERS_FILE, 'utf-8'))
      } catch {
        subscribers = []
      }
    }

    // Check for duplicate
    const exists = subscribers.some(s => s.email === email.toLowerCase().trim())
    if (!exists) {
      subscribers.push({
        email: email.toLowerCase().trim(),
        sizeUK,
        sizeUS,
        shape,
        goal,
        topMatches: topMatches?.slice(0, 5),
        timestamp: new Date().toISOString(),
      })

      // Write back
      const { writeFileSync } = await import('fs')
      writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2))
    }

    // TODO: Wire up actual email sending (Resend, SendGrid, etc.)
    // For now, just stores the subscriber data

    return NextResponse.json({ ok: true, message: 'Subscribed' })
  } catch (err) {
    console.error('Email subscribe error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
