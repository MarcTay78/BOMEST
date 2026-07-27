import { useEffect, useMemo, useState } from 'react';
import { CATEGORY_LEGEND, CostRankingChart, type RankingRow } from '../components/charts/CostRankingChart';
import { PriceTrendChart, type TrendPoint } from '../components/charts/PriceTrendChart';
import { dataStore } from '../data';
import { computeProductCost, formatCurrency } from '../lib/costCalc';
import type { BomLine, Material, Product, ProductCategory } from '../lib/types';

type CategoryFilter = 'all' | ProductCategory;

export function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [bomLinesByProduct, setBomLinesByProduct] = useState<Record<string, BomLine[]>>({});
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [trendPoints, setTrendPoints] = useState<TrendPoint[]>([]);

  useEffect(() => {
    (async () => {
      const [productList, materialList] = await Promise.all([dataStore.listProducts(), dataStore.listMaterials()]);
      const bomEntries = await Promise.all(productList.map((p) => dataStore.listBomLines(p.id).then((lines) => [p.id, lines] as const)));
      setProducts(productList);
      setMaterials(materialList);
      setBomLinesByProduct(Object.fromEntries(bomEntries));
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

  useEffect(() => {
    if (!selectedMaterialId) {
      setTrendPoints([]);
      return;
    }
    const material = materialsById.get(selectedMaterialId);
    if (!material) return;
    dataStore.getPriceHistory(selectedMaterialId).then((history) => {
      const points: TrendPoint[] = [
        ...history.map((h) => ({ label: h.changedAt, price: h.oldPrice })),
        { label: 'Now', price: material.currentPrice },
      ];
      setTrendPoints(points);
    });
  }, [selectedMaterialId, materialsById]);

  const selectedMaterial = materialsById.get(selectedMaterialId);

  return (
    <div className="content">
      <h1 style={{ margin: '0 0 20px' }}>Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 22 }}>
        <div className="card elev-sm" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title">Product cost ranking</div>
            <div className="seg">
              {(['all', 'table', 'chair'] as const).map((cat) => (
                <label key={cat} className="seg-opt">
                  <input type="radio" name="catf" checked={categoryFilter === cat} onChange={() => setCategoryFilter(cat)} />
                  {cat === 'all' ? 'All' : cat === 'table' ? 'Tables' : 'Chairs'}
                </label>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 18 }}>
            {rankingRows.length === 0 ? <p className="text-muted">No products yet.</p> : <CostRankingChart rows={rankingRows} />}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 20, fontSize: 11.5 }}>
            {CATEGORY_LEGEND.map((l) => (
              <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: l.color, display: 'inline-block' }} />{l.label}
              </span>
            ))}
          </div>
        </div>

        <div className="card elev-sm" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="card-title">Material price trend</div>
            <select className="input" style={{ minHeight: 32, width: 'auto' }} value={selectedMaterialId} onChange={(e) => setSelectedMaterialId(e.target.value)}>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <PriceTrendChart points={trendPoints} />
          {selectedMaterial && (
            <p className="note" style={{ margin: '8px 0 0' }}>
              Current price: <strong>{formatCurrency(selectedMaterial.currentPrice)}</strong> / {selectedMaterial.unit}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
