# Sqft costing + material estimate flag

## 1. Sqft costing

Mirrors the existing m3 rule in `computeEffectiveUnit` (src/lib/costCalc.ts): a
material priced per m3 with a parseable `WxHxL` Size auto-converts to a $/pc
rate. Sqft materials work the same way but with a 2-dimension Size (`WxH`, in
mm — user enters mm, app converts).

- New `parseSizeMm2(size: string): [number, number] | null` — same parsing
  rules as `parseSizeMm` (split on `x`, exactly N positive finite numbers)
  but for 2 dimensions instead of 3.
- `computeEffectiveUnit`: add a second branch — when `unit` is `sqft` (case
  insensitive, same as the `m3` check) and Size parses as 2 dims, convert
  `width_mm * height_mm` to sqft (`1 sqft = 92903.04 mm²`), multiply by
  `currentPrice` ($/sqft), return `{ price, unit: 'pcs', converted: true }`.
- Non-parseable Size or non-sqft unit: falls through to existing behavior
  (raw price, `converted: false`).
- Example: Size `1220x2440`, currentPrice `2` ($/sqft) → area 2.977 m² =
  32.04 sqft → $64.08/pc.

No changes to `computeEffectivePrice` / `computeProductCost` — they already
call `computeEffectiveUnit` under the hood, so sqft materials get this
conversion for free wherever price is used (BOM, product list, dashboard,
composite recipes).

## 2. Estimate flag

Some materials (e.g. carton box) don't have a real tracked cost — the price
entered is a rough estimate. This needs a visible flag, but the price still
participates in cost totals exactly like any other material (no calc
changes) — informational only.

- `Material.isEstimate: boolean` (src/lib/types.ts), default `false`.
- Materials.tsx table: "Estimate" tag next to the name (same style/position
  as the existing "Composite" tag), for both composite and non-composite
  rows.
- `AddMaterialForm`: checkbox "Estimate only (no real cost tracking)",
  alongside the existing Composite checkbox.
- Edit row (inline table edit): checkbox added to the editable row.
- `DataStore.updateMaterial` patch type gains `isEstimate`.
- `createMaterial` input already covers it via `Omit<Material, 'id' |
  'updatedAt'>`.

### Data layer

- `mockStore`: materials array gets `isEstimate: false` on existing seed
  rows (required field); pass-through create/update already works generically.
- `supabaseStore`: migration `supabase/migrations/0006_material_estimate_flag.sql`
  adds `is_estimate boolean not null default false` to `materials`.
  `toMaterial` gains `isEstimate: row.is_estimate`. `createMaterial` insert
  gains `is_estimate: input.isEstimate`. `updateMaterial` currently passes
  the patch object straight through to `.update(patch)` — this works today
  because all patchable fields (`name`, `category`, `item`, `type`, `size`,
  `unit`) happen to be spelled the same in camelCase and snake_case. Adding
  `isEstimate` breaks that assumption, so `updateMaterial` needs an explicit
  camelCase → snake_case field mapping (same pattern as `updateProduct`).

## Out of scope

- No exclusion of estimated materials from totals (explicitly rejected —
  flag is informational only).
- No unit conversion beyond sqft/m3 (no sqin, sqm, etc.).
- No retroactive re-tagging of existing materials as estimates.
