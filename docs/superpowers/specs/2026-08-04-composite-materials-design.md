# Composite materials (replaces the Hardware sub-material page)

## Problem

The user wants to build a "Hardware pack" style material (e.g. a bag of screws + JCBC bolts + dowels) that behaves like any other material — pickable directly in a product's BOM, one line, one price — but whose price is the live sum of its component materials' prices, not a manually typed number.

This replaces the standalone `/hardware` costing page built earlier in this session (Product-based, own page, not usable inside another product's BOM). That approach is being reverted in favor of this one, per user decision.

## Approach

A material can now be **composite**: instead of a manually-priced leaf, it has a *recipe* — a list of (component material, quantity) pairs, both drawn from the same `materials` table. Its effective price is always computed live as `Σ quantity × component's effective price`, recursing one level (recipes are flat — a composite's components must themselves be non-composite, no nesting, no cycle risk). A composite material is then usable anywhere a material is usable today: picked into any product's BOM, priced automatically, no new concept for the BOM/product layer to learn.

## Data model

New migration `supabase/migrations/0005_material_components.sql`:

```sql
alter table materials add column is_composite boolean not null default false;

create table material_components (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references materials(id) on delete cascade,
  component_material_id uuid not null references materials(id) on delete restrict,
  quantity numeric not null check (quantity > 0)
);

alter table material_components enable row level security;
create policy "material_components read" on material_components for select to authenticated using (true);
create policy "material_components write" on material_components for all to authenticated using (is_admin()) with check (is_admin());
```

`material_id` is the composite ("parent") material — deleting it cascades away its recipe rows, mirroring `bom_lines.product_id`. `component_material_id` is the ingredient — `on delete restrict` blocks deleting a material that's still used as an ingredient somewhere, mirroring `bom_lines.material_id`.

A composite material's `current_price` column is never meaningfully written — `createMaterial` for a composite inserts `current_price: 0` and the app never calls `updateMaterialPrice` on it. The real price is always derived at read time from `material_components` + the current prices of the referenced materials, so there is no caching/staleness to manage and no trigger needed.

`src/lib/types.ts`:
```ts
export interface Material {
  id: string;
  name: string;
  category: MaterialCategory;
  item: string;
  type: string;
  size: string;
  unit: string;
  currentPrice: number;
  isComposite: boolean;
  updatedAt: string;
}

export interface MaterialComponent {
  id: string;
  materialId: string;           // the composite material
  componentMaterialId: string;  // the ingredient material
  quantity: number;
}
```

## DataStore

`src/data/DataStore.ts` additions:
```ts
listMaterialComponents(): Promise<MaterialComponent[]>;
addMaterialComponent(materialId: string, componentMaterialId: string, quantity: number): Promise<MaterialComponent>;
removeMaterialComponent(id: string): Promise<void>;
```

`listMaterialComponents` is unscoped (returns every row) — the table is small (one row per ingredient per composite in a materials catalog), and both the Materials list (pricing every composite) and the recipe editor (one composite's rows) need it; the app groups client-side by `materialId`, matching the existing bulk-fetch style of `listMaterials`/`listOptions`.

`createMaterial`'s input gains `isComposite: boolean` (defaults handled by the caller, not the interface — the two call sites, simple vs composite, pass it explicitly).

`deleteMaterial` extends its existing "blocked by bom_lines" check to also count `material_components` rows where `component_material_id` matches, summing both counts into one `DeleteBlockedError`. The UI's blocked message always reads "used in N product(s) or recipe(s)" regardless of which usage kind(s) actually contributed to N.

Implement in both `mockStore.ts` and `supabaseStore.ts`, following each file's existing conventions.

## Cost calculation

`src/lib/costCalc.ts` adds:
```ts
export function computeEffectivePrice(
  material: Material,
  materialsById: Map<string, Material>,
  componentsByMaterialId: Map<string, MaterialComponent[]>,
): EffectiveUnit
```
For a non-composite material, this returns exactly what `computeEffectiveUnit` returns today (that function stays, used internally). For a composite, it sums `quantity × computeEffectivePrice(component, ...).price` over `componentsByMaterialId.get(material.id) ?? []`, skipping any component id not found in `materialsById` (same defensive pattern `computeProductCost` already uses for missing BOM-line materials), and returns `{ price: sum, unit: material.unit, converted: false }`.

`computeProductCost` gains a `componentsByMaterialId` parameter (after `materialsById`) and calls `computeEffectivePrice` instead of `computeEffectiveUnit` when resolving each BOM line's material. All three callers (`ProductList.tsx`, `ProductDetail.tsx`, `Dashboard.tsx`) fetch `listMaterialComponents()` alongside `listMaterials()` and build the map the same way they already build `materialsById`.

## UI — all on the Materials page (`src/pages/Materials.tsx`)

**Add form:** a "Composite" checkbox. Unchecked: today's form unchanged. Checked: the manual price input is replaced by a recipe builder — a local (not-yet-persisted) list of `{ componentMaterialId, quantity }` rows, built with a `<select>` (materials where `isComposite === false`, so a composite can never accidentally reference another composite) + qty input + "add row" button, editable/removable before submit. On submit: `createMaterial({ ..., isComposite: true, currentPrice: 0 })`, then `addMaterialComponent(newMaterial.id, ...)` for each staged row, sequentially, then reload.

**List table:** a composite row shows a small "Composite" badge next to its name and its computed price (via `computeEffectivePrice`) in the price column, not editable inline as a number.

**Editing an existing composite:** the existing inline edit-row mechanism (`startEdit`/`commitEdit`) continues to handle name/category/item/type/size/unit, but the price cell shows the computed value with no input, and a recipe sub-section (same add-row/remove-row shape as the create form, minus the "not yet persisted" staging) lets an admin add or remove component lines immediately — each add/remove calls `addMaterialComponent`/`removeMaterialComponent` directly and reloads, same immediate-action pattern `BomTable` already uses for a product's BOM lines.

## Removal: revert the Hardware Product-based feature

Delete/revert everything from the earlier `/hardware` effort, since this composite-material approach replaces it:
- `src/pages/HardwareList.tsx`, `src/pages/HardwareDetail.tsx` — delete
- `src/App.tsx` — remove the `/hardware` and `/hardware/:id` routes
- `src/components/AppNav.tsx` — remove the `Hardware` nav link
- `src/lib/types.ts` — remove `HARDWARE_CATEGORY`
- `src/pages/ProductList.tsx` — remove the Hardware-category exclusion filter (`catalogProducts`), restore filtering straight from `products`
- `src/pages/Dashboard.tsx` — remove the Hardware-category exclusion filter on `rankingRows`
- `src/components/BomTable.tsx` — remove the `pickerMaterials` prop (added solely for the Hardware page's picker scoping; no other caller uses it) — `BomTable` picks its material list source in the composite-materials work instead, via the `computeEffectivePrice` change above, not via a second materials list
- `docs/superpowers/specs/2026-08-04-hardware-costing-page-design.md` — leave as historical record (specs aren't deleted retroactively), but this new spec supersedes it

## Out of scope

- No nesting (a composite's components must be simple materials) — enforced by the recipe picker only offering `isComposite === false` materials, not by a DB constraint (small trusted admin-only tool, consistent with how the rest of this app enforces invariants at the app layer, e.g. category renaming).
- No price history for composite materials — their price is never "set," only derived, so there's nothing to log. The existing price-history feature stays material-only for simple materials.
- No visual distinction for composite materials inside the BOM picker dropdown (e.g. no "(composite)" suffix on the option) — out of scope for this pass, easy follow-up.
- No migration of any data created by the reverted Hardware Product feature — that feature had no real usage yet (built and reviewed in this same session), so nothing to migrate.

## Testing

No component test framework in this repo (only `src/lib/costCalc.test.ts`, for pure logic). `costCalc.test.ts` gets new cases for `computeEffectivePrice` (simple material passthrough, composite sum, missing-component defensive skip). Everything else: `npm run build` (typecheck) plus manual browser verification — create a composite material from two simple ones, confirm its computed price, add it to a product's BOM, confirm the product's total includes the composite's rolled-up price correctly, edit the recipe and confirm the price updates live on next reload.
