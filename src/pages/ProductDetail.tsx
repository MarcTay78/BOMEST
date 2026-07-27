import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useIsAdmin } from '../auth/AuthContext';
import { BomTable } from '../components/BomTable';
import { CostBreakdown } from '../components/CostBreakdown';
import { BackIcon, WarningIcon } from '../components/icons';
import { PhotoUpload } from '../components/PhotoUpload';
import { dataStore } from '../data';
import { computeProductCost } from '../lib/costCalc';
import type { BomLine, Material, Product } from '../lib/types';

export function ProductDetail() {
  const { id = '' } = useParams();
  const isAdmin = useIsAdmin();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [bomLines, setBomLines] = useState<BomLine[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [laborInput, setLaborInput] = useState('');

  const reload = async () => {
    const [p, lines, mats] = await Promise.all([dataStore.getProduct(id), dataStore.listBomLines(id), dataStore.listMaterials()]);
    setProduct(p);
    setBomLines(lines);
    setMaterials(mats);
    if (p) setLaborInput(String(p.laborCost));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const materialsById = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);
  const cost = useMemo(() => (product ? computeProductCost(product, bomLines, materialsById) : null), [product, bomLines, materialsById]);

  if (product === undefined) return null;
  if (product === null) return <Navigate to="/products" replace />;

  const commitLabor = async () => {
    const value = Number(laborInput);
    if (Number.isNaN(value) || value < 0 || value === product.laborCost) return;
    await dataStore.updateProductLabor(product.id, value);
    reload();
  };

  return (
    <div className="content">
      <Link to="/products" style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16, textDecoration: 'none' }}>
        <BackIcon />All products
      </Link>
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PhotoUpload
            photoUrl={product.photoUrl}
            editable={isAdmin}
            onUpload={async (file) => {
              await dataStore.uploadPhoto(product.id, file);
              reload();
            }}
          />
          <div style={{ marginTop: 10 }}>
            <span className="tag tag-accent">{product.category === 'table' ? 'Table' : 'Chair'}</span>
          </div>
          <h2 style={{ margin: '4px 0 0' }}>{product.name}</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <h4 style={{ marginBottom: 10 }}>Bill of materials</h4>
            {bomLines.length === 0 && (
              <div className="callout" style={{ marginBottom: 12 }}>
                <WarningIcon />
                No materials added yet — total reflects labor only.
              </div>
            )}
            <BomTable
              bomLines={bomLines}
              materials={materials}
              editable={isAdmin}
              onAdd={async (materialId, quantity) => {
                await dataStore.addBomLine(product.id, materialId, quantity);
                reload();
              }}
              onRemove={async (lineId) => {
                await dataStore.removeBomLine(lineId);
                reload();
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
            <div className="field" style={{ maxWidth: 220 }}>
              <label htmlFor="labor">Labor cost</label>
              {isAdmin ? (
                <input id="labor" className="input" value={laborInput} onChange={(e) => setLaborInput(e.target.value)} onBlur={commitLabor} />
              ) : (
                <div style={{ padding: '8px 14px', fontSize: 14 }}>${product.laborCost.toFixed(2)}</div>
              )}
            </div>
            {cost && <CostBreakdown cost={cost} />}
          </div>
        </div>
      </div>
    </div>
  );
}
