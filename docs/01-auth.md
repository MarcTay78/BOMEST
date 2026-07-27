# Module: Auth

## Purpose

Gate app behind per-person login. Few staff on office LAN but app hosted cloud (not local server), so login required regardless of network. Role (admin/viewer) drives what UI shows and what writes succeed — auth module is the single place role gets resolved for the rest of the app.

## Supabase usage

- **Supabase Auth** — email/password sign-in (`supabase.auth.signInWithPassword`). No social login, no magic link for v1.
- **`profiles` table** — id = `auth.users.id`, `role` column (`'admin' | 'viewer'`). After login, app reads this row to know the user's role.
- **RLS** — `profiles` table: self-read only (a user can read own row); admin can read all rows only if in-app user management added later (v1 skips this — roles seeded manually in Supabase dashboard).

## User Experience Flow

**Login (all users)**
1. User lands on app, unauthenticated → redirected to login page.
2. Enters email + password → submits.
3. Supabase Auth validates credentials.
   - Success → app fetches `profiles` row for `role` → redirected to Product List.
   - Failure → inline error shown ("invalid email or password"), stays on login page.
4. Session persisted (Supabase client handles token refresh) — no re-login needed until session expires or user logs out.

**Role resolution (post-login, every page)**
1. Auth context/hook reads current session + role once at login, holds in app state.
2. Every page/component checks role from context to decide: show admin controls (add/edit/delete buttons) or hide them (viewer).
3. This is a UI convenience only — actual enforcement happens server-side via RLS on `materials`/`products`/`bom_lines` (see [05-data-model.md](05-data-model.md)). Even if a viewer bypasses hidden UI (e.g. via dev tools), Supabase rejects the write.

**Logout**
1. User clicks logout → `supabase.auth.signOut()` → session cleared → redirected to login page.

## Key UI elements

- `auth/` — login page, auth context/hook, role check helper (per spec's planned file structure).
- No signup page in v1 — accounts created manually in Supabase dashboard (consistent with "no in-app user management UI for v1").

## Acceptance checks

- Log in as viewer role → confirm no edit controls visible anywhere in app, and any direct write attempt (e.g. via API call) rejected by RLS.
- Log in as admin → confirm all edit controls (Add Product, Edit Material, etc.) visible.
