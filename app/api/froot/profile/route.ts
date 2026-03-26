import { NextResponse } from 'next/server'
import { getCurrentProfile, updateProfile, createMagicToken, destroySession } from '@/lib/froot-auth'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// GET — return current profile (or null)
export async function GET() {
  const profile = await getCurrentProfile()
  if (!profile) {
    return NextResponse.json({ profile: null })
  }

  return NextResponse.json({
    profile: {
      id: profile.id,
      email: profile.email,
      sizeUK: profile.sizeUK,
      sizeUS: profile.sizeUS,
      bandSize: profile.bandSize,
      shape: profile.shape,
      goal: profile.goal,
      measurements: profile.measurements,
      savedMatches: profile.savedMatches,
      fitFeedback: profile.fitFeedback,
      createdAt: profile.createdAt,
    },
  })
}

// POST — send magic link OR update profile
export async function POST(req: Request) {
  try {
  const body = await req.json()
  console.log('[froot/profile] POST action:', body.action)

  // ── Magic link request ──
  if (body.action === 'login') {
    const { email } = body
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    console.log('[froot/profile] Creating magic token for:', email)
    const token = await createMagicToken(email)
    console.log('[froot/profile] Token created, sending email...')
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || req.headers.get('origin') || 'http://localhost:3000'
    const link = `${baseUrl}/api/froot/profile/verify?token=${token}`

    if (resend) {
      try {
        await resend.emails.send({
          from: 'Froot <onboarding@resend.dev>',
          to: email.toLowerCase().trim(),
          subject: 'Your Froot login link',
          html: `
            <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
              <p style="font-size: 14px; color: #8A7060; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 24px;">froot</p>
              <p style="font-size: 18px; color: #1A0808; line-height: 1.6; margin-bottom: 24px;">
                Tap below to access your size profile. This link expires in 15 minutes.
              </p>
              <a href="${link}" style="display: inline-block; padding: 14px 32px; background: #D4A020; color: #FAF6EE; text-decoration: none; border-radius: 24px; font-family: monospace; font-size: 12px; letter-spacing: 0.1em;">
                OPEN MY PROFILE
              </a>
              <p style="font-size: 12px; color: #B8A898; margin-top: 32px; line-height: 1.6;">
                If you didn't request this, just ignore it. No account was created without your say-so.
              </p>
            </div>
          `,
        })
      } catch (err) {
        console.error('Resend error:', err)
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
      }
    } else {
      // Dev fallback: log link to console
      console.log(`\n✉️  Magic link for ${email}: ${link}\n`)
    }

    return NextResponse.json({ ok: true, message: 'Check your email' })
  }

  // ── Save results to profile ──
  if (body.action === 'save') {
    const profile = await getCurrentProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    }

    const updates: Record<string, unknown> = {}
    if (body.sizeUK) updates.sizeUK = body.sizeUK
    if (body.sizeUS) updates.sizeUS = body.sizeUS
    if (body.bandSize) updates.bandSize = body.bandSize
    if (body.shape) updates.shape = body.shape
    if (body.goal) updates.goal = body.goal
    if (body.measurements) updates.measurements = body.measurements
    if (body.savedMatches) updates.savedMatches = body.savedMatches

    const updated = await updateProfile(profile.id, updates)
    return NextResponse.json({ ok: true, profile: updated })
  }

  // ── Logout ──
  if (body.action === 'logout') {
    await destroySession()
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[froot/profile] POST error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
