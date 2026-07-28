import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useIsAdmin } from '../auth/AuthContext';
import { BomTable } from '../components/BomTable';
import { CostBreakdown } from '../components/CostBreakdown';
import { BackIcon, TrashIcon, WarningIcon } from '../components/icons';
import { OptionSelect } from '../components/OptionSelect';
import { PhotoUpload } from '../components/PhotoUpload';
import { dataStore } from '../data';
import { computeProductCost } from '../lib/costCalc';
import type { BomLine, Material, Product } from '../lib/types';

export function ProductDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [bomLines, setBomLines] = useState<BomLine[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [laborInput, setLaborInput] = useState('');
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
    if (p) {
      setLaborInput(String(p.laborCost));
      setNameInput(p.name);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const materialsById = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);
  const cost = useMemo(() => (product ? computeProductCost(product, bomLines, materialsById) : null), [product, bomLines, materialsById]);

  if (product === undefined) return null;
  if (product === null) return <Navigate to="/products" replace />;

  const commitLabor = () =>
    runMutation(async () => {
      const value = Number(laborInput);
      if (Number.isNaN(value) || value < 0 || value === product.laborCost) return;
      await dataStore.updateProductLabor(product.id, value);
      reload();
    });

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

  const toggleObsolete = () =>
    runMutation(async () => {
      await dataStore.updateProduct(product.id, { obsolete: !product.obsolete });
      reload();
    });

  const changeCategory = (category: string) =>
    runMutation(async () => {
      await dataStore.updateProduct(product.id, { category });
      reload();
    });

  const handleDelete = () =>
    runMutation(async () => {
      if (!window.confirm(`Delete "${product.name}"? This removes its BOM lines too and can't be undone.`)) return;
      await dataStore.deleteProduct(product.id);
      navigate('/products');
    });

  return (
    <div className="content">
      <Link to="/products" style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16, textDecoration: 'none' }}>
        <BackIcon />All products
      </Link>
      {mutationError && (
        <div className="callout" style={{ marginBottom: 16 }}>
          <WarningIcon />
          {mutationError}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PhotoUpload
            photoUrl={product.photoUrl}
            editable={isAdmin}
            onUpload={(file) =>
              runMutation(async () => {
                await dataStore.uploadPhoto(product.id, file);
                reload();
              })
            }
          />
          <div style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
            {isAdmin ? (
              <OptionSelect kind="product_categories" value={product.category} onChange={changeCategory} style={{ minHeight: 30, width: 'auto' }} />
            ) : (
              product.category && <span className="tag tag-accent">{product.category}</span>
            )}
            {product.obsolete && <span className="tag tag-outline">Obsolete</span>}
          </div>
          {isAdmin && editingName ? (
            <input
              className="input"
              style={{ fontFamily: 'var(--font-heading)', fontSize: 20, marginTop: 4 }}
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => e.key === 'Enter' && commitName()}
            />
          ) : (
            <h2
              style={{ margin: '4px 0 0', cursor: isAdmin ? 'pointer' : 'default' }}
              onClick={() => isAdmin && setEditingName(true)}
              title={isAdmin ? 'Click to rename' : undefined}
            >
              {product.name}
            </h2>
          )}
          {isAdmin && (
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button type="button" className="btn btn-secondary" onClick={toggleObsolete}>
                {product.obsolete ? 'Restore' : 'Mark obsolete'}
              </button>
              <button type="button" className="btn btn-ghost btn-icon" aria-label="Delete product" onClick={handleDelete}>
                <TrashIcon />
              </button>
            </div>
          )}
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
            <div style={{ overflowX: 'auto' }}>
              <BomTable
                bomLines={bomLines}
                materials={materials}
                editable={isAdmin}
                onAdd={(materialId, quantity) =>
                  runMutation(async () => {
                    await dataStore.addBomLine(product.id, materialId, quantity);
                    reload();
                  })
                }
                onRemove={(lineId) =>
                  runMutation(async () => {
                    await dataStore.removeBomLine(lineId);
                    reload();
                  })
                }
              />
            </div>
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
