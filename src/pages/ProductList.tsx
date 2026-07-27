import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useIsAdmin } from '../auth/AuthContext';
import { PlusIcon } from '../components/icons';
import { dataStore } from '../data';
import { computeProductCost, formatCurrency } from '../lib/costCalc';
import type { BomLine, Material, Product } from '../lib/types';

type SortKey = 'cost' | 'name';

export function ProductList() {
  const isAdmin = useIsAdmin();
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [bomLinesByProduct, setBomLinesByProduct] = useState<Record<string, BomLine[]>>({});
  const [sort, setSort] = useState<SortKey>('cost');
  const [loading, setLoading] = useState(true);

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

  const rows = useMemo(() => {
    const withCost = products.map((p) => ({
      product: p,
      cost: computeProductCost(p, bomLinesByProduct[p.id] ?? [], materialsById),
    }));
    return withCost.sort((a, b) => (sort === 'cost' ? b.cost.total - a.cost.total : a.product.name.localeCompare(b.product.name)));
  }, [products, bomLinesByProduct, materialsById, sort]);

  if (loading) return null;

  return (
    <div className="content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22 }}>
        <div>
          <h1 style={{ marginBottom: 2 }}>Products</h1>
          <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>{products.length} in the catalog · cost calculated live</p>
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
            <Link to="/products/new" className="btn btn-primary">
              Add product<PlusIcon />
            </Link>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted">No products yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
          {rows.map(({ product, cost }) => (
            <Link key={product.id} to={`/products/${product.id}`} className="card elev-sm" style={{ padding: 0, overflow: 'hidden', textDecoration: 'none', color: 'inherit', opacity: product.obsolete ? 0.6 : 1 }}>
              <div className="photo-slot" style={{ height: 150, borderRadius: 0 }}>
                {product.photoUrl ? <img src={product.photoUrl} alt={product.name} /> : <span>Drop product photo</span>}
              </div>
              <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className={`tag ${product.category === 'table' ? 'tag-accent' : 'tag-accent-2'}`} style={{ width: 'fit-content' }}>
                    {product.category === 'table' ? 'Table' : 'Chair'}
                  </span>
                  {product.obsolete && <span className="tag tag-outline">Obsolete</span>}
                </div>
                <div className="card-title">{product.name}</div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, color: 'var(--color-accent-700)' }}>{formatCurrency(cost.total)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
