'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface SavedMatch {
  brand: string
  style: string
  bestSize: string
  tags: string[]
  savedAt: string
}

interface FitFeedback {
  id: string
  brand: string
  style: string
  size: string
  rating: 'perfect' | 'good' | 'okay' | 'bad'
  bandFit?: string
  cupFit?: string
  notes?: string
  createdAt: string
}

export interface FrootProfile {
  id: string
  email: string
  sizeUK?: string
  sizeUS?: string
  bandSize?: number
  shape?: { projection: string; fullness: string; rootWidth: string }
  goal?: string
  measurements?: Record<string, number | string>
  savedMatches?: SavedMatch[]
  fitFeedback?: FitFeedback[]
  createdAt: string
}

interface ProfileContextValue {
  profile: FrootProfile | null
  loading: boolean
  login: (email: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  saveResults: (data: {
    sizeUK: string
    sizeUS: string
    bandSize: number
    shape: FrootProfile['shape']
    goal: string
    measurements?: Record<string, number | string>
    savedMatches?: SavedMatch[]
  }) => Promise<boolean>
  submitFeedback: (data: {
    brand: string
    style: string
    size: string
    rating: 'perfect' | 'good' | 'okay' | 'bad'
    bandFit?: string
    cupFit?: string
    notes?: string
  }) => Promise<boolean>
  refresh: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within FrootProfileProvider')
  return ctx
}

export function FrootProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<FrootProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/froot/profile')
      if (res.ok) {
        const data = await res.json()
        setProfile(data.profile || null)
      }
    } catch { /* offline, etc */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function login(email: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch('/api/froot/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error }
      return { ok: true }
    } catch {
      return { ok: false, error: 'Network error' }
    }
  }

  async function logout() {
    try {
      await fetch('/api/froot/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      })
    } catch { /* ok */ }
    setProfile(null)
  }

  async function saveResults(data: Parameters<ProfileContextValue['saveResults']>[0]): Promise<boolean> {
    try {
      const res = await fetch('/api/froot/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', ...data }),
      })
      if (res.ok) {
        const result = await res.json()
        if (result.profile) setProfile(result.profile)
        return true
      }
    } catch { /* */ }
    return false
  }

  async function submitFeedback(data: Parameters<ProfileContextValue['submitFeedback']>[0]): Promise<boolean> {
    try {
      const res = await fetch('/api/froot/profile/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        await refresh() // reload profile with new feedback
        return true
      }
    } catch { /* */ }
    return false
  }

  return (
    <ProfileContext.Provider value={{ profile, loading, login, logout, saveResults, submitFeedback, refresh }}>
      {children}
    </ProfileContext.Provider>
  )
}
