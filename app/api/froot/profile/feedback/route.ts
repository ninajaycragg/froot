import { NextResponse } from 'next/server'
import { getCurrentProfile, updateProfile } from '@/lib/froot-auth'
import { randomBytes } from 'crypto'

// POST — submit fit feedback for a purchased bra
export async function POST(req: Request) {
  const profile = await getCurrentProfile()
  if (!profile) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const body = await req.json()
  const { brand, style, size, rating, bandFit, cupFit, notes } = body

  if (!brand || !style || !size || !rating) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const validRatings = ['perfect', 'good', 'okay', 'bad']
  if (!validRatings.includes(rating)) {
    return NextResponse.json({ error: 'Invalid rating' }, { status: 400 })
  }

  const feedback = {
    id: randomBytes(8).toString('hex'),
    brand,
    style,
    size,
    rating,
    bandFit: bandFit || undefined,
    cupFit: cupFit || undefined,
    notes: notes ? String(notes).slice(0, 500) : undefined,
    createdAt: new Date().toISOString(),
  }

  const existing = profile.fitFeedback || []
  await updateProfile(profile.id, {
    fitFeedback: [...existing, feedback],
  })

  return NextResponse.json({ ok: true, feedback })
}
