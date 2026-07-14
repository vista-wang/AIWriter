import type { SupabaseClient } from '@supabase/supabase-js'
import { AUTH_ENABLED, isAuthConfigured } from '../../config/features'

let client: SupabaseClient | null = null
let loading: Promise<SupabaseClient | null> | null = null

/**
 * Lazily creates a Supabase browser client when auth is enabled and configured.
 * Returns null while auth is reserved/disabled so the SDK is not required at runtime.
 */
export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (!AUTH_ENABLED || !isAuthConfigured()) return null
  if (client) return client
  if (loading) return loading

  loading = (async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const url = String(import.meta.env.VITE_SUPABASE_URL).trim()
    const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY).trim()
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
    return client
  })()

  try {
    return await loading
  } finally {
    loading = null
  }
}

export type { SupabaseClient }
