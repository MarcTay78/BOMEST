import { useEffect, useMemo, useState } from 'react';
import { buildCategoryColorMap, CostRankingChart, type RankingRow } from '../components/charts/CostRankingChart';
import { PriceTrendChart, type TrendPoint } from '../components/charts/PriceTrendChart';
import { dataStore } from '../data';
import { computeProductCost, formatCurrency } from '../lib/costCalc';
import type { BomLine, Material, MaterialComponent, Product } from '../lib/types';

export function Dashboard() {
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

  const legend = useMemo(() => {
    const colorMap = buildCategoryColorMap(rankingRows.map((r) => r.category));
    return Object.entries(colorMap);
  }, [rankingRows]);

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
            <select className="input" style={{ minHeight: 32, width: 'auto' }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All categories</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div style={{ marginTop: 18 }}>
            {rankingRows.length === 0 ? <p className="text-muted">No products yet.</p> : <CostRankingChart rows={rankingRows} />}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 20, fontSize: 11.5 }}>
            {legend.map(([label, color]) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: color, display: 'inline-block' }} />{label}
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
