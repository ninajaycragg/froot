import { Redis } from '@upstash/redis'
import crypto from 'crypto'

// ── Redis ──

let redis: Redis | null = null

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
    if (!url || !token) throw new Error('Redis not configured')
    redis = new Redis({ url, token })
  }
  return redis
}

// ── Types ──

export interface FrootProfile {
  id: string
  email: string
  sizeUK?: string
  sizeUS?: string
  bandSize?: number
  shape?: {
    projection: string
    fullness: string
    rootWidth: string
  }
  goal?: string
  measurements?: Record<string, number | string>
  savedMatches?: Array<{
    brand: string
    style: string
    bestSize: string
    tags: string[]
    savedAt: string
  }>
  fitFeedback?: Array<{
    id: string
    brand: string
    style: string
    size: string
    rating: 'perfect' | 'good' | 'okay' | 'bad'
    bandFit?: 'too_tight' | 'good' | 'too_loose'
    cupFit?: 'too_small' | 'good' | 'too_big'
    notes?: string
    createdAt: string
  }>
  createdAt: string
  updatedAt: string
}

// ── Keys ──

const KEY = {
  profile: (id: string) => `froot:profile:${id}`,
  emailLookup: (email: string) => `froot:email:${email.toLowerCase().trim()}`,
  magicToken: (token: string) => `froot:magic:${token}`,
  session: (sid: string) => `froot:session:${sid}`,
}

// ── Session signing ──

const SECRET = process.env.ORDER_SECRET || process.env.KV_REST_API_TOKEN || 'froot-dev-secret'

function signSession(sid: string): string {
  const sig = crypto.createHmac('sha256', SECRET).update(sid).digest('hex').slice(0, 16)
  return `${sid}.${sig}`
}

function verifySession(signed: string): string | null {
  const dot = signed.lastIndexOf('.')
  if (dot < 0) return null
  const sid = signed.slice(0, dot)
  const sig = signed.slice(dot + 1)
  const expected = crypto.createHmac('sha256', SECRET).update(sid).digest('hex').slice(0, 16)
  if (sig !== expected) return null
  return sid
}

// ── Magic link tokens ──

export async function createMagicToken(email: string): Promise<string> {
  const r = getRedis()
  const normalEmail = email.toLowerCase().trim()

  // Get or create profile
  let profileId = await r.get<string>(KEY.emailLookup(normalEmail))
  if (!profileId) {
    profileId = crypto.randomBytes(12).toString('hex')
    const profile: FrootProfile = {
      id: profileId,
      email: normalEmail,
      savedMatches: [],
      fitFeedback: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await r.set(KEY.profile(profileId), JSON.stringify(profile))
    await r.set(KEY.emailLookup(normalEmail), profileId)
  }

  // Create token (expires in 15 minutes)
  const token = crypto.randomBytes(24).toString('hex')
  await r.set(KEY.magicToken(token), JSON.stringify({ profileId, email: normalEmail }), { ex: 900 })

  return token
}

// ── Verify magic link + create session ──

export async function verifyMagicToken(token: string): Promise<{ profileId: string; email: string } | null> {
  const r = getRedis()
  const raw = await r.get<string>(KEY.magicToken(token))
  if (!raw) return null

  const data = typeof raw === 'string' ? JSON.parse(raw) : raw
  await r.del(KEY.magicToken(token)) // single use

  return data
}

export async function createSession(profileId: string): Promise<string> {
  const r = getRedis()
  const sid = crypto.randomBytes(16).toString('hex')
  await r.set(KEY.session(sid), profileId, { ex: 60 * 60 * 24 * 90 }) // 90 days
  return signSession(sid)
}

export async function setSessionCookie(signed: string) {
  const { cookies } = await import('next/headers')
  const jar = await cookies()
  jar.set('froot_session', signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 90, // 90 days
  })
}

// ── Get current profile from request ──

export async function getCurrentProfile(): Promise<FrootProfile | null> {
  try {
    const { cookies } = await import('next/headers')
    const jar = await cookies()
    const signed = jar.get('froot_session')?.value
    if (!signed) return null

    const sid = verifySession(signed)
    if (!sid) return null

    const r = getRedis()
    const profileId = await r.get<string>(KEY.session(sid))
    if (!profileId) return null

    const raw = await r.get<string>(KEY.profile(profileId))
    if (!raw) return null

    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return null
  }
}

// ── Update profile ──

export async function updateProfile(id: string, updates: Partial<FrootProfile>): Promise<FrootProfile | null> {
  const r = getRedis()
  const raw = await r.get<string>(KEY.profile(id))
  if (!raw) return null

  const profile: FrootProfile = typeof raw === 'string' ? JSON.parse(raw) : raw
  Object.assign(profile, updates, { updatedAt: new Date().toISOString() })
  await r.set(KEY.profile(id), JSON.stringify(profile))
  return profile
}

// ── Logout ──

export async function destroySession() {
  try {
    const { cookies } = await import('next/headers')
    const jar = await cookies()
    const signed = jar.get('froot_session')?.value
    if (!signed) return

    const sid = verifySession(signed)
    if (sid) {
      const r = getRedis()
      await r.del(KEY.session(sid))
    }

    jar.delete('froot_session')
  } catch { /* ok */ }
}
