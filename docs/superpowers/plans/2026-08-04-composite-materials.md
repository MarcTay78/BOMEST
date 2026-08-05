# Composite Materials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a material be "composite" — priced live as the sum of a recipe of other (non-composite) materials — so a "Hardware pack" built from screws/bolts/dowels can be picked into any product's BOM exactly like a normal material. This replaces the standalone `/hardware` Product-based page built earlier in this session, which is reverted first.

**Architecture:** A new `material_components` table (parent composite material → component material + quantity, flat/no nesting) backs a new `computeEffectivePrice` function in `costCalc.ts` that recurses one level to sum a composite's live price from its components' live prices. Every place that currently prices a material (`BomTable`, `computeProductCost`, the Materials list) switches to this function. No caching/staleness: a composite's price is never stored, always derived at read time.

**Tech Stack:** React 19 + TypeScript, react-router-dom v7, Vite, Supabase JS client (Postgres + RLS), Vitest for pure-logic tests.

## Global Constraints

- No nesting: a composite's recipe may only reference non-composite materials. Enforced at the app layer (recipe picker only offers `isComposite === false` materials), not a DB constraint.
- A composite material's `current_price` is never meaningfully written — insert `0`, never call `updateMaterialPrice` on one.
- `material_components.material_id` (the composite) is `on delete cascade`; `component_material_id` (the ingredient) is `on delete restrict` — mirrors the existing `bom_lines` → `products`/`materials` pattern.
- Match existing code style: inline `style={{...}}`, existing CSS classes, no new CSS files, `useIsAdmin()` gating on mutation controls.
- No new component test framework — pure-logic changes get Vitest cases in `costCalc.test.ts`; everything else is `npm run build` + manual browser verification, matching this repo's existing convention.
- Some files touched here (`src/pages/Materials.tsx` especially) may have unrelated uncommitted work-in-progress already in the working tree when a task starts (this has happened on every prior task in this session). Read the file fresh before editing — if content has drifted from what's quoted in a step, apply the same *logical* change (add the described field/behavior) to the current content rather than blindly pasting the old snippet, and note the drift in your report.

---

### Task 1: Revert the Hardware Product-based feature

**Files:**
- Delete: `src/pages/HardwareList.tsx`
- Delete: `src/pages/HardwareDetail.tsx`
- Modify: `src/lib/types.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/AppNav.tsx`
- Modify: `src/pages/ProductList.tsx`
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/components/BomTable.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: a codebase with no `HARDWARE_CATEGORY`, no `/hardware` routes, no `pickerMaterials` prop on `BomTable` — a clean base for Task 2 onward. `BomTable`'s `Props` after this task: `{ bomLines, materials, editable, onAdd, onRemove, onUpdateRemarks }` (no `pickerMaterials`).

- [ ] **Step 1: Delete the Hardware pages**

```bash
git rm src/pages/HardwareList.tsx src/pages/HardwareDetail.tsx
```

- [ ] **Step 2: Remove `HARDWARE_CATEGORY` from `src/lib/types.ts`**

Find:
```ts
export type ProductCategory = string;

export const HARDWARE_CATEGORY = 'Hardware';

export interface Material {
```
Replace with:
```ts
export type ProductCategory = string;

export interface Material {
```

- [ ] **Step 3: Remove Hardware routes from `src/App.tsx`**

Remove these two import lines:
```ts
import { HardwareDetail } from './pages/HardwareDetail';
import { HardwareList } from './pages/HardwareList';
```
Remove these two route lines (from inside `<Routes>` in `AppShell`):
```tsx
        <Route path="/hardware" element={<HardwareList />} />
        <Route path="/hardware/:id" element={<HardwareDetail />} />
```

- [ ] **Step 4: Remove the nav link from `src/components/AppNav.tsx`**

Remove:
```tsx
      <NavLink to="/hardware">Hardware</NavLink>
```

- [ ] **Step 5: Revert `src/pages/ProductList.tsx`**

Change the import (remove `HARDWARE_CATEGORY`):
```ts
import { HARDWARE_CATEGORY, type BomLine, type Material, type Product } from '../lib/types';
```
becomes:
```ts
import type { BomLine, Material, Product } from '../lib/types';
```

Find:
```tsx
  const catalogProducts = useMemo(() => products.filter((p) => p.category !== HARDWARE_CATEGORY), [products]);

  const categories = useMemo(
    () => Array.from(new Set(catalogProducts.map((p) => p.category).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [catalogProducts],
  );

  const rows = useMemo(() => {
    const filtered = activeCategory === 'All' ? catalogProducts : catalogProducts.filter((p) => p.category === activeCategory);
    const withCost = filtered.map((p) => ({
      product: p,
      cost: computeProductCost(p, bomLinesByProduct[p.id] ?? [], materialsById),
    }));
    return withCost.sort((a, b) => (sort === 'cost' ? b.cost.total - a.cost.total : a.product.name.localeCompare(b.product.name)));
  }, [catalogProducts, bomLinesByProduct, materialsById, sort, activeCategory]);
```
Replace with:
```tsx
  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [products],
  );

  const rows = useMemo(() => {
    const filtered = activeCategory === 'All' ? products : products.filter((p) => p.category === activeCategory);
    const withCost = filtered.map((p) => ({
      product: p,
      cost: computeProductCost(p, bomLinesByProduct[p.id] ?? [], materialsById),
    }));
    return withCost.sort((a, b) => (sort === 'cost' ? b.cost.total - a.cost.total : a.product.name.localeCompare(b.product.name)));
  }, [products, bomLinesByProduct, materialsById, sort, activeCategory]);
```

Find the subtitle line:
```tsx
          <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>{catalogProducts.length} in the catalog · cost calculated live</p>
```
Replace with:
```tsx
          <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>{products.length} in the catalog · cost calculated live</p>
```

- [ ] **Step 6: Revert `src/pages/Dashboard.tsx`**

Change the import:
```ts
import { HARDWARE_CATEGORY, type BomLine, type Material, type Product } from '../lib/types';
```
becomes:
```ts
import type { BomLine, Material, Product } from '../lib/types';
```

Find:
```tsx
    return products
      .filter((p) => p.category !== HARDWARE_CATEGORY)
      .filter((p) => categoryFilter === 'all' || p.category === categoryFilter)
```
Replace with:
```tsx
    return products
      .filter((p) => categoryFilter === 'all' || p.category === categoryFilter)
```

- [ ] **Step 7: Revert `src/components/BomTable.tsx`**

Find:
```tsx
interface Props {
  bomLines: BomLine[];
  materials: Material[];
  pickerMaterials?: Material[];
  editable: boolean;
  onAdd: (materialId: string, quantity: number, remarks: string) => void;
  onRemove: (id: string) => void;
  onUpdateRemarks: (id: string, remarks: string) => void;
}

const COLUMN_COUNT = 9;

export function BomTable({ bomLines, materials, pickerMaterials, editable, onAdd, onRemove, onUpdateRemarks }: Props) {
  const materialsById = new Map(materials.map((m) => [m.id, m]));
  const pickerOptions = pickerMaterials ?? materials;
  const [materialId, setMaterialId] = useState('');
```
Replace with:
```tsx
interface Props {
  bomLines: BomLine[];
  materials: Material[];
  editable: boolean;
  onAdd: (materialId: string, quantity: number, remarks: string) => void;
  onRemove: (id: string) => void;
  onUpdateRemarks: (id: string, remarks: string) => void;
}

const COLUMN_COUNT = 9;

export function BomTable({ bomLines, materials, editable, onAdd, onRemove, onUpdateRemarks }: Props) {
  const materialsById = new Map(materials.map((m) => [m.id, m]));
  const [materialId, setMaterialId] = useState('');
```

Find:
```tsx
                {[...pickerOptions].sort((a, b) => a.name.localeCompare(b.name)).map((m) => (
```
Replace with:
```tsx
                {[...materials].sort((a, b) => a.name.localeCompare(b.name)).map((m) => (
```

- [ ] **Step 8: Typecheck**

Run: `npm run build`
Expected: exit 0, no TypeScript errors (this also confirms nothing else references the deleted files/exports — a stale import would fail here).

- [ ] **Step 9: Manual browser verification**

Start the dev server, confirm: no "Hardware" nav link, `/hardware` and `/hardware/:id` 404 or redirect (no route matches, falls through — that's expected, not a bug to fix), `/products` and `/dashboard` load and behave exactly as before (category tabs still work if present from other WIP in the tree).

- [ ] **Step 10: Commit**

```bash
git add -A -- src/pages/HardwareList.tsx src/pages/HardwareDetail.tsx src/lib/types.ts src/App.tsx src/components/AppNav.tsx src/pages/ProductList.tsx src/pages/Dashboard.tsx src/components/BomTable.tsx
git commit -m "Revert Hardware Product-based page in favor of composite materials

The standalone /hardware page is being replaced by composite
materials (a material priced from a recipe of other materials,
usable directly in any product's BOM) — see
docs/superpowers/specs/2026-08-04-composite-materials-design.md."
```

---

### Task 2: Data layer — migration, types, DataStore, mockStore, supabaseStore

**Files:**
- Create: `supabase/migrations/0005_material_components.sql`
- Modify: `src/lib/types.ts`
- Modify: `src/data/DataStore.ts`
- Modify: `src/data/mockStore.ts`
- Modify: `src/data/supabaseStore.ts`

**Interfaces:**
- Consumes: nothing task-specific (builds on Task 1's reverted base).
- Produces: `Material.isComposite: boolean`; `MaterialComponent { id, materialId, componentMaterialId, quantity }`; `DataStore.listMaterialComponents(): Promise<MaterialComponent[]>`, `DataStore.addMaterialComponent(materialId: string, componentMaterialId: string, quantity: number): Promise<MaterialComponent>`, `DataStore.removeMaterialComponent(id: string): Promise<void>`. Task 3 (cost calc) and Task 4 (Materials UI) both depend on these exact names/signatures.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0005_material_components.sql`:
```sql
-- Composite materials: a material can be priced as the live sum of a
-- recipe of other (non-composite) materials, instead of a manual price.
-- See docs/superpowers/specs/2026-08-04-composite-materials-design.md.

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

- [ ] **Step 2: Add types to `src/lib/types.ts`**

Find:
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
  updatedAt: string;
}
```
Replace with:
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
  materialId: string;
  componentMaterialId: string;
  quantity: number;
}
```

- [ ] **Step 3: Extend `src/data/DataStore.ts`**

Find:
```ts
import type { BomLine, ListKind, ListOption, Material, PriceHistoryPoint, Product, Session } from '../lib/types';
```
Replace with:
```ts
import type { BomLine, ListKind, ListOption, Material, MaterialComponent, PriceHistoryPoint, Product, Session } from '../lib/types';
```

Find:
```ts
  /** Throws DeleteBlockedError if referenced by any bom_lines row. */
  deleteMaterial(id: string): Promise<void>;
  getPriceHistory(materialId: string): Promise<PriceHistoryPoint[]>;
```
Replace with:
```ts
  /** Throws DeleteBlockedError if referenced by any bom_lines or material_components row. */
  deleteMaterial(id: string): Promise<void>;
  getPriceHistory(materialId: string): Promise<PriceHistoryPoint[]>;

  /** Unscoped — the whole table, grouped client-side by materialId (small catalog, matches listMaterials/listOptions style). */
  listMaterialComponents(): Promise<MaterialComponent[]>;
  addMaterialComponent(materialId: string, componentMaterialId: string, quantity: number): Promise<MaterialComponent>;
  removeMaterialComponent(id: string): Promise<void>;
```

- [ ] **Step 4: Implement in `src/data/mockStore.ts`**

Find:
```ts
import type { BomLine, ListKind, ListOption, Material, PriceHistoryPoint, Product, Session } from '../lib/types';
```
Replace with:
```ts
import type { BomLine, ListKind, ListOption, Material, MaterialComponent, PriceHistoryPoint, Product, Session } from '../lib/types';
```

Find the seed `materials` array (all 8 entries need `isComposite: false` added):
```ts
let materials: Material[] = [
  { id: 'm1', name: 'Oak Lumber', category: 'Wood', item: 'Lumber', type: 'S4S', size: '', unit: 'm3', currentPrice: 850, updatedAt: '2026-07-12' },
  { id: 'm2', name: 'Walnut Lumber', category: 'Wood', item: 'Lumber', type: 'S4S', size: '', unit: 'm3', currentPrice: 1450, updatedAt: '2026-07-12' },
  { id: 'm3', name: 'Maple Lumber', category: 'Wood', item: 'Lumber', type: 'RBW', size: '', unit: 'm3', currentPrice: 980, updatedAt: '2026-06-28' },
  { id: 'm4', name: 'Steel Bracket', category: 'Hardware', item: 'Bracket', type: '', size: '', unit: 'pcs', currentPrice: 2.1, updatedAt: '2026-07-03' },
  { id: 'm5', name: 'Wood Screw 40mm', category: 'Hardware', item: 'Screw', type: '', size: '40mm', unit: 'pcs', currentPrice: 0.08, updatedAt: '2026-07-03' },
  { id: 'm6', name: 'Danish Oil Finish', category: 'Finish', item: 'Oil', type: '', size: '', unit: 'L', currentPrice: 18.5, updatedAt: '2026-05-20' },
  { id: 'm7', name: 'Felt Pads', category: 'Packaging', item: 'Pads', type: '', size: '', unit: 'pcs', currentPrice: 0.35, updatedAt: '2026-06-02' },
  { id: 'm8', name: 'Corrugated Box — Large', category: 'Packaging', item: 'Box', type: '', size: 'Large', unit: 'pcs', currentPrice: 4.2, updatedAt: '2026-06-02' },
];
```
Replace with:
```ts
let materials: Material[] = [
  { id: 'm1', name: 'Oak Lumber', category: 'Wood', item: 'Lumber', type: 'S4S', size: '', unit: 'm3', currentPrice: 850, isComposite: false, updatedAt: '2026-07-12' },
  { id: 'm2', name: 'Walnut Lumber', category: 'Wood', item: 'Lumber', type: 'S4S', size: '', unit: 'm3', currentPrice: 1450, isComposite: false, updatedAt: '2026-07-12' },
  { id: 'm3', name: 'Maple Lumber', category: 'Wood', item: 'Lumber', type: 'RBW', size: '', unit: 'm3', currentPrice: 980, isComposite: false, updatedAt: '2026-06-28' },
  { id: 'm4', name: 'Steel Bracket', category: 'Hardware', item: 'Bracket', type: '', size: '', unit: 'pcs', currentPrice: 2.1, isComposite: false, updatedAt: '2026-07-03' },
  { id: 'm5', name: 'Wood Screw 40mm', category: 'Hardware', item: 'Screw', type: '', size: '40mm', unit: 'pcs', currentPrice: 0.08, isComposite: false, updatedAt: '2026-07-03' },
  { id: 'm6', name: 'Danish Oil Finish', category: 'Finish', item: 'Oil', type: '', size: '', unit: 'L', currentPrice: 18.5, isComposite: false, updatedAt: '2026-05-20' },
  { id: 'm7', name: 'Felt Pads', category: 'Packaging', item: 'Pads', type: '', size: '', unit: 'pcs', currentPrice: 0.35, isComposite: false, updatedAt: '2026-06-02' },
  { id: 'm8', name: 'Corrugated Box — Large', category: 'Packaging', item: 'Box', type: '', size: 'Large', unit: 'pcs', currentPrice: 4.2, isComposite: false, updatedAt: '2026-06-02' },
];
```

Find:
```ts
let bomLines: BomLine[] = [
```
Add just before it (new seed array, starts empty):
```ts
let materialComponents: MaterialComponent[] = [];

let bomLines: BomLine[] = [
```

Find:
```ts
  async deleteMaterial(id) {
    const usedByCount = bomLines.filter((l) => l.materialId === id).length;
    if (usedByCount > 0) throw new DeleteBlockedError(usedByCount);
    materials = materials.filter((m) => m.id !== id);
  },
```
Replace with:
```ts
  async deleteMaterial(id) {
    const bomCount = bomLines.filter((l) => l.materialId === id).length;
    const componentCount = materialComponents.filter((c) => c.componentMaterialId === id).length;
    const usedByCount = bomCount + componentCount;
    if (usedByCount > 0) throw new DeleteBlockedError(usedByCount);
    materials = materials.filter((m) => m.id !== id);
  },
```

Find:
```ts
  async getPriceHistory(materialId) {
    return priceHistory.filter((h) => h.materialId === materialId).sort((a, b) => a.changedAt.localeCompare(b.changedAt));
  },
```
Add immediately after it:
```ts

  async listMaterialComponents() {
    return [...materialComponents];
  },
  async addMaterialComponent(materialId, componentMaterialId, quantity) {
    const component: MaterialComponent = { id: newId('mc'), materialId, componentMaterialId, quantity };
    materialComponents = [...materialComponents, component];
    return component;
  },
  async removeMaterialComponent(id) {
    materialComponents = materialComponents.filter((c) => c.id !== id);
  },
```

- [ ] **Step 5: Implement in `src/data/supabaseStore.ts`**

Find:
```ts
import type { BomLine, ListKind, ListOption, Material, PriceHistoryPoint, Product, Session } from '../lib/types';
```
Replace with:
```ts
import type { BomLine, ListKind, ListOption, Material, MaterialComponent, PriceHistoryPoint, Product, Session } from '../lib/types';
```

Find:
```ts
const toMaterial = (row: any): Material => ({
  id: row.id,
  name: row.name,
  category: row.category,
  item: row.item,
  type: row.type,
  size: row.size,
  unit: row.unit,
  currentPrice: Number(row.current_price),
  updatedAt: row.updated_at,
});
```
Replace with:
```ts
const toMaterial = (row: any): Material => ({
  id: row.id,
  name: row.name,
  category: row.category,
  item: row.item,
  type: row.type,
  size: row.size,
  unit: row.unit,
  currentPrice: Number(row.current_price),
  isComposite: row.is_composite,
  updatedAt: row.updated_at,
});

const toMaterialComponent = (row: any): MaterialComponent => ({
  id: row.id,
  materialId: row.material_id,
  componentMaterialId: row.component_material_id,
  quantity: Number(row.quantity),
});
```

Find:
```ts
  async createMaterial(input) {
    const { data, error } = await requireClient()
      .from('materials')
      .insert({
        name: input.name,
        category: input.category,
        item: input.item,
        type: input.type,
        size: input.size,
        unit: input.unit,
        current_price: input.currentPrice,
      })
      .select()
      .single();
    if (error) throw error;
    return toMaterial(data);
  },
```
Replace with:
```ts
  async createMaterial(input) {
    const { data, error } = await requireClient()
      .from('materials')
      .insert({
        name: input.name,
        category: input.category,
        item: input.item,
        type: input.type,
        size: input.size,
        unit: input.unit,
        current_price: input.currentPrice,
        is_composite: input.isComposite,
      })
      .select()
      .single();
    if (error) throw error;
    return toMaterial(data);
  },
```

Find:
```ts
  async deleteMaterial(id) {
    const client = requireClient();
    const { count, error: countError } = await client
      .from('bom_lines')
      .select('id', { count: 'exact', head: true })
      .eq('material_id', id);
    if (countError) throw countError;
    if (count && count > 0) throw new DeleteBlockedError(count);
    const { error } = await client.from('materials').delete().eq('id', id);
    if (error) throw error;
  },
```
Replace with:
```ts
  async deleteMaterial(id) {
    const client = requireClient();
    const { count: bomCount, error: bomCountError } = await client
      .from('bom_lines')
      .select('id', { count: 'exact', head: true })
      .eq('material_id', id);
    if (bomCountError) throw bomCountError;
    const { count: componentCount, error: componentCountError } = await client
      .from('material_components')
      .select('id', { count: 'exact', head: true })
      .eq('component_material_id', id);
    if (componentCountError) throw componentCountError;
    const usedByCount = (bomCount ?? 0) + (componentCount ?? 0);
    if (usedByCount > 0) throw new DeleteBlockedError(usedByCount);
    const { error } = await client.from('materials').delete().eq('id', id);
    if (error) throw error;
  },
```

Find:
```ts
  async getPriceHistory(materialId) {
    const { data, error } = await requireClient()
      .from('material_price_history')
      .select('*')
      .eq('material_id', materialId)
      .order('changed_at', { ascending: true });
    if (error) throw error;
    return data.map(toHistoryPoint);
  },
```
Add immediately after it:
```ts

  async listMaterialComponents() {
    const { data, error } = await requireClient().from('material_components').select('*');
    if (error) throw error;
    return data.map(toMaterialComponent);
  },
  async addMaterialComponent(materialId, componentMaterialId, quantity) {
    const { data, error } = await requireClient()
      .from('material_components')
      .insert({ material_id: materialId, component_material_id: componentMaterialId, quantity })
      .select()
      .single();
    if (error) throw error;
    return toMaterialComponent(data);
  },
  async removeMaterialComponent(id) {
    const { error } = await requireClient().from('material_components').delete().eq('id', id);
    if (error) throw error;
  },
```

- [ ] **Step 6: Typecheck**

Run: `npm run build`
Expected: exit 0, no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0005_material_components.sql src/lib/types.ts src/data/DataStore.ts src/data/mockStore.ts src/data/supabaseStore.ts
git commit -m "Add composite-material data layer: migration, types, DataStore, both stores"
```

---

### Task 3: Cost calculation — `computeEffectivePrice`

**Files:**
- Modify: `src/lib/costCalc.ts`
- Modify: `src/lib/costCalc.test.ts`

**Interfaces:**
- Consumes: `Material.isComposite`, `MaterialComponent` from Task 2.
- Produces: `computeEffectivePrice(material: Material, materialsById: Map<string, Material>, componentsByMaterialId: Map<string, MaterialComponent[]>): EffectiveUnit`. `computeProductCost` gains a 4th, optional parameter `componentsByMaterialId: Map<string, MaterialComponent[]> = new Map()` — existing call sites that don't pass it keep compiling and behave as before (a composite referenced in a BOM without the map simply prices at 0, never a crash). Task 4 and Task 5 both call `computeEffectivePrice` by this exact name/signature.

- [ ] **Step 1: Write the failing tests**

In `src/lib/costCalc.test.ts`, update the import line:
```ts
import { describe, expect, it } from 'vitest';
import { computeCategoryBreakdown, computeEffectiveUnit, computeProductCost, formatCurrency, parseSizeMm } from './costCalc';
import type { BomLine, Material } from './types';
```
becomes:
```ts
import { describe, expect, it } from 'vitest';
import { computeCategoryBreakdown, computeEffectivePrice, computeEffectiveUnit, computeProductCost, formatCurrency, parseSizeMm } from './costCalc';
import type { BomLine, Material, MaterialComponent } from './types';
```

Update the top-level `materials` array to add `isComposite: false` to every entry:
```ts
const materials: Material[] = [
  { id: 'm1', name: 'Oak Lumber', category: 'Wood', item: 'Lumber', type: 'S4S', size: '', unit: 'm3', currentPrice: 850, updatedAt: '' },
  { id: 'm2', name: 'Steel Bracket', category: 'Hardware', item: 'Bracket', type: '', size: '', unit: 'pcs', currentPrice: 2.1, updatedAt: '' },
  { id: 'm3', name: 'Danish Oil Finish', category: 'Finish', item: 'Oil', type: '', size: '', unit: 'L', currentPrice: 18.5, updatedAt: '' },
  { id: 'm4', name: 'Box', category: 'Packaging', item: 'Box', type: '', size: '', unit: 'pcs', currentPrice: 4.2, updatedAt: '' },
];
```
becomes:
```ts
const materials: Material[] = [
  { id: 'm1', name: 'Oak Lumber', category: 'Wood', item: 'Lumber', type: 'S4S', size: '', unit: 'm3', currentPrice: 850, isComposite: false, updatedAt: '' },
  { id: 'm2', name: 'Steel Bracket', category: 'Hardware', item: 'Bracket', type: '', size: '', unit: 'pcs', currentPrice: 2.1, isComposite: false, updatedAt: '' },
  { id: 'm3', name: 'Danish Oil Finish', category: 'Finish', item: 'Oil', type: '', size: '', unit: 'L', currentPrice: 18.5, isComposite: false, updatedAt: '' },
  { id: 'm4', name: 'Box', category: 'Packaging', item: 'Box', type: '', size: '', unit: 'pcs', currentPrice: 4.2, isComposite: false, updatedAt: '' },
];
```

Also find the m9 literal further down (inside `describe('computeProductCost with m3-to-pcs conversion'...)`):
```ts
      ['m9', { id: 'm9', name: 'Chair Leg', category: 'Wood', item: 'Leg', type: 'S4S', size: '24x590x915', unit: 'm3', currentPrice: 850, updatedAt: '' }],
```
becomes:
```ts
      ['m9', { id: 'm9', name: 'Chair Leg', category: 'Wood', item: 'Leg', type: 'S4S', size: '24x590x915', unit: 'm3', currentPrice: 850, isComposite: false, updatedAt: '' }],
```

Add a new `describe` block at the end of the file (after the `formatCurrency` block):
```ts

describe('computeEffectivePrice', () => {
  it('passes through to computeEffectiveUnit for a non-composite material', () => {
    const price = computeEffectivePrice(materials[0], materialsById, new Map());
    expect(price).toEqual(computeEffectiveUnit(materials[0]));
  });

  it('sums quantity * component effective price for a composite material', () => {
    const pack: Material = { id: 'pack', name: 'Hardware Pack', category: 'Hardware', item: '', type: '', size: '', unit: 'pcs', currentPrice: 0, isComposite: true, updatedAt: '' };
    const withPack = new Map(materialsById);
    withPack.set('pack', pack);
    const components: MaterialComponent[] = [
      { id: 'c1', materialId: 'pack', componentMaterialId: 'm2', quantity: 4 },
      { id: 'c2', materialId: 'pack', componentMaterialId: 'm4', quantity: 1 },
    ];
    const componentsByMaterialId = new Map([['pack', components]]);
    const price = computeEffectivePrice(pack, withPack, componentsByMaterialId);
    expect(price).toEqual({ price: 4 * 2.1 + 1 * 4.2, unit: 'pcs', converted: false });
  });

  it('skips a component whose material no longer exists, without throwing', () => {
    const pack: Material = { id: 'pack', name: 'Hardware Pack', category: 'Hardware', item: '', type: '', size: '', unit: 'pcs', currentPrice: 0, isComposite: true, updatedAt: '' };
    const withPack = new Map(materialsById);
    withPack.set('pack', pack);
    const components: MaterialComponent[] = [
      { id: 'c1', materialId: 'pack', componentMaterialId: 'm2', quantity: 4 },
      { id: 'c2', materialId: 'pack', componentMaterialId: 'missing', quantity: 99 },
    ];
    const componentsByMaterialId = new Map([['pack', components]]);
    const price = computeEffectivePrice(pack, withPack, componentsByMaterialId);
    expect(price).toEqual({ price: 4 * 2.1, unit: 'pcs', converted: false });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `computeEffectivePrice` is not exported / not defined, and TypeScript errors on the missing `isComposite` field disappear once step 1's material literals are in place, but the new `describe('computeEffectivePrice', ...)` block fails because the function doesn't exist yet.

- [ ] **Step 3: Implement `computeEffectivePrice` in `src/lib/costCalc.ts`**

Find:
```ts
import type { BomLine, Material, Product } from './types';
```
Replace with:
```ts
import type { BomLine, Material, MaterialComponent, Product } from './types';
```

Find:
```ts
/** A material priced per m3 with a parseable WxHxL Size auto-converts to a $/pc rate. */
export function computeEffectiveUnit(material: Pick<Material, 'unit' | 'size' | 'currentPrice'>): EffectiveUnit {
  const isVolumePriced = material.unit.trim().toLowerCase() === 'm3';
  const dims = isVolumePriced ? parseSizeMm(material.size) : null;
  if (!dims) return { price: material.currentPrice, unit: material.unit, converted: false };
  const [a, b, c] = dims;
  const volumeM3 = (a * b * c) / MM3_PER_M3;
  return { price: volumeM3 * material.currentPrice, unit: 'pcs', converted: true };
}
```
Add immediately after it:
```ts

/** A composite material's price is the live sum of quantity * component effective price
 *  over its recipe (material_components), recursing one level — recipes are flat, a
 *  composite's components are never themselves composite. A non-composite material just
 *  delegates to computeEffectiveUnit. A component id missing from materialsById is skipped
 *  (defensive, same pattern as computeProductCost's missing-material handling). */
export function computeEffectivePrice(
  material: Material,
  materialsById: Map<string, Material>,
  componentsByMaterialId: Map<string, MaterialComponent[]>,
): EffectiveUnit {
  if (!material.isComposite) return computeEffectiveUnit(material);
  const components = componentsByMaterialId.get(material.id) ?? [];
  let total = 0;
  for (const component of components) {
    const componentMaterial = materialsById.get(component.componentMaterialId);
    if (!componentMaterial) continue;
    total += component.quantity * computeEffectivePrice(componentMaterial, materialsById, componentsByMaterialId).price;
  }
  return { price: total, unit: material.unit, converted: false };
}
```

Find:
```ts
export function computeProductCost(
  product: Pick<Product, 'laborCost'>,
  bomLines: BomLine[],
  materialsById: Map<string, Material>,
): ProductCost {
  const order: string[] = [];
  const sums = new Map<string, number>();

  for (const line of bomLines) {
    const material = materialsById.get(line.materialId);
    if (!material) continue;
    const category = material.category || 'Uncategorized';
    if (!sums.has(category)) {
      sums.set(category, 0);
      order.push(category);
    }
    const { price } = computeEffectiveUnit(material);
    sums.set(category, sums.get(category)! + line.quantity * price);
  }
```
Replace with:
```ts
export function computeProductCost(
  product: Pick<Product, 'laborCost'>,
  bomLines: BomLine[],
  materialsById: Map<string, Material>,
  componentsByMaterialId: Map<string, MaterialComponent[]> = new Map(),
): ProductCost {
  const order: string[] = [];
  const sums = new Map<string, number>();

  for (const line of bomLines) {
    const material = materialsById.get(line.materialId);
    if (!material) continue;
    const category = material.category || 'Uncategorized';
    if (!sums.has(category)) {
      sums.set(category, 0);
      order.push(category);
    }
    const { price } = computeEffectivePrice(material, materialsById, componentsByMaterialId);
    sums.set(category, sums.get(category)! + line.quantity * price);
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS, all tests including the new `computeEffectivePrice` block. Output should be pristine (no warnings).

- [ ] **Step 5: Commit**

```bash
git add src/lib/costCalc.ts src/lib/costCalc.test.ts
git commit -m "Add computeEffectivePrice for composite material pricing"
```

---

### Task 4: Materials page UI — create and manage composite materials

**Files:**
- Modify: `src/pages/Materials.tsx`

**Interfaces:**
- Consumes: `Material.isComposite`, `MaterialComponent`, `dataStore.listMaterialComponents/addMaterialComponent/removeMaterialComponent` (Task 2), `computeEffectivePrice` (Task 3).
- Produces: nothing consumed by a later task — this task is UI-only and self-contained.

Read `src/pages/Materials.tsx` fresh before starting — per the Global Constraints note, it may have unrelated WIP already applied (category tabs, sort, `useCssVarHeight`) beyond what's quoted below. The snippets below are the file's content as of this plan's writing; apply the same *logical* changes if the surrounding code has moved.

- [ ] **Step 1: Fetch and index material components**

Find:
```tsx
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useIsAdmin } from '../auth/AuthContext';
import { EditIcon, PlusIcon, TrashIcon, WarningIcon } from '../components/icons';
import { OptionSelect } from '../components/OptionSelect';
import { DeleteBlockedError, dataStore } from '../data';
import { formatCurrency, formatDate } from '../lib/costCalc';
import type { Material } from '../lib/types';
import { useCssVarHeight } from '../lib/useCssVarHeight';
```
Replace with:
```tsx
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useIsAdmin } from '../auth/AuthContext';
import { EditIcon, PlusIcon, TrashIcon, WarningIcon } from '../components/icons';
import { OptionSelect } from '../components/OptionSelect';
import { DeleteBlockedError, dataStore } from '../data';
import { computeEffectivePrice, formatCurrency, formatDate } from '../lib/costCalc';
import type { Material, MaterialComponent } from '../lib/types';
import { useCssVarHeight } from '../lib/useCssVarHeight';
```

Find:
```tsx
export function Materials() {
  const isAdmin = useIsAdmin();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [adding, setAdding] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [activeCategory, setActiveCategory] = useState('All');
  const titleRef = useCssVarHeight<HTMLDivElement>('--materials-title-h');
  const tabsRef = useCssVarHeight<HTMLDivElement>('--materials-tabs-h');

  const reload = () => dataStore.listMaterials().then(setMaterials);
  useEffect(() => {
    reload();
  }, []);
```
Replace with:
```tsx
export function Materials() {
  const isAdmin = useIsAdmin();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialComponents, setMaterialComponents] = useState<MaterialComponent[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [adding, setAdding] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [activeCategory, setActiveCategory] = useState('All');
  const [recipeOpenId, setRecipeOpenId] = useState<string | null>(null);
  const titleRef = useCssVarHeight<HTMLDivElement>('--materials-title-h');
  const tabsRef = useCssVarHeight<HTMLDivElement>('--materials-tabs-h');

  const reload = () =>
    Promise.all([dataStore.listMaterials(), dataStore.listMaterialComponents()]).then(([mats, components]) => {
      setMaterials(mats);
      setMaterialComponents(components);
    });
  useEffect(() => {
    reload();
  }, []);

  const materialsById = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);
  const componentsByMaterialId = useMemo(() => {
    const map = new Map<string, MaterialComponent[]>();
    for (const c of materialComponents) {
      const list = map.get(c.materialId) ?? [];
      list.push(c);
      map.set(c.materialId, list);
    }
    return map;
  }, [materialComponents]);
```

- [ ] **Step 2: Skip price editing for composites, show computed price**

Find:
```tsx
  const commitEdit = async (m: Material) => {
    setEditingId(null);
    if (!draft) return;
    const price = Number(draft.price);
    if (Number.isNaN(price) || price < 0) return;
    if (price !== m.currentPrice) await dataStore.updateMaterialPrice(m.id, price);
    await dataStore.updateMaterial(m.id, {
      name: draft.name.trim() || m.name,
      category: draft.category,
      item: draft.item,
      type: draft.type,
      size: draft.size,
      unit: draft.unit,
    });
    setDraft(null);
    await reload();
  };
```
Replace with:
```tsx
  const commitEdit = async (m: Material) => {
    setEditingId(null);
    if (!draft) return;
    if (!m.isComposite) {
      const price = Number(draft.price);
      if (Number.isNaN(price) || price < 0) return;
      if (price !== m.currentPrice) await dataStore.updateMaterialPrice(m.id, price);
    }
    await dataStore.updateMaterial(m.id, {
      name: draft.name.trim() || m.name,
      category: draft.category,
      item: draft.item,
      type: draft.type,
      size: draft.size,
      unit: draft.unit,
    });
    setDraft(null);
    await reload();
  };
```

- [ ] **Step 3: Extend delete-blocked message and add recipe mutation handlers**

Find:
```tsx
  const handleDelete = async (id: string) => {
    setBlockedMessage(null);
    try {
      await dataStore.deleteMaterial(id);
      await reload();
    } catch (err) {
      if (err instanceof DeleteBlockedError) setBlockedMessage(`Can't delete — used in ${err.usedByCount} product(s).`);
      else setBlockedMessage(err instanceof Error ? err.message : 'Delete failed.');
    }
  };
```
Replace with:
```tsx
  const handleDelete = async (id: string) => {
    setBlockedMessage(null);
    try {
      await dataStore.deleteMaterial(id);
      await reload();
    } catch (err) {
      if (err instanceof DeleteBlockedError) setBlockedMessage(`Can't delete — used in ${err.usedByCount} product(s) or recipe(s).`);
      else setBlockedMessage(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const addRecipeComponent = async (materialId: string, componentMaterialId: string, quantity: number) => {
    await dataStore.addMaterialComponent(materialId, componentMaterialId, quantity);
    await reload();
  };

  const removeRecipeComponent = async (componentId: string) => {
    await dataStore.removeMaterialComponent(componentId);
    await reload();
  };
```

- [ ] **Step 4: Show a composite badge + computed price in the read row, and a "Recipe" toggle button**

Find:
```tsx
                    <>
                      <td>{m.name}</td>
                      <td>{m.category ? <span className="tag tag-neutral">{m.category}</span> : <span className="text-muted">—</span>}</td>
                      <td className="text-muted">{m.item || '—'}</td>
                      <td className="text-muted">{m.type || '—'}</td>
                      <td className="text-muted">{m.size || '—'}</td>
                      <td className="text-muted">{m.unit}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(m.currentPrice)} / {m.unit}</td>
                      <td className="text-muted">{formatDate(m.updatedAt)}</td>
                      {isAdmin && (
                        <td style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button type="button" className="btn btn-ghost btn-icon" aria-label="Edit" onClick={() => startEdit(m)}><EditIcon /></button>
                          <button type="button" className="btn btn-ghost btn-icon" aria-label="Delete" onClick={() => handleDelete(m.id)}><TrashIcon /></button>
                        </td>
                      )}
                    </>
```
Replace with:
```tsx
                    <>
                      <td>
                        {m.name}
                        {m.isComposite && <span className="tag tag-accent" style={{ marginLeft: 6 }}>Composite</span>}
                      </td>
                      <td>{m.category ? <span className="tag tag-neutral">{m.category}</span> : <span className="text-muted">—</span>}</td>
                      <td className="text-muted">{m.item || '—'}</td>
                      <td className="text-muted">{m.type || '—'}</td>
                      <td className="text-muted">{m.size || '—'}</td>
                      <td className="text-muted">{m.unit}</td>
                      <td style={{ textAlign: 'right' }}>
                        {formatCurrency(m.isComposite ? computeEffectivePrice(m, materialsById, componentsByMaterialId).price : m.currentPrice)} / {m.unit}
                      </td>
                      <td className="text-muted">{formatDate(m.updatedAt)}</td>
                      {isAdmin && (
                        <td style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          {m.isComposite && (
                            <button type="button" className="btn btn-ghost" onClick={() => setRecipeOpenId(recipeOpenId === m.id ? null : m.id)}>
                              Recipe
                            </button>
                          )}
                          <button type="button" className="btn btn-ghost btn-icon" aria-label="Edit" onClick={() => startEdit(m)}><EditIcon /></button>
                          <button type="button" className="btn btn-ghost btn-icon" aria-label="Delete" onClick={() => handleDelete(m.id)}><TrashIcon /></button>
                        </td>
                      )}
                    </>
```

Also make the editing branch's price cell read-only for composites. Find:
```tsx
                      <td style={{ textAlign: 'right' }}>
                        <input
                          className="input"
                          style={{ minHeight: 30, width: 90, textAlign: 'right' }}
                          value={draft.price}
                          onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                        />
                      </td>
```
Replace with:
```tsx
                      <td style={{ textAlign: 'right' }}>
                        {m.isComposite ? (
                          <span>{formatCurrency(computeEffectivePrice(m, materialsById, componentsByMaterialId).price)}</span>
                        ) : (
                          <input
                            className="input"
                            style={{ minHeight: 30, width: 90, textAlign: 'right' }}
                            value={draft.price}
                            onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                          />
                        )}
                      </td>
```

- [ ] **Step 5: Render the recipe editor row beneath an expanded composite**

Find the closing of the row-mapping `tbody`:
```tsx
                </tr>
              );
            })}
          </tbody>
```
Replace with:
```tsx
                  {recipeOpenId === m.id && m.isComposite && (
                    <tr>
                      <td colSpan={9}>
                        <RecipeEditor
                          material={m}
                          materials={materials}
                          components={componentsByMaterialId.get(m.id) ?? []}
                          onAdd={(componentMaterialId, quantity) => addRecipeComponent(m.id, componentMaterialId, quantity)}
                          onRemove={removeRecipeComponent}
                        />
                      </td>
                    </tr>
                  )}
                </tr>
              );
            })}
          </tbody>
```

- [ ] **Step 6: Add the `RecipeEditor` component**

Find the end of the file:
```tsx
function AddMaterialForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
```
Add immediately before it:
```tsx
function RecipeEditor({
  material,
  materials,
  components,
  onAdd,
  onRemove,
}: {
  material: Material;
  materials: Material[];
  components: MaterialComponent[];
  onAdd: (componentMaterialId: string, quantity: number) => void;
  onRemove: (componentId: string) => void;
}) {
  const [componentMaterialId, setComponentMaterialId] = useState('');
  const [quantity, setQuantity] = useState('');
  const pickable = materials.filter((m) => !m.isComposite && m.id !== material.id);
  const materialsById = new Map(materials.map((m) => [m.id, m]));

  const submitAdd = () => {
    const qty = Number(quantity);
    if (!componentMaterialId || !qty || qty <= 0) return;
    onAdd(componentMaterialId, qty);
    setComponentMaterialId('');
    setQuantity('');
  };

  return (
    <div className="card" style={{ padding: 14, background: 'var(--color-surface)' }}>
      <div className="card-kicker" style={{ marginBottom: 8 }}>Recipe for {material.name}</div>
      {components.length === 0 && <p className="text-muted" style={{ margin: '0 0 8px', fontSize: 13 }}>No components yet.</p>}
      {components.map((c) => {
        const componentMaterial = materialsById.get(c.componentMaterialId);
        return (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', fontSize: 13 }}>
            <span style={{ flex: 1 }}>{componentMaterial ? componentMaterial.name : 'Unknown material'}</span>
            <span className="text-muted">× {c.quantity}</span>
            <button type="button" className="btn btn-ghost btn-icon" aria-label="Remove component" onClick={() => onRemove(c.id)}>
              <TrashIcon />
            </button>
          </div>
        );
      })}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <select className="input" style={{ minHeight: 30 }} value={componentMaterialId} onChange={(e) => setComponentMaterialId(e.target.value)}>
          <option value="">Choose material…</option>
          {[...pickable].sort((a, b) => a.name.localeCompare(b.name)).map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <input className="input" style={{ minHeight: 30, width: 80 }} placeholder="qty" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        <button type="button" className="btn btn-secondary" onClick={submitAdd}>Add</button>
      </div>
    </div>
  );
}

function AddMaterialForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
```

- [ ] **Step 7: Pass `materials` into `AddMaterialForm` and add the composite toggle + create-time recipe builder**

Find where `AddMaterialForm` is rendered:
```tsx
      {adding && <AddMaterialForm onDone={async () => { setAdding(false); await reload(); }} onCancel={() => setAdding(false)} />}
```
Replace with:
```tsx
      {adding && <AddMaterialForm materials={materials} onDone={async () => { setAdding(false); await reload(); }} onCancel={() => setAdding(false)} />}
```

Find the full `AddMaterialForm` function:
```tsx
function AddMaterialForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [item, setItem] = useState('');
  const [type, setType] = useState('');
  const [size, setSize] = useState('');
  const [unit, setUnit] = useState('');
  const [price, setPrice] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const currentPrice = Number(price);
    if (!name.trim() || !unit.trim() || Number.isNaN(currentPrice) || currentPrice < 0) return;
    await dataStore.createMaterial({ name: name.trim(), category, item, type, size: size.trim(), unit: unit.trim(), currentPrice });
    onDone();
  };

  return (
    <form className="card elev-sm" style={{ padding: 20, marginBottom: 18, flexDirection: 'row', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }} onSubmit={handleSubmit}>
      <div className="field"><label>Name</label><input className="input" style={{ minHeight: 32 }} value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div className="field">
        <label>Category</label>
        <OptionSelect kind="material_categories" value={category} onChange={setCategory} style={{ minHeight: 32 }} />
      </div>
      <div className="field">
        <label>Items</label>
        <OptionSelect kind="material_items" value={item} onChange={setItem} style={{ minHeight: 32 }} />
      </div>
      <div className="field">
        <label>Type</label>
        <OptionSelect kind="material_types" value={type} onChange={setType} style={{ minHeight: 32 }} />
      </div>
      <div className="field"><label>Size</label><input className="input" style={{ minHeight: 32, width: 100 }} value={size} onChange={(e) => setSize(e.target.value)} placeholder="20x56x460" /></div>
      <div className="field"><label>Unit</label><input className="input" style={{ minHeight: 32, width: 90 }} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="m3, pcs…" required /></div>
      <div className="field"><label>Starting price</label><input className="input" style={{ minHeight: 32, width: 100 }} value={price} onChange={(e) => setPrice(e.target.value)} required /></div>
      <button type="submit" className="btn btn-primary">Add</button>
      <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
    </form>
  );
}
```
Replace with:
```tsx
function AddMaterialForm({ materials, onDone, onCancel }: { materials: Material[]; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [item, setItem] = useState('');
  const [type, setType] = useState('');
  const [size, setSize] = useState('');
  const [unit, setUnit] = useState('');
  const [price, setPrice] = useState('');
  const [isComposite, setIsComposite] = useState(false);
  const [recipeRows, setRecipeRows] = useState<{ componentMaterialId: string; quantity: string }[]>([]);
  const [recipeMaterialId, setRecipeMaterialId] = useState('');
  const [recipeQty, setRecipeQty] = useState('');

  const pickable = materials.filter((m) => !m.isComposite);
  const pickableById = new Map(pickable.map((m) => [m.id, m]));

  const addRecipeRow = () => {
    const qty = Number(recipeQty);
    if (!recipeMaterialId || !qty || qty <= 0) return;
    setRecipeRows([...recipeRows, { componentMaterialId: recipeMaterialId, quantity: recipeQty }]);
    setRecipeMaterialId('');
    setRecipeQty('');
  };

  const removeRecipeRow = (index: number) => {
    setRecipeRows(recipeRows.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !unit.trim()) return;
    if (isComposite) {
      if (recipeRows.length === 0) return;
      const material = await dataStore.createMaterial({
        name: name.trim(), category, item, type, size: size.trim(), unit: unit.trim(), currentPrice: 0, isComposite: true,
      });
      for (const row of recipeRows) {
        await dataStore.addMaterialComponent(material.id, row.componentMaterialId, Number(row.quantity));
      }
    } else {
      const currentPrice = Number(price);
      if (Number.isNaN(currentPrice) || currentPrice < 0) return;
      await dataStore.createMaterial({ name: name.trim(), category, item, type, size: size.trim(), unit: unit.trim(), currentPrice, isComposite: false });
    }
    onDone();
  };

  return (
    <form className="card elev-sm" style={{ padding: 20, marginBottom: 18, flexDirection: 'row', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }} onSubmit={handleSubmit}>
      <div className="field"><label>Name</label><input className="input" style={{ minHeight: 32 }} value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div className="field">
        <label>Category</label>
        <OptionSelect kind="material_categories" value={category} onChange={setCategory} style={{ minHeight: 32 }} />
      </div>
      <div className="field">
        <label>Items</label>
        <OptionSelect kind="material_items" value={item} onChange={setItem} style={{ minHeight: 32 }} />
      </div>
      <div className="field">
        <label>Type</label>
        <OptionSelect kind="material_types" value={type} onChange={setType} style={{ minHeight: 32 }} />
      </div>
      <div className="field"><label>Size</label><input className="input" style={{ minHeight: 32, width: 100 }} value={size} onChange={(e) => setSize(e.target.value)} placeholder="20x56x460" /></div>
      <div className="field"><label>Unit</label><input className="input" style={{ minHeight: 32, width: 90 }} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="m3, pcs…" required /></div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <input type="checkbox" checked={isComposite} onChange={(e) => setIsComposite(e.target.checked)} />
        Composite
      </label>
      {isComposite ? (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recipeRows.map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
              <span style={{ flex: 1 }}>{pickableById.get(row.componentMaterialId)?.name ?? 'Unknown material'}</span>
              <span className="text-muted">× {row.quantity}</span>
              <button type="button" className="btn btn-ghost btn-icon" aria-label="Remove row" onClick={() => removeRecipeRow(i)}>
                <TrashIcon />
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select className="input" style={{ minHeight: 32 }} value={recipeMaterialId} onChange={(e) => setRecipeMaterialId(e.target.value)}>
              <option value="">Choose material…</option>
              {[...pickable].sort((a, b) => a.name.localeCompare(b.name)).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <input className="input" style={{ minHeight: 32, width: 80 }} placeholder="qty" value={recipeQty} onChange={(e) => setRecipeQty(e.target.value)} />
            <button type="button" className="btn btn-secondary" onClick={addRecipeRow}>Add row</button>
          </div>
        </div>
      ) : (
        <div className="field"><label>Starting price</label><input className="input" style={{ minHeight: 32, width: 100 }} value={price} onChange={(e) => setPrice(e.target.value)} required /></div>
      )}
      <button type="submit" className="btn btn-primary">Add</button>
      <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
    </form>
  );
}
```

- [ ] **Step 8: Typecheck**

Run: `npm run build`
Expected: exit 0, no TypeScript errors.

- [ ] **Step 9: Manual browser verification**

1. Log in as admin, go to `/materials`.
2. Add two plain materials if not already present (or use seeded ones like "Steel Bracket", "Felt Pads").
3. Click "Add material", check "Composite", add 2 recipe rows (pick materials + qty), submit.
4. Confirm the new material shows a "Composite" badge and a computed price equal to the sum you'd expect.
5. Click "Recipe" on it, remove a component, confirm price updates on reload; add a different component, confirm again.
6. Try editing the composite's name/category — confirm it saves and the price cell stays read-only (no price input shown).
7. Confirm a non-composite material's add/edit flow is completely unchanged.

- [ ] **Step 10: Commit**

```bash
git add src/pages/Materials.tsx
git commit -m "Add composite material creation and recipe editing to Materials page"
```

---

### Task 5: Wire composite pricing into every material consumer

**Files:**
- Modify: `src/components/BomTable.tsx`
- Modify: `src/pages/ProductDetail.tsx`
- Modify: `src/pages/ProductList.tsx`
- Modify: `src/pages/Dashboard.tsx`

**Interfaces:**
- Consumes: `computeEffectivePrice` (Task 3), `dataStore.listMaterialComponents()` (Task 2).
- Produces: nothing consumed later — final task.

- [ ] **Step 1: `src/components/BomTable.tsx` — price via `computeEffectivePrice`**

Find:
```tsx
import { useState } from 'react';
import { computeEffectiveUnit, formatCurrency } from '../lib/costCalc';
import type { BomLine, Material } from '../lib/types';
import { TrashIcon } from './icons';

interface Props {
  bomLines: BomLine[];
  materials: Material[];
  editable: boolean;
  onAdd: (materialId: string, quantity: number, remarks: string) => void;
  onRemove: (id: string) => void;
  onUpdateRemarks: (id: string, remarks: string) => void;
}

const COLUMN_COUNT = 9;

export function BomTable({ bomLines, materials, editable, onAdd, onRemove, onUpdateRemarks }: Props) {
  const materialsById = new Map(materials.map((m) => [m.id, m]));
  const [materialId, setMaterialId] = useState('');
```
Replace with:
```tsx
import { useState } from 'react';
import { computeEffectivePrice, formatCurrency } from '../lib/costCalc';
import type { BomLine, Material, MaterialComponent } from '../lib/types';
import { TrashIcon } from './icons';

interface Props {
  bomLines: BomLine[];
  materials: Material[];
  componentsByMaterialId: Map<string, MaterialComponent[]>;
  editable: boolean;
  onAdd: (materialId: string, quantity: number, remarks: string) => void;
  onRemove: (id: string) => void;
  onUpdateRemarks: (id: string, remarks: string) => void;
}

const COLUMN_COUNT = 9;

export function BomTable({ bomLines, materials, componentsByMaterialId, editable, onAdd, onRemove, onUpdateRemarks }: Props) {
  const materialsById = new Map(materials.map((m) => [m.id, m]));
  const [materialId, setMaterialId] = useState('');
```

Find:
```tsx
            const effective = computeEffectiveUnit(material);
```
Replace with:
```tsx
            const effective = computeEffectivePrice(material, materialsById, componentsByMaterialId);
```

Find:
```tsx
            <td style={{ textAlign: 'right' }} className="text-muted">
              {selectedMaterial ? formatCurrency(computeEffectiveUnit(selectedMaterial).price) : '—'}
            </td>
            <td>
              <input className="input" style={{ minHeight: 32 }} placeholder="qty" value={qty} onChange={(e) => setQty(e.target.value)} />
            </td>
            <td className="text-muted">{selectedMaterial ? computeEffectiveUnit(selectedMaterial).unit : '—'}</td>
```
Replace with:
```tsx
            <td style={{ textAlign: 'right' }} className="text-muted">
              {selectedMaterial ? formatCurrency(computeEffectivePrice(selectedMaterial, materialsById, componentsByMaterialId).price) : '—'}
            </td>
            <td>
              <input className="input" style={{ minHeight: 32 }} placeholder="qty" value={qty} onChange={(e) => setQty(e.target.value)} />
            </td>
            <td className="text-muted">{selectedMaterial ? computeEffectivePrice(selectedMaterial, materialsById, componentsByMaterialId).unit : '—'}</td>
```

- [ ] **Step 2: `src/pages/ProductDetail.tsx` — fetch components, pass through**

Find:
```tsx
import { dataStore } from '../data';
import { computeProductCost } from '../lib/costCalc';
import type { BomLine, Material, Product } from '../lib/types';
```
Replace with:
```tsx
import { dataStore } from '../data';
import { computeProductCost } from '../lib/costCalc';
import type { BomLine, Material, MaterialComponent, Product } from '../lib/types';
```

Find:
```tsx
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [bomLines, setBomLines] = useState<BomLine[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [laborInput, setLaborInput] = useState('');
```
Replace with:
```tsx
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [bomLines, setBomLines] = useState<BomLine[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialComponents, setMaterialComponents] = useState<MaterialComponent[]>([]);
  const [laborInput, setLaborInput] = useState('');
```

Find:
```tsx
  const reload = async () => {
    const [p, lines, mats] = await Promise.all([dataStore.getProduct(id), dataStore.listBomLines(id), dataStore.listMaterials()]);
    setProduct(p);
    setBomLines(lines);
    setMaterials(mats);
    if (p) {
      setLaborInput(String(p.laborCost));
      setNameInput(p.name);
    }
  };
```
Replace with:
```tsx
  const reload = async () => {
    const [p, lines, mats, components] = await Promise.all([
      dataStore.getProduct(id),
      dataStore.listBomLines(id),
      dataStore.listMaterials(),
      dataStore.listMaterialComponents(),
    ]);
    setProduct(p);
    setBomLines(lines);
    setMaterials(mats);
    setMaterialComponents(components);
    if (p) {
      setLaborInput(String(p.laborCost));
      setNameInput(p.name);
    }
  };
```

Find:
```tsx
  const materialsById = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);
  const cost = useMemo(() => (product ? computeProductCost(product, bomLines, materialsById) : null), [product, bomLines, materialsById]);
```
Replace with:
```tsx
  const materialsById = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);
  const componentsByMaterialId = useMemo(() => {
    const map = new Map<string, MaterialComponent[]>();
    for (const c of materialComponents) {
      const list = map.get(c.materialId) ?? [];
      list.push(c);
      map.set(c.materialId, list);
    }
    return map;
  }, [materialComponents]);
  const cost = useMemo(
    () => (product ? computeProductCost(product, bomLines, materialsById, componentsByMaterialId) : null),
    [product, bomLines, materialsById, componentsByMaterialId],
  );
```

Find:
```tsx
              <BomTable
                bomLines={bomLines}
                materials={materials}
                editable={isAdmin}
```
Replace with:
```tsx
              <BomTable
                bomLines={bomLines}
                materials={materials}
                componentsByMaterialId={componentsByMaterialId}
                editable={isAdmin}
```

- [ ] **Step 3: `src/pages/ProductList.tsx` — fetch components, pass through**

Find:
```tsx
import type { BomLine, Material, Product } from '../lib/types';
```
Replace with:
```tsx
import type { BomLine, Material, MaterialComponent, Product } from '../lib/types';
```

Find:
```tsx
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [bomLinesByProduct, setBomLinesByProduct] = useState<Record<string, BomLine[]>>({});
  const [sort, setSort] = useState<SortKey>('name');
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    (async () => {
      const [productList, materialList] = await Promise.all([dataStore.listProducts(), dataStore.listMaterials()]);
      const bomEntries = await Promise.all(productList.map((p) => dataStore.listBomLines(p.id).then((lines) => [p.id, lines] as const)));
      setProducts(productList);
      setMaterials(materialList);
      setBomLinesByProduct(Object.fromEntries(bomEntries));
      setLoading(false);
    })();
  }, []);

  const materialsById = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);
```
Replace with:
```tsx
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialComponents, setMaterialComponents] = useState<MaterialComponent[]>([]);
  const [bomLinesByProduct, setBomLinesByProduct] = useState<Record<string, BomLine[]>>({});
  const [sort, setSort] = useState<SortKey>('name');
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    (async () => {
      const [productList, materialList, components] = await Promise.all([
        dataStore.listProducts(),
        dataStore.listMaterials(),
        dataStore.listMaterialComponents(),
      ]);
      const bomEntries = await Promise.all(productList.map((p) => dataStore.listBomLines(p.id).then((lines) => [p.id, lines] as const)));
      setProducts(productList);
      setMaterials(materialList);
      setMaterialComponents(components);
      setBomLinesByProduct(Object.fromEntries(bomEntries));
      setLoading(false);
    })();
  }, []);

  const materialsById = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);
  const componentsByMaterialId = useMemo(() => {
    const map = new Map<string, MaterialComponent[]>();
    for (const c of materialComponents) {
      const list = map.get(c.materialId) ?? [];
      list.push(c);
      map.set(c.materialId, list);
    }
    return map;
  }, [materialComponents]);
```

Find:
```tsx
    const withCost = filtered.map((p) => ({
      product: p,
      cost: computeProductCost(p, bomLinesByProduct[p.id] ?? [], materialsById),
    }));
    return withCost.sort((a, b) => (sort === 'cost' ? b.cost.total - a.cost.total : a.product.name.localeCompare(b.product.name)));
  }, [products, bomLinesByProduct, materialsById, sort, activeCategory]);
```
Replace with:
```tsx
    const withCost = filtered.map((p) => ({
      product: p,
      cost: computeProductCost(p, bomLinesByProduct[p.id] ?? [], materialsById, componentsByMaterialId),
    }));
    return withCost.sort((a, b) => (sort === 'cost' ? b.cost.total - a.cost.total : a.product.name.localeCompare(b.product.name)));
  }, [products, bomLinesByProduct, materialsById, componentsByMaterialId, sort, activeCategory]);
```

(Note: if Task 1 restored `products`/`catalogProducts` differently than shown due to other WIP, apply the same `componentsByMaterialId` addition to whichever variable the `rows` memo actually filters/maps over and its dependency array.)

- [ ] **Step 4: `src/pages/Dashboard.tsx` — fetch components, pass through**

Find:
```tsx
import type { BomLine, Material, Product } from '../lib/types';
```
Replace with:
```tsx
import type { BomLine, Material, MaterialComponent, Product } from '../lib/types';
```

Find:
```tsx
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [bomLinesByProduct, setBomLinesByProduct] = useState<Record<string, BomLine[]>>({});
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [trendPoints, setTrendPoints] = useState<TrendPoint[]>([]);

  useEffect(() => {
    (async () => {
      const [productList, materialList, categoryList] = await Promise.all([
        dataStore.listProducts(),
        dataStore.listMaterials(),
        dataStore.listOptions('product_categories'),
      ]);
      const bomEntries = await Promise.all(productList.map((p) => dataStore.listBomLines(p.id).then((lines) => [p.id, lines] as const)));
      setProducts(productList);
      setMaterials(materialList);
      setBomLinesByProduct(Object.fromEntries(bomEntries));
      setCategoryOptions(categoryList.map((c) => c.name));
      if (materialList.length > 0) setSelectedMaterialId(materialList[0].id);
    })();
  }, []);

  const materialsById = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);

  const rankingRows: RankingRow[] = useMemo(() => {
    return products
      .filter((p) => categoryFilter === 'all' || p.category === categoryFilter)
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        total: computeProductCost(p, bomLinesByProduct[p.id] ?? [], materialsById).total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [products, bomLinesByProduct, materialsById, categoryFilter]);
```
Replace with:
```tsx
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialComponents, setMaterialComponents] = useState<MaterialComponent[]>([]);
  const [bomLinesByProduct, setBomLinesByProduct] = useState<Record<string, BomLine[]>>({});
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [trendPoints, setTrendPoints] = useState<TrendPoint[]>([]);

  useEffect(() => {
    (async () => {
      const [productList, materialList, categoryList, components] = await Promise.all([
        dataStore.listProducts(),
        dataStore.listMaterials(),
        dataStore.listOptions('product_categories'),
        dataStore.listMaterialComponents(),
      ]);
      const bomEntries = await Promise.all(productList.map((p) => dataStore.listBomLines(p.id).then((lines) => [p.id, lines] as const)));
      setProducts(productList);
      setMaterials(materialList);
      setMaterialComponents(components);
      setBomLinesByProduct(Object.fromEntries(bomEntries));
      setCategoryOptions(categoryList.map((c) => c.name));
      if (materialList.length > 0) setSelectedMaterialId(materialList[0].id);
    })();
  }, []);

  const materialsById = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);
  const componentsByMaterialId = useMemo(() => {
    const map = new Map<string, MaterialComponent[]>();
    for (const c of materialComponents) {
      const list = map.get(c.materialId) ?? [];
      list.push(c);
      map.set(c.materialId, list);
    }
    return map;
  }, [materialComponents]);

  const rankingRows: RankingRow[] = useMemo(() => {
    return products
      .filter((p) => categoryFilter === 'all' || p.category === categoryFilter)
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        total: computeProductCost(p, bomLinesByProduct[p.id] ?? [], materialsById, componentsByMaterialId).total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [products, bomLinesByProduct, materialsById, componentsByMaterialId, categoryFilter]);
```

- [ ] **Step 5: Typecheck**

Run: `npm run build`
Expected: exit 0, no TypeScript errors.

- [ ] **Step 6: Manual browser verification**

1. On `/products/:id` for any product, add a composite material (created in Task 4) as a BOM line — confirm its price shows correctly in the line and the product total updates.
2. Edit the composite's recipe on `/materials` (add or remove a component), reload the product page, confirm the BOM line's price and the product total reflect the change (live re-pricing, no manual refresh needed anywhere else).
3. Check `/dashboard`'s cost ranking includes the product with its composite-inclusive total.
4. Check `/products` list view shows the same updated total.

- [ ] **Step 7: Commit**

```bash
git add src/components/BomTable.tsx src/pages/ProductDetail.tsx src/pages/ProductList.tsx src/pages/Dashboard.tsx
git commit -m "Price composite materials wherever a material is priced (BOM, product list, dashboard)"
```
