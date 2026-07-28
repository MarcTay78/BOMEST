import { useEffect, useState, type FormEvent } from 'react';
import { useIsAdmin } from '../auth/AuthContext';
import { EditIcon, PlusIcon, TrashIcon, WarningIcon } from '../components/icons';
import { OptionSelect } from '../components/OptionSelect';
import { DeleteBlockedError, dataStore } from '../data';
import { formatCurrency } from '../lib/costCalc';
import type { Material } from '../lib/types';

interface Draft {
  name: string;
  category: string;
  item: string;
  type: string;
  size: string;
  unit: string;
  price: string;
}

const draftFrom = (m: Material): Draft => ({
  name: m.name,
  category: m.category,
  item: m.item,
  type: m.type,
  size: m.size,
  unit: m.unit,
  price: String(m.currentPrice),
});

export function Materials() {
  const isAdmin = useIsAdmin();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [adding, setAdding] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

  const reload = () => dataStore.listMaterials().then(setMaterials);
  useEffect(() => {
    reload();
  }, []);

  const startEdit = (m: Material) => {
    setEditingId(m.id);
    setDraft(draftFrom(m));
  };

  const commitEdit = async (m: Material) => {
    setEditingId(null);
    if (!draft) return;
    const price = Number(draft.price);
    if (Number.isNaN(price) || price < 0) return;
    if (price !== m.currentPrice) await dataStore.updateMaterialPrice(m.id, price);
    await dataStore.updateMaterial(m.id, {
      name: draft.name.trim() || m.name,
      category: draft.category,
      item: draft.item,
      type: draft.type,
      size: draft.size,
      unit: draft.unit,
    });
    setDraft(null);
    await reload();
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

      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th><th>Category</th><th>Items</th><th>Type</th><th>Size</th><th>Unit</th>
              <th style={{ textAlign: 'right' }}>Current price</th><th>Updated</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {materials.map((m) => {
              const editing = editingId === m.id && draft;
              return (
                <tr key={m.id}>
                  {editing ? (
                    <>
                      <td><input className="input" style={{ minHeight: 30, width: 140 }} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></td>
                      <td><OptionSelect kind="material_categories" value={draft.category} onChange={(v) => setDraft({ ...draft, category: v })} style={{ minHeight: 30 }} /></td>
                      <td><OptionSelect kind="material_items" value={draft.item} onChange={(v) => setDraft({ ...draft, item: v })} style={{ minHeight: 30 }} /></td>
                      <td><OptionSelect kind="material_types" value={draft.type} onChange={(v) => setDraft({ ...draft, type: v })} style={{ minHeight: 30 }} /></td>
                      <td><input className="input" style={{ minHeight: 30, width: 100 }} value={draft.size} onChange={(e) => setDraft({ ...draft, size: e.target.value })} /></td>
                      <td><input className="input" style={{ minHeight: 30, width: 70 }} value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} /></td>
                      <td style={{ textAlign: 'right' }}>
                        <input
                          className="input"
                          style={{ minHeight: 30, width: 90, textAlign: 'right' }}
                          value={draft.price}
                          onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                        />
                      </td>
                      <td className="text-muted">{m.updatedAt}</td>
                      <td style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => commitEdit(m)}>Save</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{m.name}</td>
                      <td>{m.category ? <span className="tag tag-neutral">{m.category}</span> : <span className="text-muted">—</span>}</td>
                      <td className="text-muted">{m.item || '—'}</td>
                      <td className="text-muted">{m.type || '—'}</td>
                      <td className="text-muted">{m.size || '—'}</td>
                      <td className="text-muted">{m.unit}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(m.currentPrice)} / {m.unit}</td>
                      <td className="text-muted">{m.updatedAt}</td>
                      {isAdmin && (
                        <td style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button type="button" className="btn btn-ghost btn-icon" aria-label="Edit" onClick={() => startEdit(m)}><EditIcon /></button>
                          <button type="button" className="btn btn-ghost btn-icon" aria-label="Delete" onClick={() => handleDelete(m.id)}><TrashIcon /></button>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
  const [category, setCategory] = useState('');
  const [item, setItem] = useState('');
  const [type, setType] = useState('');
  const [size, setSize] = useState('');
  const [unit, setUnit] = useState('');
  const [price, setPrice] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const currentPrice = Number(price);
    if (!name.trim() || !unit.trim() || Number.isNaN(currentPrice) || currentPrice < 0) return;
    await dataStore.createMaterial({ name: name.trim(), category, item, type, size: size.trim(), unit: unit.trim(), currentPrice });
    onDone();
  };

  return (
    <form className="card elev-sm" style={{ padding: 20, marginBottom: 18, flexDirection: 'row', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }} onSubmit={handleSubmit}>
      <div className="field"><label>Name</label><input className="input" style={{ minHeight: 32 }} value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div className="field">
        <label>Category</label>
        <OptionSelect kind="material_categories" value={category} onChange={setCategory} style={{ minHeight: 32 }} />
      </div>
      <div className="field">
        <label>Items</label>
        <OptionSelect kind="material_items" value={item} onChange={setItem} style={{ minHeight: 32 }} />
      </div>
      <div className="field">
        <label>Type</label>
        <OptionSelect kind="material_types" value={type} onChange={setType} style={{ minHeight: 32 }} />
      </div>
      <div className="field"><label>Size</label><input className="input" style={{ minHeight: 32, width: 100 }} value={size} onChange={(e) => setSize(e.target.value)} placeholder="20x56x460" /></div>
      <div className="field"><label>Unit</label><input className="input" style={{ minHeight: 32, width: 90 }} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="m3, pcs…" required /></div>
      <div className="field"><label>Starting price</label><input className="input" style={{ minHeight: 32, width: 100 }} value={price} onChange={(e) => setPrice(e.target.value)} required /></div>
      <button type="submit" className="btn btn-primary">Add</button>
      <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
    </form>
  );
}
