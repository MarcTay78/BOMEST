import { useEffect, useState, type FormEvent } from 'react';
import { useIsAdmin } from '../auth/AuthContext';
import { EditIcon, PlusIcon, TrashIcon, WarningIcon } from '../components/icons';
import { DeleteBlockedError, dataStore } from '../data';
import { formatCurrency } from '../lib/costCalc';
import type { Material, MaterialCategory } from '../lib/types';

const CATEGORY_LABEL: Record<MaterialCategory, string> = { wood: 'Wood', hardware: 'Hardware', finish: 'Finish', packaging: 'Packaging' };
const CATEGORY_TAG: Record<MaterialCategory, string> = { wood: 'tag-accent', hardware: 'tag-neutral', finish: 'tag-accent-2', packaging: 'tag-outline' };

export function Materials() {
  const isAdmin = useIsAdmin();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

  const reload = () => dataStore.listMaterials().then(setMaterials);
  useEffect(() => {
    reload();
  }, []);

  const startEdit = (m: Material) => {
    setEditingId(m.id);
    setPriceInput(String(m.currentPrice));
  };

  const commitEdit = async (id: string) => {
    const value = Number(priceInput);
    if (!Number.isNaN(value) && value >= 0) {
      await dataStore.updateMaterialPrice(id, value);
      await reload();
    }
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    setBlockedMessage(null);
    try {
      await dataStore.deleteMaterial(id);
      await reload();
    } catch (err) {
      if (err instanceof DeleteBlockedError) setBlockedMessage(`Can't delete — used in ${err.usedByCount} product(s).`);
      else setBlockedMessage(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  return (
    <div className="content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }}>
        <h1 style={{ margin: 0 }}>Materials</h1>
        {isAdmin && (
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
            Add material<PlusIcon />
          </button>
        )}
      </div>

      {adding && <AddMaterialForm onDone={async () => { setAdding(false); await reload(); }} onCancel={() => setAdding(false)} />}

      <table className="table">
        <thead>
          <tr>
            <th>Name</th><th>Category</th><th>Unit</th><th style={{ textAlign: 'right' }}>Current price</th><th>Updated</th>
            {isAdmin && <th></th>}
          </tr>
        </thead>
        <tbody>
          {materials.map((m) => (
            <tr key={m.id}>
              <td>{m.name}</td>
              <td><span className={`tag ${CATEGORY_TAG[m.category]}`}>{CATEGORY_LABEL[m.category]}</span></td>
              <td className="text-muted">{m.unit}</td>
              <td style={{ textAlign: 'right' }}>
                {editingId === m.id ? (
                  <input
                    className="input"
                    style={{ minHeight: 30, width: 100, textAlign: 'right' }}
                    autoFocus
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    onBlur={() => commitEdit(m.id)}
                    onKeyDown={(e) => e.key === 'Enter' && commitEdit(m.id)}
                  />
                ) : (
                  `${formatCurrency(m.currentPrice)} / ${m.unit}`
                )}
              </td>
              <td className="text-muted">{m.updatedAt}</td>
              {isAdmin && (
                <td style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-ghost btn-icon" aria-label="Edit" onClick={() => startEdit(m)}><EditIcon /></button>
                  <button type="button" className="btn btn-ghost btn-icon" aria-label="Delete" onClick={() => handleDelete(m.id)}><TrashIcon /></button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {blockedMessage && (
        <div className="callout" style={{ marginTop: 14 }}>
          <WarningIcon />
          {blockedMessage}
        </div>
      )}
    </div>
  );
}

function AddMaterialForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<MaterialCategory>('wood');
  const [unit, setUnit] = useState('');
  const [price, setPrice] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const currentPrice = Number(price);
    if (!name.trim() || !unit.trim() || Number.isNaN(currentPrice) || currentPrice < 0) return;
    await dataStore.createMaterial({ name: name.trim(), category, unit: unit.trim(), currentPrice });
    onDone();
  };

  return (
    <form className="card elev-sm" style={{ padding: 20, marginBottom: 18, flexDirection: 'row', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }} onSubmit={handleSubmit}>
      <div className="field"><label>Name</label><input className="input" style={{ minHeight: 32 }} value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div className="field">
        <label>Category</label>
        <select className="input" style={{ minHeight: 32 }} value={category} onChange={(e) => setCategory(e.target.value as MaterialCategory)}>
          <option value="wood">Wood</option><option value="hardware">Hardware</option><option value="finish">Finish</option><option value="packaging">Packaging</option>
        </select>
      </div>
      <div className="field"><label>Unit</label><input className="input" style={{ minHeight: 32, width: 90 }} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="m3, pcs…" required /></div>
      <div className="field"><label>Starting price</label><input className="input" style={{ minHeight: 32, width: 100 }} value={price} onChange={(e) => setPrice(e.target.value)} required /></div>
      <button type="submit" className="btn btn-primary">Add</button>
      <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
    </form>
  );
}
