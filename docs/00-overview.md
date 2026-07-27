# BOM Costing System — Overview

Web app for solid-wood furniture business (dining tables/chairs). Replace manual costing with live BOM (Bill of Materials) system: track raw material price, compute product cost live, spot cost trend/rank across catalog.

## Problem it solves

Wood, hardware, finish, packaging price shift over time. Without a system, per-product cost recompute by hand each time a price change — slow, error-prone, no history. This app makes cost live-derived from current material price × BOM quantity, always accurate, and keeps price history free (no manual log).

## Stack

- **Frontend**: React (Vite), deployed on Vercel.
- **Backend**: Supabase — Postgres DB, Auth, Storage. No custom backend server; frontend talks direct to Supabase client SDK.
- **Charts**: recharts.
- **Why Supabase**: least custom code path. DB + role-based auth (via RLS) + photo storage all built in — no server to write or host. Chosen over custom Node/Express (more code to maintain) and no-code tools like Airtable/AppSheet (less control over cost-calc logic and RLS granularity).

## Roles

Two roles, per-person login via Supabase Auth:

- **admin** — full edit rights (materials, products, BOM lines, photos, labor cost).
- **viewer** — read-only. Mutation UI hidden client-side; RLS blocks writes server-side regardless (defense in depth).

Role seeded manually in Supabase dashboard for v1 (no in-app user management UI).

## Modules

| Doc | Module | Covers |
|---|---|---|
| [01-auth.md](01-auth.md) | Auth | Login, session, role resolution |
| [02-materials.md](02-materials.md) | Materials Master | Material catalog, price edit, price history |
| [03-products.md](03-products.md) | Products | Product list, product detail, BOM lines, photo, cost calc |
| [04-dashboard.md](04-dashboard.md) | Dashboard | Cost ranking chart, price trend chart |
| [05-data-model.md](05-data-model.md) | Data Model | Full schema, RLS policies, cost formula (referenced by all above) |

## Cost calc (core formula)

```
product.total_cost = SUM(bom_lines.quantity × materials.current_price for that product) + product.labor_cost
```

Computed client-side, live, on every render — never stored. See [05-data-model.md](05-data-model.md) for detail.

## Project structure (planned)

```
BOMEST/
  src/
    lib/supabase.ts, lib/costCalc.ts, types.ts
    auth/
    pages/ ProductList.tsx, ProductDetail.tsx, Materials.tsx, Dashboard.tsx
    components/ BomTable.tsx, PhotoUpload.tsx, CostBreakdown.tsx
    components/charts/ CostRankingChart.tsx, PriceTrendChart.tsx
  supabase/migrations/*.sql
  .env.example
```

Source spec: [i-am-in-solid-splendid-garden.md](../i-am-in-solid-splendid-garden.md).
