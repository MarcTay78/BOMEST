import { useEffect, useMemo, useState } from 'react';
import { buildCategoryColorMap, CostRankingChart, type RankingRow } from '../components/charts/CostRankingChart';
import { PriceTrendChart, type TrendPoint } from '../components/charts/PriceTrendChart';
import { dataStore } from '../data';
import { computeCategoryBreakdown, computeEffectivePrice, computeProductCost, formatCurrency, formatUnitPrice } from '../lib/costCalc';
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
  const [compareIds, setCompareIds] = useState<string[]>([]);

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

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const compareProducts = useMemo(() => products.filter((p) => compareIds.includes(p.id)), [products, compareIds]);

  const compareRows = useMemo(() => {
    const perProduct = compareProducts.map((p) => {
      const cost = computeProductCost(p, bomLinesByProduct[p.id] ?? [], materialsById, componentsByMaterialId);
      const breakdown = new Map(computeCategoryBreakdown(cost).map((r) => [r.key, r.value]));
      return { product: p, cost, breakdown };
    });
    const keys: string[] = [];
    const labels = new Map<string, string>();
    for (const { breakdown } of perProduct) {
      for (const key of breakdown.keys()) {
        if (!keys.includes(key)) keys.push(key);
      }
    }
    for (const key of keys) labels.set(key, key === 'labor' ? 'Overhead' : key);
    return { perProduct, keys, labels };
  }, [compareProducts, bomLinesByProduct, materialsById, componentsByMaterialId]);

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
        { label: 'Now', price: computeEffectivePrice(material, materialsById, componentsByMaterialId).price },
      ];
      setTrendPoints(points);
    });
  }, [selectedMaterialId, materialsById, componentsByMaterialId]);

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
          {selectedMaterial && (() => {
            const { price, unit } = computeEffectivePrice(selectedMaterial, materialsById, componentsByMaterialId);
            return (
              <p className="note" style={{ margin: '8px 0 0' }}>
                Current price: <strong>{formatUnitPrice(price)}</strong> / {unit}
              </p>
            );
          })()}
        </div>
      </div>

      <div className="card elev-sm" style={{ padding: 22, marginTop: 22 }}>
        <div className="card-title">Cost breakdown comparison</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {products.map((p) => (
            <button
              key={p.id}
              type="button"
              className="btn btn-ghost"
              style={compareIds.includes(p.id) ? { background: 'var(--color-accent-700)', color: 'var(--color-on-accent, #fff)' } : undefined}
              onClick={() => toggleCompare(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
        {compareRows.perProduct.length === 0 ? (
          <p className="text-muted" style={{ marginTop: 14 }}>Pick two or more products to compare.</p>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 10px' }}></th>
                  {compareRows.perProduct.map(({ product }) => (
                    <th key={product.id} style={{ textAlign: 'right', padding: '6px 10px' }}>{product.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compareRows.keys.map((key) => (
                  <tr key={key} style={{ borderBottom: '1px solid var(--color-divider)' }}>
                    <td className="text-muted" style={{ padding: '6px 10px' }}>{compareRows.labels.get(key)}</td>
                    {compareRows.perProduct.map(({ product, breakdown }) => (
                      <td key={product.id} style={{ textAlign: 'right', padding: '6px 10px' }}>{formatCurrency(breakdown.get(key) ?? 0)}</td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: '6px 10px', fontFamily: 'var(--font-heading)' }}>Grand total</td>
                  {compareRows.perProduct.map(({ product, cost }) => (
                    <td key={product.id} style={{ textAlign: 'right', padding: '6px 10px', fontFamily: 'var(--font-heading)', color: 'var(--color-accent-700)' }}>
                      {formatCurrency(cost.total)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
