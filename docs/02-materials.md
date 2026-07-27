# Module: Materials Master

## Purpose

Central catalog of every raw material used across products: wood/lumber, hardware/fittings, finish/coating, packaging. This is the single source of truth for "current price" that drives live product cost calc — editing a price here immediately ripples into every product that references the material in its BOM. Also the module responsible for building material price history, which powers the Dashboard's price trend chart.

## Supabase usage

- **`materials` table** — id, name, category (`'wood'|'hardware'|'finish'|'packaging'`), unit (free text, e.g. `'m3'`, `'kg'`, `'pcs'`, `'L'` — configurable per material, not a fixed enum), current_price, updated_at.
- **`material_price_history` table** — id, material_id (fk), old_price, changed_at. Row inserted automatically whenever `current_price` changes (via DB trigger or app-level logic on update) — captures the price *before* the edit.
- **RLS** — all authenticated users SELECT; only `role='admin'` can INSERT/UPDATE/DELETE.
- **Delete guard** — deleting a material referenced by any `bom_lines` row must be blocked (checked before delete, either app-side query or DB constraint/trigger).

## User Experience Flow

**Viewing (all roles)**
1. User opens Materials page → sees table: name, category, unit, current price, last updated.
2. No edit controls if viewer.

**Adding a material (admin)**
1. Admin clicks "Add Material" → form: name, category (dropdown), unit (free text), starting price.
2. Submits → new row in `materials`, no history row yet (nothing to log — first price has no "old" price).

**Editing price (admin)**
1. Admin clicks Edit on a material → changes current_price → submits.
2. App captures price-before-edit, writes it as a new row in `material_price_history` (old_price = pre-edit value, changed_at = now), then updates `materials.current_price`.
   - If this is the material's first-ever edit, that pre-edit value becomes the first history row (no history existed before).
3. List refreshes showing new price + updated `updated_at`.
4. Any product cost that reads this material recomputes live on next view — no separate propagation step needed since cost is never stored.

**Deleting a material (admin)**
1. Admin clicks Delete.
2. App checks if any `bom_lines` reference this material_id.
   - Referenced → blocked, message: "used in N product(s)".
   - Not referenced → deleted.

## Key UI elements

- `pages/Materials.tsx` — list + add/edit/delete forms (admin only for mutation).
- Feeds material dropdown used in `components/BomTable.tsx` (Products module) and `components/charts/PriceTrendChart.tsx` (Dashboard module).

## Acceptance checks

- Create material in each of the 4 categories → confirm appears correctly in list and in BOM material dropdown.
- Edit material price → confirm `material_price_history` gets old-price row with correct old value and timestamp; Dashboard trend chart updates to reflect it.
- Attempt delete on material referenced in a product's BOM → confirm blocked with "used in N product(s)" message.
- Log in as viewer → confirm no Add/Edit/Delete controls shown, and direct write attempt rejected by RLS.
