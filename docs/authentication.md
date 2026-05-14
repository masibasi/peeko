# Authentication Plan

## Current state (broken)

- `AUTH_REQUIRED=false` in `backend/.env` → every request gets hardcoded `userId = '000...0001'`. All sessions pool together regardless of who is "logged in."
- `LoginPage` creates a fake JWT. The backend never reads it.
- `Dashboard` and all session fetches send no `Authorization` header.
- `@supabase/supabase-js` is not installed on the frontend.

## Architecture

Use **Supabase Email/Password auth** for registered users and **Supabase Anonymous sign-in** for guests. Both paths produce a valid Supabase JWT. The backend `authMiddleware` already knows how to verify those — the only backend change is flipping `AUTH_REQUIRED=true`.

Email confirmation is **disabled** in Supabase Auth settings (Authentication → Settings → "Enable email confirmations" off) so signups log in immediately.

---

## Steps

### Step 1 — Frontend Supabase client
**New file**: `frontend/src/lib/supabase.ts`

- Install `@supabase/supabase-js` on the frontend
- Create a public (anon-key) Supabase client using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Add both vars to `frontend/.env` (anon key is safe to expose — it is designed for browser use)

```ts
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
```

---

### Step 2 — Overhaul `AuthContext`
**File**: `frontend/src/contexts/AuthContext.tsx`

- On mount: call `supabase.auth.getSession()` to restore any persisted session
- Subscribe to `supabase.auth.onAuthStateChange()` for token refresh and sign-out
- Add `isGuest: boolean` to context — true when `session.user.is_anonymous === true`
- Remove `login(token)` — auth state flows entirely through Supabase's listener
- `logout()` calls `supabase.auth.signOut()`
- Token management (localStorage, expiry, refresh) handled by Supabase SDK automatically — remove `lib/auth.ts` manual logic

---

### Step 3 — Rewrite `LoginPage`
**File**: `frontend/src/components/LoginPage.tsx`

Three actions on the form:

| Action | Supabase call | On success |
|---|---|---|
| Sign in | `supabase.auth.signInWithPassword({ email, password })` | Navigate to `/dashboard` |
| Register | `supabase.auth.signUp({ email, password })` | Navigate to `/dashboard` (confirmation disabled) |
| Continue as guest | `supabase.auth.signInAnonymously()` | Navigate to `/session/new` |

- Show Supabase error messages verbatim — they are user-friendly
- Guest button is visually secondary ("Try without an account"), below the main form

---

### Step 4 — Add auth headers to every API call
**Files**: `Dashboard.tsx`, `NewSessionPage.tsx`, `SessionView.tsx`, `PostSessionReport.tsx`, `lib/api.ts`

- Read `token` from `useAuth()` context
- Pass to `authHeaders(token)` (helper already exists in `lib/api.ts`)
- Every `fetch('/api/...')` call gets `Authorization: Bearer <token>`
- WebSocket in `SessionView`: send token as a query param on the WS URL (`?token=<token>`) — check the backend WS handler accepts this

---

### Step 5 — Route protection in `App.tsx`
**File**: `frontend/src/App.tsx`

```
loading              → show full-screen spinner
!isAuthenticated     → dashboard / session / new-session / report → redirect to /login
isGuest              → dashboard → redirect to /session/new
```

- After sign-in / register: navigate to `/dashboard`
- After guest sign-in: navigate to `/session/new`

---

### Step 6 — Flip auth on in backend
**File**: `backend/.env`

```
AUTH_REQUIRED=true
```

No code changes. The middleware already verifies Supabase JWTs, including anonymous ones.

---

### Step 7 — Guest session behavior

Anonymous Supabase users get a real `user_id` in the DB — the backend handles them identically to registered users. The guest experience difference is entirely frontend:

- Guests land directly on `/session/new`, never the dashboard
- No "past sessions" visible (they would exist in DB under the anonymous `user_id` but the UI doesn't show them)
- The anonymous Supabase session persists in localStorage until the browser clears it or the user signs out
- **Future upgrade path**: Supabase supports `linkIdentity()` to convert an anonymous account into a real one, preserving all session data

---

## Files changed summary

| File | Change |
|---|---|
| `frontend/src/lib/supabase.ts` | **New** — public Supabase client |
| `frontend/src/contexts/AuthContext.tsx` | Replace fake token logic with Supabase `onAuthStateChange` |
| `frontend/src/components/LoginPage.tsx` | Real `signIn`, `signUp`, `signInAnonymously` calls |
| `frontend/src/components/Dashboard.tsx` | Add `Authorization` header to fetch |
| `frontend/src/components/NewSessionPage.tsx` | Add `Authorization` header |
| `frontend/src/components/SessionView.tsx` | Add `Authorization` header + WS token param |
| `frontend/src/components/PostSessionReport.tsx` | Add `Authorization` header |
| `frontend/src/App.tsx` | Route guards + redirect logic |
| `frontend/.env` | Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| `backend/.env` | `AUTH_REQUIRED=true` |

---

## Pre-implementation checklist

- [ ] Disable email confirmation in Supabase dashboard: Authentication → Settings → toggle off "Enable email confirmations"
- [ ] Copy `SUPABASE_ANON_KEY` from Supabase dashboard → Project Settings → API → `anon public`
- [ ] Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `frontend/.env`
- [ ] Confirm Anonymous sign-in is enabled in Supabase: Authentication → Providers → Anonymous
