# BOM Costing System — Solid Wood Furniture (Dining Tables & Chairs)

## Context

User runs solid wood furniture business (dining tables/chairs). Needs BOM system to:
- Load raw material costing per product (wood, hardware, finish, packaging)
- Upload product photo (visual reference in detail view, no AI analysis)
- View product cost detail (BOM breakdown + labor)
- Dashboard: material price trend over time, product cost ranking

Confirmed scope (from brainstorming):
- One BOM per product (no variants)
- Material categories: wood/lumber, hardware/fittings, finish/coating, packaging
- Wood costed by volume (m³/board feet); other categories use own units (configurable per material)
- Labor cost = fixed $ per product (no hours×rate breakdown)
- No overhead cost for now
- Total product cost = SUM(BOM line qty × material current price) + labor cost, computed live
- Material price changes: manual edit, old price auto-logged to history (no full purchase/supplier tracking)
- Few staff on office LAN, but hosted as cloud web app (not local server)
- Per-person login, 2 roles: admin (edit everything), viewer (read-only)
- Dashboard shows: material price trend (line chart per material) + product cost ranking (sorted list/bar chart)

## Approach

**Stack: Supabase (Postgres + Auth + Storage) + React (Vite) frontend, deployed on Vercel.**

Chosen over custom Node/Express backend and no-code (Airtable/AppSheet) because it needs least custom code: Supabase provides DB, role-based auth (via RLS), and photo storage out of the box — no backend server to write or host. Frontend talks directly to Supabase client SDK.

## Data Model (Supabase Postgres)

- `profiles` — id (= auth.users id), role ('admin' | 'viewer')
- `materials` — id, name, category ('wood'|'hardware'|'finish'|'packaging'), unit (text, e.g. 'm3','kg','pcs','L'), current_price (numeric), updated_at
- `material_price_history` — id, material_id (fk), old_price, changed_at (auto-inserted via trigger or app logic on price update)
- `products` — id, name, category ('table'|'chair'), photo_url (nullable, Supabase Storage path), labor_cost (numeric), created_at
- `bom_lines` — id, product_id (fk), material_id (fk), quantity (numeric)

RLS policies: all authenticated users can SELECT; only role='admin' can INSERT/UPDATE/DELETE on materials, products, bom_lines. profiles table self-read only (admin can read all for user management, optional simple version: seed roles manually in Supabase dashboard, no in-app user management UI for v1).

Cost calc (client-side, live, not stored):
`product.total_cost = SUM(bom_lines.quantity * materials.current_price for that product) + product.labor_cost`

## Features / Pages

1. **Auth** — Supabase email/password login page. Redirect to product list on success.
2. **Product List** — grid/table: photo thumbnail, name, category, live total cost. Sort by cost. Admin sees "Add Product" button.
3. **Product Detail** — photo (upload/replace if admin), BOM table (material, qty, unit, line cost — add/edit/remove rows if admin), labor cost field (admin editable), cost breakdown by category (wood/hardware/finish/packaging/labor subtotal), grand total.
4. **Materials Master** — list all materials (name, category, unit, current price, last updated). Admin can add/edit (editing price auto-logs old price + timestamp to material_price_history)/delete (blocked with message if referenced in any bom_lines).
5. **Dashboard**
   - Product Cost Ranking: bar chart/table, all products sorted by total cost descending, filterable by category.
   - Material Price Trend: pick a material from dropdown, line chart of price over time from material_price_history (+ current price as latest point).

## Error Handling

- Delete material referenced in BOM lines → blocked, show "used in N product(s)".
- Product with empty BOM → total cost = labor only, show inline warning "no materials added yet".
- Material price edit with no prior history → first edit creates the first history row (using price-before-edit as old_price).
- Viewer role → all mutation UI (add/edit/delete buttons, forms) hidden; RLS blocks any write attempt server-side regardless.

## Files / Structure (new project, greenfield)

```
BOMEST/
  index.html, vite.config.ts, package.json, tsconfig.json
  src/
    lib/supabase.ts          # Supabase client init
    lib/costCalc.ts          # product total cost + breakdown helper
    types.ts                 # Product, Material, BomLine, PriceHistory types
    auth/                    # login page, auth context/hook, role check
    pages/
      ProductList.tsx
      ProductDetail.tsx
      Materials.tsx
      Dashboard.tsx
    components/
      BomTable.tsx
      PhotoUpload.tsx
      CostBreakdown.tsx
      charts/CostRankingChart.tsx
      charts/PriceTrendChart.tsx
    App.tsx, main.tsx
  supabase/
    migrations/*.sql         # schema + RLS policies
  .env.example                # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

Chart library: recharts (lightweight, common React charting choice).

## Verification

- Create material (each category), create product, add BOM lines, confirm total cost = sum(qty×price)+labor matches manual calc.
- Edit material price → confirm material_price_history gets old price row, Dashboard trend chart updates.
- Delete material in use → confirm blocked with correct message.
- Log in as viewer role → confirm no edit controls visible and direct write attempts rejected by RLS.
- Upload product photo → confirm shows in detail view and list thumbnail.
- Dashboard cost ranking matches product list costs, sorted correctly.
