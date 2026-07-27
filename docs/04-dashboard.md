# Module: Dashboard

## Purpose

Business-level view on top of Materials and Products data: which products cost most to build, and how has a given material's price moved over time. Read-only for both roles — dashboard is analysis, not data entry.

## Supabase usage

- Reads `products` + `bom_lines` + `materials` (for cost ranking — same live calc as Product List/Detail, via shared `lib/costCalc.ts`).
- Reads `material_price_history` + `materials.current_price` (for price trend chart).
- **RLS** — all authenticated users SELECT; no mutation happens on this page, so no admin-only paths here.

## User Experience Flow

**Product Cost Ranking (all roles)**
1. User opens Dashboard.
2. Sees bar chart/table of all products sorted by total cost descending.
3. Can filter by category (table/chair).
4. Values match what's shown on Product List/Detail (same calc, same source data) — no separate stored ranking.

**Material Price Trend (all roles)**
1. User picks a material from a dropdown (sourced from Materials Master).
2. Line chart renders: price over time, points pulled from `material_price_history` for that material, plus `current_price` plotted as the latest point.
3. Chart updates immediately if user (elsewhere, as admin) edits that material's price and returns to Dashboard — no caching lag since read is live.

## Key UI elements

- `pages/Dashboard.tsx` — layout hosting both charts, category filter, material picker.
- `components/charts/CostRankingChart.tsx` — bar chart/table, sorted, filterable.
- `components/charts/PriceTrendChart.tsx` — line chart per selected material.
- Chart library: recharts.

## Acceptance checks

- Dashboard cost ranking matches Product List costs, sorted correctly, filter by category works.
- Edit a material's price (as admin, in Materials module) → confirm trend chart reflects new history point on return to Dashboard.
