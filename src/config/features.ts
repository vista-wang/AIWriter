/**
 * Feature flags for optional integrations.
 * Auth/Supabase is reserved for a future release — keep disabled until configured.
 */

function envFlag(name: string, fallback = false): boolean {
  const raw = import.meta.env[name]
  if (typeof raw !== 'string') return fallback
  return raw === 'true' || raw === '1'
}

/** Master switch: must be true AND Supabase env vars present to activate auth. */
export const AUTH_ENABLED = envFlag('VITE_AUTH_ENABLED', false)

export function isAuthConfigured(): boolean {
  if (!AUTH_ENABLED) return false
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  return Boolean(typeof url === 'string' && url.trim() && typeof key === 'string' && key.trim())
}
