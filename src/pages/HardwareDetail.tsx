import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useIsAdmin } from '../auth/AuthContext';
import { BomTable } from '../components/BomTable';
import { CostBreakdown } from '../components/CostBreakdown';
import { BackIcon, TrashIcon, WarningIcon } from '../components/icons';
import { dataStore } from '../data';
import { computeProductCost } from '../lib/costCalc';
import { HARDWARE_CATEGORY, type BomLine, type Material, type Product } from '../lib/types';

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
  const hardwareMaterials = useMemo(() => materials.filter((m) => m.category === HARDWARE_CATEGORY), [materials]);
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
              pickerMaterials={hardwareMaterials}
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
