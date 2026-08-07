# Sqft Costing + Material Estimate Flag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Materials priced per sqft auto-convert to a $/pc rate from a 2-dim mm Size (mirroring the existing m3 rule), and materials can be flagged "Estimate" (informational badge only, still counted in all cost totals).

**Architecture:** Pure-function extension of `src/lib/costCalc.ts` (new `parseSizeMm2` + a second branch in `computeEffectiveUnit`) for sqft. A new boolean field `isEstimate` threaded through `Material` type, both `DataStore` implementations (mock + Supabase), and the `Materials.tsx` page (badge + two checkboxes). No changes to any cost-summing logic for the estimate flag — display only.

**Tech Stack:** React 19 + TypeScript, Vitest, Supabase (Postgres) migrations.

## Global Constraints

- 1 sqft = 92903.04 mm² (spec-verbatim conversion constant).
- Size for sqft materials is 2 dimensions `WxH` in mm, same parsing tolerance as existing `parseSizeMm` (case-insensitive `x` separator, spaces tolerated, must be exactly N positive finite numbers).
- `isEstimate` defaults to `false` everywhere (existing materials, new non-composite/composite materials via duplicate).
- Estimate flag never changes any computed price or total — display/badge only.
- Follow existing test file conventions in `src/lib/costCalc.test.ts` (vitest, `describe`/`it`, `toBeCloseTo` for float comparisons).

---

### Task 1: `parseSizeMm2` + sqft branch in `computeEffectiveUnit`

**Files:**
- Modify: `src/lib/costCalc.ts`
- Test: `src/lib/costCalc.test.ts`

**Interfaces:**
- Produces: `parseSizeMm2(size: string): [number, number] | null` (exported)
- Produces: `computeEffectiveUnit` gains a second unit case (`sqft`) — same signature, same `EffectiveUnit` return shape already defined at costCalc.ts:26-31.

- [ ] **Step 1: Write failing tests for `parseSizeMm2`**

Add to `src/lib/costCalc.test.ts`, after the existing `describe('parseSizeMm', ...)` block (after line 102):

```ts
describe('parseSizeMm2', () => {
  it('parses "AxB" into 2 numbers', () => {
    expect(parseSizeMm2('1220x2440')).toEqual([1220, 2440]);
  });

  it('is case-insensitive and tolerates spaces', () => {
    expect(parseSizeMm2('1220 X 2440')).toEqual([1220, 2440]);
  });

  it('rejects anything that is not exactly 2 positive numbers', () => {
    expect(parseSizeMm2('')).toBeNull();
    expect(parseSizeMm2('1220')).toBeNull();
    expect(parseSizeMm2('1220x2440x10')).toBeNull();
    expect(parseSizeMm2('1220x0')).toBeNull();
    expect(parseSizeMm2('large')).toBeNull();
  });
});
```

Update the import line (costCalc.test.ts:2) to include `parseSizeMm2`:

```ts
import { computeCategoryBreakdown, computeEffectivePrice, computeEffectiveUnit, computeProductCost, formatCurrency, parseSizeMm, parseSizeMm2 } from './costCalc';
```

- [ ] **Step 2: Run tests, verify failure**

Run: `npm test -- costCalc`
Expected: FAIL — `parseSizeMm2 is not a function` / `is not exported`

- [ ] **Step 3: Implement `parseSizeMm2`**

In `src/lib/costCalc.ts`, immediately after `parseSizeMm` (after line 24):

```ts
/** "1220x2440" (mm) -> [1220, 2440]. Null if not exactly 2 positive numbers. */
export function parseSizeMm2(size: string): [number, number] | null {
  const parts = size.split(/x/i).map((s) => Number(s.trim()));
  if (parts.length !== 2 || parts.some((n) => !Number.isFinite(n) || n <= 0)) return null;
  return parts as [number, number];
}
```

- [ ] **Step 4: Run tests, verify `parseSizeMm2` passes**

Run: `npm test -- costCalc`
Expected: `parseSizeMm2` describe block PASS (sqft branch tests below still not written yet)

- [ ] **Step 5: Write failing tests for the sqft branch of `computeEffectiveUnit`**

Add to `src/lib/costCalc.test.ts`, inside `describe('computeEffectiveUnit', ...)`, after the existing "unit match is case-insensitive" test (after line 129, before the closing `});` of that describe block):

```ts
  it('converts a sqft-priced material with a parseable 2-dim size to a $/pc rate', () => {
    const material = { unit: 'sqft', size: '1220x2440', currentPrice: 2 };
    const effective = computeEffectiveUnit(material);
    const MM2_PER_SQFT = 92903.04;
    const expectedSqft = (1220 * 2440) / MM2_PER_SQFT;
    expect(effective.converted).toBe(true);
    expect(effective.unit).toBe('pcs');
    expect(effective.price).toBeCloseTo(expectedSqft * 2);
  });

  it('leaves a sqft material with no parseable size untouched', () => {
    const material = { unit: 'sqft', size: '', currentPrice: 2 };
    const effective = computeEffectiveUnit(material);
    expect(effective).toEqual({ price: 2, unit: 'sqft', converted: false });
  });

  it('sqft unit match is case-insensitive', () => {
    const material = { unit: 'SqFt', size: '1220x2440', currentPrice: 2 };
    expect(computeEffectiveUnit(material).converted).toBe(true);
  });

  it('a 3-dim size on a sqft material does not convert (wrong dimension count)', () => {
    const material = { unit: 'sqft', size: '24x590x915', currentPrice: 2 };
    const effective = computeEffectiveUnit(material);
    expect(effective).toEqual({ price: 2, unit: 'sqft', converted: false });
  });
```

- [ ] **Step 6: Run tests, verify failure**

Run: `npm test -- costCalc`
Expected: FAIL — sqft material price/unit not converted (falls through to raw price/unit, `converted` stays `false`)

- [ ] **Step 7: Implement the sqft branch**

In `src/lib/costCalc.ts`, replace `computeEffectiveUnit` (lines 33-41) with:

```ts
const MM2_PER_SQFT = 92903.04;

/** A material priced per m3 or sqft with a parseable Size auto-converts to a $/pc rate. */
export function computeEffectiveUnit(material: Pick<Material, 'unit' | 'size' | 'currentPrice'>): EffectiveUnit {
  const unit = material.unit.trim().toLowerCase();
  if (unit === 'm3') {
    const dims = parseSizeMm(material.size);
    if (dims) {
      const [a, b, c] = dims;
      const volumeM3 = (a * b * c) / MM3_PER_M3;
      return { price: volumeM3 * material.currentPrice, unit: 'pcs', converted: true };
    }
  }
  if (unit === 'sqft') {
    const dims = parseSizeMm2(material.size);
    if (dims) {
      const [w, h] = dims;
      const areaSqft = (w * h) / MM2_PER_SQFT;
      return { price: areaSqft * material.currentPrice, unit: 'pcs', converted: true };
    }
  }
  return { price: material.currentPrice, unit: material.unit, converted: false };
}
```

- [ ] **Step 8: Run tests, verify all pass**

Run: `npm test -- costCalc`
Expected: PASS (all `computeEffectiveUnit` and `parseSizeMm2` tests green, plus every pre-existing costCalc test still green — `computeProductCost`, `computeEffectivePrice`, etc. are unaffected since they delegate through `computeEffectiveUnit`)

- [ ] **Step 9: Commit**

```bash
git add src/lib/costCalc.ts src/lib/costCalc.test.ts
git commit -m "Add sqft-to-pcs price conversion, mirroring the existing m3 rule"
```

---

### Task 2: `Material.isEstimate` field — type + all literal call sites

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/costCalc.test.ts`
- Modify: `src/data/mockStore.ts`
- Modify: `src/data/DataStore.ts`
- Modify: `src/data/supabaseStore.ts`
- Modify: `src/pages/Materials.tsx`
- Create: `supabase/migrations/0006_material_estimate_flag.sql`

**Interfaces:**
- Consumes: nothing new from Task 1.
- Produces: `Material.isEstimate: boolean` — every later task (Task 3 UI) reads/writes this field by this exact name.

This task makes the codebase compile and all existing tests pass with the new required field threaded everywhere it's currently a TypeScript error to omit it. No new behavior yet (that's Task 3).

- [ ] **Step 1: Add the field to the type**

In `src/lib/types.ts`, in the `Material` interface (lines 7-18), add after `isComposite: boolean;`:

```ts
  isEstimate: boolean;
```

- [ ] **Step 2: Run the build to see every call site TypeScript now flags**

Run: `npm run build`
Expected: FAIL — multiple "Property 'isEstimate' is missing" errors in `src/data/mockStore.ts`, `src/lib/costCalc.test.ts`, `src/pages/Materials.tsx`

- [ ] **Step 3: Fix `costCalc.test.ts` literals**

Add `isEstimate: false` to every `Material` object literal in `src/lib/costCalc.test.ts`:
- Lines 6-9 (the `materials` array — all 4 entries)
- Line 135 (`m9` Chair Leg)
- Line 161 (`pack` composite, in the "sums quantity..." test)
- Line 174 (`pack` composite, in the "skips a component..." test)

Example for line 6:
```ts
  { id: 'm1', name: 'Oak Lumber', category: 'Wood', item: 'Lumber', type: 'S4S', size: '', unit: 'm3', currentPrice: 850, isComposite: false, isEstimate: false, updatedAt: '' },
```
(same pattern — insert `isEstimate: false,` right after `isComposite: <value>,` — for all 6 literals listed above)

- [ ] **Step 4: Fix `mockStore.ts` seed data**

In `src/data/mockStore.ts`, add `isEstimate: false` to each of the 8 seed materials (lines 14-21), same pattern — right after `isComposite: false,`. Example for line 14:

```ts
  { id: 'm1', name: 'Oak Lumber', category: 'Wood', item: 'Lumber', type: 'S4S', size: '', unit: 'm3', currentPrice: 850, isComposite: false, isEstimate: false, updatedAt: '2026-07-12' },
```

- [ ] **Step 5: Fix `Materials.tsx` `createMaterial` call sites**

`handleDuplicate` (around line 144-153) — carry over the source material's flag:

```ts
  const handleDuplicate = async (m: Material) => {
    const currentPrice = m.isComposite ? computeEffectivePrice(m, materialsById, componentsByMaterialId).price : m.currentPrice;
    const copy = await dataStore.createMaterial({
      name: `${m.name} (copy)`,
      category: m.category,
      item: m.item,
      type: m.type,
      size: m.size,
      unit: m.unit,
      currentPrice,
      isComposite: false,
      isEstimate: m.isEstimate,
    });
    await reload();
    startEdit(copy);
  };
```

`AddMaterialForm.handleSubmit` (around line 394-411) — both branches need `isEstimate`. This step only makes it compile with a hardcoded `false`; Task 3 wires up the real checkbox state:

```ts
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !unit.trim()) return;
    if (isComposite) {
      if (recipeRows.length === 0) return;
      const material = await dataStore.createMaterial({
        name: name.trim(), category, item, type, size: size.trim(), unit: unit.trim(), currentPrice: 0, isComposite: true, isEstimate: false,
      });
      for (const row of recipeRows) {
        await dataStore.addMaterialComponent(material.id, row.componentMaterialId, Number(row.quantity));
      }
    } else {
      const currentPrice = Number(price);
      if (Number.isNaN(currentPrice) || currentPrice < 0) return;
      await dataStore.createMaterial({ name: name.trim(), category, item, type, size: size.trim(), unit: unit.trim(), currentPrice, isComposite: false, isEstimate: false });
    }
    onDone();
  };
```

- [ ] **Step 6: Extend `DataStore.updateMaterial` patch type**

In `src/data/DataStore.ts` line 12, add `isEstimate` to the patchable fields:

```ts
  updateMaterial(id: string, patch: Partial<Pick<Material, 'name' | 'category' | 'item' | 'type' | 'size' | 'unit' | 'isEstimate'>>): Promise<Material>;
```

- [ ] **Step 7: Update `supabaseStore.ts` — `toMaterial`, `createMaterial`, `updateMaterial`**

In `src/data/supabaseStore.ts`:

`toMaterial` (lines 13-24) — add mapping after `isComposite: row.is_composite,`:

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
  isEstimate: row.is_estimate,
  updatedAt: row.updated_at,
});
```

`createMaterial` (lines 100-117) — add `is_estimate` to the insert:

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
        is_estimate: input.isEstimate,
      })
      .select()
      .single();
    if (error) throw error;
    return toMaterial(data);
  },
```

`updateMaterial` (lines 135-139) — patch currently passes straight through, which breaks for `isEstimate` (camelCase) against the `is_estimate` (snake_case) column. Replace with explicit mapping, same pattern as `updateProduct` (lines 220-228):

```ts
  async updateMaterial(id, patch) {
    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.category !== undefined) dbPatch.category = patch.category;
    if (patch.item !== undefined) dbPatch.item = patch.item;
    if (patch.type !== undefined) dbPatch.type = patch.type;
    if (patch.size !== undefined) dbPatch.size = patch.size;
    if (patch.unit !== undefined) dbPatch.unit = patch.unit;
    if (patch.isEstimate !== undefined) dbPatch.is_estimate = patch.isEstimate;
    const { data, error } = await requireClient().from('materials').update(dbPatch).eq('id', id).select().single();
    if (error) throw error;
    return toMaterial(data);
  },
```

- [ ] **Step 8: Add the migration**

Create `supabase/migrations/0006_material_estimate_flag.sql`:

```sql
-- Materials can be flagged as "estimate only" (e.g. carton box) — display
-- badge only, the price still counts toward every cost total as normal.
-- See docs/superpowers/specs/2026-08-08-sqft-estimate-flag-design.md.

alter table materials add column is_estimate boolean not null default false;
```

- [ ] **Step 9: Run the build again, verify it's clean**

Run: `npm run build`
Expected: PASS — no TypeScript errors

- [ ] **Step 10: Run the full test suite**

Run: `npm test`
Expected: PASS — all existing tests green (mockStore/supabaseStore have no unit tests, so this mainly re-confirms costCalc.test.ts)

- [ ] **Step 11: Commit**

```bash
git add src/lib/types.ts src/lib/costCalc.test.ts src/data/mockStore.ts src/data/DataStore.ts src/data/supabaseStore.ts src/pages/Materials.tsx supabase/migrations/0006_material_estimate_flag.sql
git commit -m "Add Material.isEstimate field across types, both data stores, and migration"
```

---

### Task 3: Estimate flag UI in `Materials.tsx`

**Files:**
- Modify: `src/pages/Materials.tsx`

**Interfaces:**
- Consumes: `Material.isEstimate` (Task 2), `DataStore.updateMaterial` patch now accepts `isEstimate` (Task 2).
- Produces: nothing consumed by other tasks — this is the final task.

No new unit tests here (this is UI wiring in a component with no existing test file — consistent with the rest of `Materials.tsx`, which has no `.test.tsx` today). Verified manually via dev server per step 6.

- [ ] **Step 1: Add "Estimate" tag next to the material name in the table row**

In `src/pages/Materials.tsx`, the read-only row rendering (around line 231-234):

```tsx
                      <td>
                        {m.name}
                        {m.isComposite && <span className="tag tag-accent" style={{ marginLeft: 6 }}>Composite</span>}
                        {m.isEstimate && <span className="tag tag-neutral" style={{ marginLeft: 6 }}>Estimate</span>}
                      </td>
```

- [ ] **Step 2: Add the checkbox to `Draft` and the inline edit row**

`Draft` interface (lines 9-17) gains `isEstimate: boolean`:

```ts
interface Draft {
  name: string;
  category: string;
  item: string;
  type: string;
  size: string;
  unit: string;
  price: string;
  isEstimate: boolean;
}
```

`draftFrom` (lines 19-27):

```ts
const draftFrom = (m: Material): Draft => ({
  name: m.name,
  category: m.category,
  item: m.item,
  type: m.type,
  size: m.size,
  unit: m.unit,
  price: String(m.currentPrice),
  isEstimate: m.isEstimate,
});
```

`commitEdit` (lines 96-114) — pass it through to `updateMaterial`:

```ts
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
      isEstimate: draft.isEstimate,
    });
    setDraft(null);
    await reload();
  };
```

Editable row's Unit cell (line 211) — fold the checkbox into the same cell, stacked below the unit input (no new `<td>`, so the column count/header stays untouched):

```tsx
                      <td>
                        <input className="input" style={{ minHeight: 30, width: 70 }} value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} />
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, marginTop: 4, whiteSpace: 'nowrap' }}>
                          <input type="checkbox" checked={draft.isEstimate} onChange={(e) => setDraft({ ...draft, isEstimate: e.target.checked })} />
                          Estimate
                        </label>
                      </td>
```

- [ ] **Step 3: Add the checkbox to `AddMaterialForm`**

In `AddMaterialForm` (starts line 366), add state after `isComposite` (line 374):

```ts
  const [isEstimate, setIsEstimate] = useState(false);
```

Wire it into both `createMaterial` calls in `handleSubmit` (replacing the hardcoded `isEstimate: false` from Task 2 step 5):

```ts
      const material = await dataStore.createMaterial({
        name: name.trim(), category, item, type, size: size.trim(), unit: unit.trim(), currentPrice: 0, isComposite: true, isEstimate,
      });
```

```ts
      await dataStore.createMaterial({ name: name.trim(), category, item, type, size: size.trim(), unit: unit.trim(), currentPrice, isComposite: false, isEstimate });
```

Add the checkbox to the form JSX, right after the existing Composite checkbox (after line 433's closing `</label>`):

```tsx
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <input type="checkbox" checked={isComposite} onChange={(e) => setIsComposite(e.target.checked)} />
        Composite
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <input type="checkbox" checked={isEstimate} onChange={(e) => setIsEstimate(e.target.checked)} />
        Estimate only (no real cost tracking)
      </label>
```

- [ ] **Step 4: Run the build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Manual verification in the dev server**

Run: `npm run dev`, open the Materials page:
1. Add a new non-composite material, check "Estimate only", submit — confirm the "Estimate" tag appears next to its name in the table.
2. Edit that material inline — confirm the checkbox shows checked, uncheck it, Save — confirm the tag disappears.
3. Add a material with unit `sqft` and size `1220x2440` and price `2` — the Materials page shows the raw `$2.00 / sqft` (it always displays a non-composite material's raw price/unit, same as an m3 material). The $/pc conversion applies where `computeEffectivePrice`/`computeEffectiveUnit` is actually called: add this material to a product's BOM or a composite's recipe and confirm the line cost uses `$64.08` (the converted $/pc rate), not `$2 * quantity`.
4. Duplicate an existing Estimate-flagged material — confirm the copy also shows the "Estimate" tag.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Materials.tsx
git commit -m "Add estimate-flag checkbox and badge to Materials page"
```
