'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import { TIMEOUT_MS, WARN_BEFORE_MS } from '@/lib/constants'

export interface AuthState {
  user: User | null
  loading: boolean
  warning: boolean       // inactivity warning
  countdown: number      // seconds until logout
}

export function useAuth() {
  const [user, setUser]         = useState<User | null>(null)
  const [loading, setLoading]   = useState(true)
  const [warning, setWarning]   = useState(false)
  const [countdown, setCountdown] = useState(0)

  const logoutTimer   = useRef<ReturnType<typeof setTimeout>>()
  const warnTimer     = useRef<ReturnType<typeof setTimeout>>()
  const countdownInterval = useRef<ReturnType<typeof setInterval>>()

  // ── Inactivity timers ──────────────────────────────────────────────────
  const resetTimers = useCallback(() => {
    clearTimeout(logoutTimer.current)
    clearTimeout(warnTimer.current)
    clearInterval(countdownInterval.current)
    setWarning(false)
    setCountdown(0)

    warnTimer.current = setTimeout(() => {
      setWarning(true)
      let secs = Math.floor(WARN_BEFORE_MS / 1000)
      setCountdown(secs)
      countdownInterval.current = setInterval(() => {
        secs -= 1
        setCountdown(secs)
        if (secs <= 0) clearInterval(countdownInterval.current)
      }, 1000)
    }, TIMEOUT_MS - WARN_BEFORE_MS)

    logoutTimer.current = setTimeout(async () => {
      await supabase.auth.signOut()
      setUser(null)
    }, TIMEOUT_MS)
  }, [])

  const clearTimers = useCallback(() => {
    clearTimeout(logoutTimer.current)
    clearTimeout(warnTimer.current)
    clearInterval(countdownInterval.current)
    setWarning(false)
  }, [])

  // ── Listen to auth changes ─────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // ── Inactivity detection ───────────────────────────────────────────────
  useEffect(() => {
    if (!user) { clearTimers(); return }

    const EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
    EVENTS.forEach(ev => window.addEventListener(ev, resetTimers, { passive: true }))
    resetTimers()

    return () => {
      clearTimers()
      EVENTS.forEach(ev => window.removeEventListener(ev, resetTimers))
    }
  }, [user, resetTimers, clearTimers])

  // ── Auth actions ───────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }, [])

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw error
    return data
  }, [])

  const signOut = useCallback(async () => {
    clearTimers()
    await supabase.auth.signOut()
    setUser(null)
  }, [clearTimers])

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) throw error
  }, [])

  const stayLoggedIn = useCallback(() => {
    resetTimers()
    supabase.auth.refreshSession()
  }, [resetTimers])

  return {
    user,
    loading,
    warning,
    countdown,
    signIn,
    signUp,
    signOut,
    resetPassword,
    stayLoggedIn,
  }
}
