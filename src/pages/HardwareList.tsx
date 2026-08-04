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
