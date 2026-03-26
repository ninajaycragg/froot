import { NextResponse } from 'next/server'
import { verifyMagicToken, createSession, setSessionCookie } from '@/lib/froot-auth'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/?auth=invalid', req.url))
  }

  const data = await verifyMagicToken(token)
  if (!data) {
    return NextResponse.redirect(new URL('/?auth=expired', req.url))
  }

  const signed = await createSession(data.profileId)
  await setSessionCookie(signed)

  return NextResponse.redirect(new URL('/?auth=success', req.url))
}
