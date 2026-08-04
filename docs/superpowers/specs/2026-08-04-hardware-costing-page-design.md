# Hardware sub-material costing page

## Problem

Hardware components (BoxSeat, RTA, Side Rail, HangerBolt, etc.) need their own costing page, separate from the main Products catalog. User types the sub-item name freely and builds its cost from picked materials, same interaction as the existing Product BOM editor.

## Approach

Hardware sub-items are `Product` rows with `category: 'Hardware'`. No new entity, no schema change — `computeProductCost`, `BomTable`, `CostBreakdown`, and all `dataStore` product/BOM methods (already backed by Supabase `products` + `bom_lines` tables) are reused as-is. This means Hardware items persist in Supabase automatically and are editable long-term through the same code paths as products.

## Changes

**`src/lib/types.ts`** — add `export const HARDWARE_CATEGORY = 'Hardware';` as the single source of truth both new and existing pages check against.

**`src/pages/HardwareList.tsx`** (new) — grid of Hardware-category products only. Sort by cost/name (mirrors `ProductList`). No category tabs (single fixed category), no photos. Inline "type a name → create" row (pattern like `Materials.tsx`'s `AddMaterialForm`, but just a name field) calls `dataStore.createProduct({ name, category: HARDWARE_CATEGORY })` then navigates to `/hardware/:id`.

**`src/pages/HardwareDetail.tsx`** (new) — stripped-down `ProductDetail`: click-to-rename name (admin only), delete button with confirm, `<BomTable>` for materials (add/remove line, edit remarks), `<CostBreakdown>` for the total. No photo upload, no obsolete toggle, no overhead-cost input — `laborCost` stays `0` (set by `createProduct`) and is never edited here. The material picker dropdown is scoped to `material.category === HARDWARE_CATEGORY` only — the BOM here is built exclusively from Hardware-category materials.

**`src/App.tsx`** — add routes `/hardware` → `HardwareList`, `/hardware/:id` → `HardwareDetail`.

**`src/components/AppNav.tsx`** — add `Hardware` nav link.

**`src/pages/ProductList.tsx`** — filter out `category === HARDWARE_CATEGORY` from both the category tabs and the product grid, so Hardware items only appear on the new page.

## Out of scope

- Hardware items are not selectable as BOM line items inside other products (no nested costing) — standalone costing only, per user confirmation.
- No photo, obsolete flag, or overhead cost for Hardware items.
- No Supabase migration — reuses existing `products`/`bom_lines` tables and RLS.

## Testing

Manual verification in browser: create a Hardware item, add BOM lines, confirm cost total, confirm it does NOT appear on `/products`, confirm rename/delete work, confirm data survives reload (Supabase-backed).
