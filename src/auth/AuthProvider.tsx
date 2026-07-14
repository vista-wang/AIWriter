import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AUTH_ENABLED, isAuthConfigured } from '../config/features'
import { getSupabaseClient } from '../lib/supabase/client'

export type AuthUser = {
  id: string
  email: string | null
}

type AuthContextValue = {
  /** True only when feature flag + env are ready for real auth. */
  enabled: boolean
  /** Reserved UI may show a “coming soon” state when false. */
  ready: boolean
  user: AuthUser | null
  loading: boolean
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>
  signUpWithPassword: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const disabledValue: AuthContextValue = {
  enabled: false,
  ready: true,
  user: null,
  loading: false,
  async signInWithPassword() {
    return { error: '账号功能尚未启用。' }
  },
  async signUpWithPassword() {
    return { error: '账号功能尚未启用。' }
  },
  async signOut() {},
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const enabled = AUTH_ENABLED && isAuthConfigured()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [ready, setReady] = useState(!enabled)

  useEffect(() => {
    if (!enabled) {
      setUser(null)
      setLoading(false)
      setReady(true)
      return
    }

    let cancelled = false
    let unsubscribe: (() => void) | undefined

    void (async () => {
      const supabase = await getSupabaseClient()
      if (cancelled || !supabase) {
        setLoading(false)
        setReady(true)
        return
      }

      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      const sessionUser = data.session?.user
      setUser(
        sessionUser ? { id: sessionUser.id, email: sessionUser.email ?? null } : null,
      )
      setLoading(false)
      setReady(true)

      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        const next = session?.user
        setUser(next ? { id: next.id, email: next.email ?? null } : null)
      })
      unsubscribe = () => sub.subscription.unsubscribe()
    })()

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [enabled])

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const supabase = await getSupabaseClient()
    if (!supabase) return { error: '账号功能尚未启用。' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signUpWithPassword = useCallback(async (email: string, password: string) => {
    const supabase = await getSupabaseClient()
    if (!supabase) return { error: '账号功能尚未启用。' }
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = await getSupabaseClient()
    if (!supabase) return
    await supabase.auth.signOut()
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    if (!enabled) return disabledValue
    return {
      enabled: true,
      ready,
      user,
      loading,
      signInWithPassword,
      signUpWithPassword,
      signOut,
    }
  }, [enabled, ready, user, loading, signInWithPassword, signUpWithPassword, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) return disabledValue
  return ctx
}
