# AGENT.md — AIWriter

## Product

Client-only web AI novel-writing framework. Users supply OpenAI-compatible API URI/Key. Optional story settings. Writing/revise use `prompts/novel-writer.system.md` (overridable in Settings). Ask uses `prompts/novel-ask.system.md`.

## Stack

- Vite + React + TypeScript, native CSS (Apple HIG; no Bootstrap)
- Credentials and history in `localStorage` only
- Browser calls `{baseUrl}/chat/completions`

## Key paths

- Shell: `src/App.tsx`, `src/App.css`
- Views: `src/views/WriteView.tsx`, `SettingsView.tsx`, `HistoryView.tsx`
- API: `src/lib/openaiCompatible.ts`, `src/lib/validate.ts`, `src/lib/storage.ts`
- Config/history: `src/hooks/useLocalConfig.ts`, `useHistory.ts`
- Auth (reserved, off by default): `src/auth/AuthProvider.tsx`, `src/lib/supabase/client.ts`, `src/config/features.ts`
- Providers: `src/config/providers.ts`
- Deploy: `vercel.json`, `.env.example`
- Security notes: `SECURITY.md`

## Public-release rules

- Validate API URLs (`http`/`https` only); never render user HTML unsafely
- Abort in-flight requests on unmount; restore novel if revise fails before tokens
- Sanitize localStorage; handle quota errors
- Do not commit secrets; do not add a backend that collects API keys unless explicitly requested

## Collaboration

- Own development and iteration; prefer one-pass delivery
- If blocked, report and wait; ask when ambiguous
- No commit/push unless asked

Keep in sync with `CLAUDE.md`.
