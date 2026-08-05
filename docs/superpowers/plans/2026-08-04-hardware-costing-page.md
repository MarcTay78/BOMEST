# Hardware Sub-Material Costing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated `/hardware` page where the user types free-form sub-material names (BoxSeat, RTA, Side Rail, HangerBolt…) and builds each one's cost from picked materials, exactly like the existing Product BOM editor — but excluded from the main Products catalog.

**Architecture:** Hardware sub-items are `Product` rows with `category: 'Hardware'`. No schema change, no new DataStore methods — `computeProductCost`, `BomTable`, `CostBreakdown`, and the existing `dataStore` product/BOM methods (Supabase-backed) are reused as-is. Two new pages (`HardwareList`, `HardwareDetail`) mirror `ProductList`/`ProductDetail` but stripped of photo/obsolete/overhead-cost fields. `ProductList` is changed to filter Hardware-category products out.

**Tech Stack:** React 19 + TypeScript, react-router-dom v7, Vite, Supabase JS client. No component test framework in this repo (only `src/lib/costCalc.test.ts` exists, for pure logic) — verification for these tasks is `npm run build` (typecheck) plus manual browser check via the dev server.

## Global Constraints

- Reuse `Product`/`BomLine` types and existing `dataStore` methods — do not add new DataStore methods or Supabase tables/columns.
- `HARDWARE_CATEGORY = 'Hardware'` is the single string constant both pages and the exclusion filter must import — never hardcode the literal `'Hardware'` elsewhere.
- Match existing code style: inline `style={{...}}` objects, existing CSS classes (`content`, `card`, `elev-sm`, `field`, `input`, `btn btn-primary`, `btn btn-secondary`, `btn btn-ghost btn-icon`, `table`, `text-muted`, `callout`), no new CSS files.
- Admin-only mutation controls gated behind `useIsAdmin()`, matching `ProductDetail.tsx`/`ProductList.tsx` conventions.

---

### Task 1: Hardware constant, list page, detail page, routing, nav

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/pages/HardwareList.tsx`
- Create: `src/pages/HardwareDetail.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/AppNav.tsx`

**Interfaces:**
- Consumes: `dataStore` from `src/data` (`listProducts`, `listMaterials`, `listBomLines`, `createProduct`, `getProduct`, `updateProduct`, `addBomLine`, `updateBomLineRemarks`, `removeBomLine`, `deleteProduct` — all already defined in `src/data/DataStore.ts`), `computeProductCost`/`formatCurrency` from `src/lib/costCalc.ts`, `<BomTable>` from `src/components/BomTable.tsx`, `<CostBreakdown>` from `src/components/CostBreakdown.tsx`, `useIsAdmin` from `src/auth/AuthContext`, icons (`PlusIcon`, `BackIcon`, `TrashIcon`, `WarningIcon`) from `src/components/icons`.
- Produces: `HARDWARE_CATEGORY` exported const (string `'Hardware'`) from `src/lib/types.ts` — consumed by Task 2. Routes `/hardware` and `/hardware/:id`.

- [ ] **Step 1: Add the `HARDWARE_CATEGORY` constant**

In `src/lib/types.ts`, after the `ProductCategory` type declaration (currently line 5), add:

```ts
export const HARDWARE_CATEGORY = 'Hardware';
```

- [ ] **Step 2: Create `src/pages/HardwareList.tsx`**

```tsx
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useIsAdmin } from '../auth/AuthContext';
import { PlusIcon } from '../components/icons';
import { dataStore } from '../data';
import { computeProductCost, formatCurrency } from '../lib/costCalc';
import { HARDWARE_CATEGORY, type BomLine, type Material, type Product } from '../lib/types';

type SortKey = 'cost' | 'name';

export function HardwareList() {
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [bomLinesByProduct, setBomLinesByProduct] = useState<Record<string, BomLine[]>>({});
  const [sort, setSort] = useState<SortKey>('name');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const reload = async () => {
    const [productList, materialList] = await Promise.all([dataStore.listProducts(), dataStore.listMaterials()]);
    const hardware = productList.filter((p) => p.category === HARDWARE_CATEGORY);
    const bomEntries = await Promise.all(
      hardware.map((p) => dataStore.listBomLines(p.id).then((lines) => [p.id, lines] as const)),
    );
    setProducts(hardware);
    setMaterials(materialList);
    setBomLinesByProduct(Object.fromEntries(bomEntries));
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  const materialsById = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);

  const rows = useMemo(() => {
    const withCost = products.map((p) => ({
      product: p,
      cost: computeProductCost(p, bomLinesByProduct[p.id] ?? [], materialsById),
    }));
    return withCost.sort((a, b) => (sort === 'cost' ? b.cost.total - a.cost.total : a.product.name.localeCompare(b.product.name)));
  }, [products, bomLinesByProduct, materialsById, sort]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setCreating(true);
    const product = await dataStore.createProduct({ name: trimmed, category: HARDWARE_CATEGORY });
    navigate(`/hardware/${product.id}`);
  };

  if (loading) return null;

  return (
    <div className="content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22 }}>
        <div>
          <h1 style={{ marginBottom: 2 }}>Hardware</h1>
          <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>{products.length} sub-materials · cost calculated live</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="seg">
            <label className="seg-opt">
              <input type="radio" name="sort" checked={sort === 'cost'} onChange={() => setSort('cost')} />Cost ↓
            </label>
            <label className="seg-opt">
              <input type="radio" name="sort" checked={sort === 'name'} onChange={() => setSort('name')} />Name
            </label>
          </div>
          {isAdmin && (
            <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
              Add hardware<PlusIcon />
            </button>
          )}
        </div>
      </div>

      {adding && (
        <form
          className="card elev-sm"
          style={{ padding: 20, marginBottom: 18, flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}
          onSubmit={handleCreate}
        >
          <div className="field">
            <label htmlFor="hw-name">Name</label>
            <input
              id="hw-name"
              className="input"
              style={{ minHeight: 32 }}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="BoxSeat, RTA, Side Rail…"
              autoFocus
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Creating…' : 'Create'}</button>
          <button type="button" className="btn btn-secondary" onClick={() => { setAdding(false); setNewName(''); }}>Cancel</button>
        </form>
      )}

      {rows.length === 0 ? (
        <p className="text-muted">No hardware sub-materials yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th style={{ textAlign: 'right' }}>Cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ product, cost }) => (
              <tr key={product.id}>
                <td><Link to={`/hardware/${product.id}`}>{product.name}</Link></td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(cost.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `src/pages/HardwareDetail.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useIsAdmin } from '../auth/AuthContext';
import { BomTable } from '../components/BomTable';
import { CostBreakdown } from '../components/CostBreakdown';
import { BackIcon, TrashIcon, WarningIcon } from '../components/icons';
import { dataStore } from '../data';
import { computeProductCost } from '../lib/costCalc';
import type { BomLine, Material, Product } from '../lib/types';

export function HardwareDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [bomLines, setBomLines] = useState<BomLine[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [nameInput, setNameInput] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const runMutation = async (fn: () => Promise<void>) => {
    setMutationError(null);
    try {
      await fn();
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Something went wrong.';
      setMutationError(message);
    }
  };

  const reload = async () => {
    const [p, lines, mats] = await Promise.all([dataStore.getProduct(id), dataStore.listBomLines(id), dataStore.listMaterials()]);
    setProduct(p);
    setBomLines(lines);
    setMaterials(mats);
    if (p) setNameInput(p.name);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const materialsById = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);
  const cost = useMemo(() => (product ? computeProductCost(product, bomLines, materialsById) : null), [product, bomLines, materialsById]);

  if (product === undefined) return null;
  if (product === null) return <Navigate to="/hardware" replace />;

  const commitName = () =>
    runMutation(async () => {
      setEditingName(false);
      const trimmed = nameInput.trim();
      if (!trimmed || trimmed === product.name) {
        setNameInput(product.name);
        return;
      }
      await dataStore.updateProduct(product.id, { name: trimmed });
      reload();
    });

  const handleDelete = () =>
    runMutation(async () => {
      if (!window.confirm(`Delete "${product.name}"? This removes its BOM lines too and can't be undone.`)) return;
      await dataStore.deleteProduct(product.id);
      navigate('/hardware');
    });

  return (
    <div className="content">
      <Link to="/hardware" style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16, textDecoration: 'none' }}>
        <BackIcon />All hardware
      </Link>
      {mutationError && (
        <div className="callout" style={{ marginBottom: 16 }}>
          <WarningIcon />
          {mutationError}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        {isAdmin && editingName ? (
          <input
            className="input"
            style={{ fontFamily: 'var(--font-heading)', fontSize: 20, maxWidth: 320 }}
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => e.key === 'Enter' && commitName()}
          />
        ) : (
          <h2
            style={{ margin: 0, cursor: isAdmin ? 'pointer' : 'default' }}
            onClick={() => isAdmin && setEditingName(true)}
            title={isAdmin ? 'Click to rename' : undefined}
          >
            {product.name}
          </h2>
        )}
        {isAdmin && (
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Delete hardware" onClick={handleDelete}>
            <TrashIcon />
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <h4 style={{ marginBottom: 10 }}>Bill of materials</h4>
          {bomLines.length === 0 && (
            <div className="callout" style={{ marginBottom: 12 }}>
              <WarningIcon />
              No materials added yet — total is $0.
            </div>
          )}
          <div style={{ overflowX: 'auto' }}>
            <BomTable
              bomLines={bomLines}
              materials={materials}
              editable={isAdmin}
              onAdd={(materialId, quantity, remarks) =>
                runMutation(async () => {
                  await dataStore.addBomLine(product.id, materialId, quantity, remarks);
                  reload();
                })
              }
              onRemove={(lineId) =>
                runMutation(async () => {
                  await dataStore.removeBomLine(lineId);
                  reload();
                })
              }
              onUpdateRemarks={(lineId, remarks) =>
                runMutation(async () => {
                  await dataStore.updateBomLineRemarks(lineId, remarks);
                  reload();
                })
              }
            />
          </div>
        </div>
        {cost && <div style={{ maxWidth: 320 }}><CostBreakdown cost={cost} /></div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire up routes in `src/App.tsx`**

Add imports (alongside the existing page imports, keeping alphabetical order):

```ts
import { HardwareDetail } from './pages/HardwareDetail';
import { HardwareList } from './pages/HardwareList';
```

Add routes inside `<Routes>` in `AppShell`, after the `/products/:id` route:

```tsx
<Route path="/hardware" element={<HardwareList />} />
<Route path="/hardware/:id" element={<HardwareDetail />} />
```

- [ ] **Step 5: Add nav link in `src/components/AppNav.tsx`**

Add after the `Products` `NavLink` (line 11):

```tsx
<NavLink to="/hardware">Hardware</NavLink>
```

- [ ] **Step 6: Typecheck**

Run: `npm run build`
Expected: exits 0, no TypeScript errors.

- [ ] **Step 7: Manual browser verification**

Start the dev server and in the browser:
1. Navigate to `/hardware` — page loads, shows "No hardware sub-materials yet."
2. Click "Add hardware", type `BoxSeat`, submit — redirected to `/hardware/<id>`, title shows "BoxSeat".
3. Use the BOM table to add a material line with a quantity — line appears, cost breakdown total updates.
4. Click the name, rename to `BoxSeat v2`, blur — name updates, persists on reload.
5. Go back to `/hardware` — `BoxSeat v2` listed with correct cost.
6. Reload the page (or a fresh tab) — data still present (confirms Supabase persistence, not local-only state).
7. Delete the item — confirms, removes it, redirects to `/hardware`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/types.ts src/pages/HardwareList.tsx src/pages/HardwareDetail.tsx src/App.tsx src/components/AppNav.tsx
git commit -m "Add Hardware sub-material costing page"
```

---

### Task 2: Exclude Hardware-category products from the Products page

**Files:**
- Modify: `src/pages/ProductList.tsx`

**Interfaces:**
- Consumes: `HARDWARE_CATEGORY` from `src/lib/types.ts` (produced in Task 1).
- Produces: nothing consumed by later tasks — this is the final task.

- [ ] **Step 1: Filter Hardware out of the Products catalog**

In `src/pages/ProductList.tsx`, add the import (alongside the existing `type` import on line 7):

```ts
import { HARDWARE_CATEGORY, type BomLine, type Material, type Product } from '../lib/types';
```

Replace the `categories` memo (lines 33–36):

```tsx
  const catalogProducts = useMemo(() => products.filter((p) => p.category !== HARDWARE_CATEGORY), [products]);

  const categories = useMemo(
    () => Array.from(new Set(catalogProducts.map((p) => p.category).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [catalogProducts],
  );
```

Replace the `rows` memo (lines 38–45) to source from `catalogProducts` instead of `products`:

```tsx
  const rows = useMemo(() => {
    const filtered = activeCategory === 'All' ? catalogProducts : catalogProducts.filter((p) => p.category === activeCategory);
    const withCost = filtered.map((p) => ({
      product: p,
      cost: computeProductCost(p, bomLinesByProduct[p.id] ?? [], materialsById),
    }));
    return withCost.sort((a, b) => (sort === 'cost' ? b.cost.total - a.cost.total : a.product.name.localeCompare(b.product.name)));
  }, [catalogProducts, bomLinesByProduct, materialsById, sort, activeCategory]);
```

Update the subtitle count on line 54 to use the filtered count:

```tsx
          <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>{catalogProducts.length} in the catalog · cost calculated live</p>
```

- [ ] **Step 2: Typecheck**

Run: `npm run build`
Expected: exits 0, no TypeScript errors.

- [ ] **Step 3: Manual browser verification**

1. Navigate to `/products` — the `BoxSeat v2` (or whatever Hardware item still exists from Task 1's manual test, recreate one if it was deleted) does **not** appear, and "Hardware" is not among the category tabs.
2. Confirm existing non-Hardware products still display normally with correct costs.
3. Navigate to `/hardware` — the item still appears there.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ProductList.tsx
git commit -m "Exclude Hardware category from Products catalog"
```
