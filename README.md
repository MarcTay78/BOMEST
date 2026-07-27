# ESTAY Furniture — BOM Costing

Live BOM (bill of materials) costing app for a solid-wood furniture shop. Spec: [i-am-in-solid-splendid-garden.md](i-am-in-solid-splendid-garden.md), [docs/](docs/).

## Run

```bash
npm install
npm run dev
```

Opens with **mock mode**: in-memory seed data, no backend required. Sign in with:
- `maria@bomest.co` / `bomest123` (admin — full edit rights)
- `viewer@bomest.co` / `bomest123` (viewer — read-only)

Mock data resets on every full page reload (see `src/data/mockStore.ts`) — expected, it's a demo store, not persistence.

## Switch to real Supabase

1. Create a Supabase project, run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) against it (SQL editor or CLI).
2. Create two users in Supabase Auth, then insert matching rows into `profiles` (id = the auth user's id, role = `'admin'` or `'viewer'`) — no in-app user management in v1.
3. Copy `.env.example` to `.env`, fill in `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`.

No code changes needed — `src/data/index.ts` swaps from `mockStore` to `supabaseStore` automatically once those env vars are set.

## Structure

```
src/
  lib/         types, cost-calc formula (unit tested), supabase client
  data/        DataStore interface + mock/supabase implementations
  auth/        auth context, protected route
  components/  BomTable, PhotoUpload, CostBreakdown, charts/
  pages/       Login, ProductList, ProductDetail, Materials, Dashboard
supabase/migrations/  schema + RLS
```

## Test

```bash
npm test
```

Covers the cost formula in `src/lib/costCalc.ts` — the one piece of business logic worth protecting with tests (BOM line sums, empty-BOM edge case, live re-pricing).
