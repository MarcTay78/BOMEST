# Module: Products (List + Detail)

## Purpose

Where the business actually sees "what does this table/chair cost to build". Combines a product's BOM (list of materials + quantities) with a fixed labor cost into one live total. Product List gives a catalog-wide view sortable by cost; Product Detail is where the BOM gets built and the photo lives as a visual reference (no AI analysis — purely for staff to recognize the product).

## Supabase usage

- **`products` table** — id, name, category (`'table'|'chair'`), photo_url (nullable, Supabase Storage path), labor_cost, created_at.
- **`bom_lines` table** — id, product_id (fk), material_id (fk), quantity. One row per material used in a product's BOM.
- **Supabase Storage** — product photos uploaded here; `products.photo_url` stores the path/reference.
- **RLS** — all authenticated users SELECT on `products`/`bom_lines`; only `role='admin'` can INSERT/UPDATE/DELETE.
- **No stored cost** — total cost is never written to `products`; always computed client-side live from current `bom_lines` × `materials.current_price` + `labor_cost` (formula in [05-data-model.md](05-data-model.md)).

## User Experience Flow

**Product List (all roles)**
1. User opens Product List → grid/table of products: photo thumbnail, name, category, live total cost.
2. Sortable by cost.
3. Admin sees "Add Product" button; viewer does not.
4. Clicking a product row → navigates to Product Detail.

**Adding a product (admin)**
1. Admin clicks "Add Product" → form: name, category.
2. Submits → new row in `products`, labor_cost defaults (e.g. 0) until set in detail view, no BOM lines yet.
3. Navigates to new product's Detail page to continue setup (photo, BOM, labor).

**Product Detail — viewing (all roles)**
1. Photo (or placeholder if none uploaded).
2. BOM table: material, quantity, unit, line cost (qty × material current price) per row.
3. Labor cost field.
4. Cost breakdown by category: wood/hardware/finish/packaging subtotal + labor subtotal.
5. Grand total (sum of all).
6. If BOM has zero lines → total = labor only, inline warning shown: "no materials added yet".

**Product Detail — editing (admin)**
1. Admin uploads/replaces photo via photo component → stored in Supabase Storage, `photo_url` updated.
2. Admin adds a BOM line: picks material from dropdown (sourced from Materials Master), enters quantity → row added to `bom_lines`, cost breakdown recalculates live.
3. Admin edits/removes existing BOM line → same live recalculation.
4. Admin edits labor_cost field → grand total recalculates live.
5. All changes save directly (no separate "save" step needed beyond each field's own submit, or a single save action — implementation detail left to build phase, but no cost values are ever persisted, only inputs).

## Key UI elements

- `pages/ProductList.tsx` — grid/table, sort, Add Product button (admin).
- `pages/ProductDetail.tsx` — orchestrates photo, BOM table, labor field, breakdown.
- `components/BomTable.tsx` — add/edit/remove BOM line rows.
- `components/PhotoUpload.tsx` — upload/replace photo to Supabase Storage.
- `components/CostBreakdown.tsx` — category subtotals + grand total.
- `lib/costCalc.ts` — shared cost calc + breakdown helper (used by both Detail and List/Dashboard for consistency).

## Acceptance checks

- Create product, add BOM lines across categories, set labor cost → confirm total cost = sum(qty×price) + labor matches manual calc.
- Product with empty BOM → confirm total = labor only, inline warning shown.
- Upload product photo → confirm shows in both Detail view and List thumbnail.
- Log in as viewer → confirm no Add/Edit/Delete/Upload controls shown, direct write attempt rejected by RLS.
