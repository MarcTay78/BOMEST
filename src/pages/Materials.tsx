import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useIsAdmin } from '../auth/AuthContext';
import { EditIcon, PlusIcon, TrashIcon, WarningIcon } from '../components/icons';
import { OptionSelect } from '../components/OptionSelect';
import { DeleteBlockedError, dataStore } from '../data';
import { computeEffectivePrice, formatCurrency, formatDate } from '../lib/costCalc';
import type { Material, MaterialComponent } from '../lib/types';
import { useCssVarHeight } from '../lib/useCssVarHeight';

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

type SortKey = 'name' | 'category' | 'item' | 'type' | 'size';

export function Materials() {
  const isAdmin = useIsAdmin();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialComponents, setMaterialComponents] = useState<MaterialComponent[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [adding, setAdding] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [activeCategory, setActiveCategory] = useState('All');
  const [recipeOpenId, setRecipeOpenId] = useState<string | null>(null);
  const titleRef = useCssVarHeight<HTMLDivElement>('--materials-title-h');
  const tabsRef = useCssVarHeight<HTMLDivElement>('--materials-tabs-h');

  const reload = () =>
    Promise.all([dataStore.listMaterials(), dataStore.listMaterialComponents()]).then(([mats, components]) => {
      setMaterials(mats);
      setMaterialComponents(components);
    });
  useEffect(() => {
    reload();
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

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    }
  };

  const categories = useMemo(
    () => Array.from(new Set(materials.map((m) => m.category).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [materials],
  );

  const categoryFiltered = useMemo(
    () => (activeCategory === 'All' ? materials : materials.filter((m) => m.category === activeCategory)),
    [materials, activeCategory],
  );

  const sortedMaterials = useMemo(() => {
    if (!sortKey) return categoryFiltered;
    const sorted = [...categoryFiltered].sort((a, b) => a[sortKey].localeCompare(b[sortKey]));
    return sortDir === 'asc' ? sorted : sorted.reverse();
  }, [categoryFiltered, sortKey, sortDir]);

  const sortIndicator = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '');

  const stickyTh: React.CSSProperties = {
    position: 'sticky',
    top: 'calc(var(--nav-h) + var(--materials-title-h) + var(--materials-tabs-h))',
    zIndex: 4,
    background: 'var(--color-bg)',
  };

  const startEdit = (m: Material) => {
    setEditingId(m.id);
    setDraft(draftFrom(m));
  };

  const commitEdit = async (m: Material) => {
    setEditingId(null);
    if (!draft) return;
    if (!m.isComposite) {
      const price = Number(draft.price);
      if (Number.isNaN(price) || price < 0) return;
      if (price !== m.currentPrice) await dataStore.updateMaterialPrice(m.id, price);
    }
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
      if (err instanceof DeleteBlockedError) setBlockedMessage(`Can't delete — used in ${err.usedByCount} product(s) or recipe(s).`);
      else setBlockedMessage(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const addRecipeComponent = async (materialId: string, componentMaterialId: string, quantity: number) => {
    await dataStore.addMaterialComponent(materialId, componentMaterialId, quantity);
    await reload();
  };

  const removeRecipeComponent = async (componentId: string) => {
    await dataStore.removeMaterialComponent(componentId);
    await reload();
  };

  return (
    <div className="content">
      <div
        ref={titleRef}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18,
          position: 'sticky', top: 'var(--nav-h)', zIndex: 6, background: 'var(--color-bg)', paddingTop: 18,
        }}
      >
        <h1 style={{ margin: 0 }}>Materials</h1>
        {isAdmin && (
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
            Add material<PlusIcon />
          </button>
        )}
      </div>

      {adding && <AddMaterialForm materials={materials} onDone={async () => { setAdding(false); await reload(); }} onCancel={() => setAdding(false)} />}

      <div
        ref={tabsRef}
        style={{
          display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap',
          position: 'sticky', top: 'calc(var(--nav-h) + var(--materials-title-h))', zIndex: 5, background: 'var(--color-bg)', paddingTop: 6,
        }}
      >
        {['All', ...categories].map((cat) => (
          <button
            key={cat}
            type="button"
            className={cat === activeCategory ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div>
        <table className="table">
          <thead>
            <tr>
              <th style={{ ...stickyTh, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('name')}>Name{sortIndicator('name')}</th>
              <th style={{ ...stickyTh, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('category')}>Category{sortIndicator('category')}</th>
              <th style={{ ...stickyTh, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('item')}>Items{sortIndicator('item')}</th>
              <th style={{ ...stickyTh, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('type')}>Type{sortIndicator('type')}</th>
              <th style={{ ...stickyTh, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('size')}>Size{sortIndicator('size')}</th>
              <th style={stickyTh}>Unit</th>
              <th style={{ ...stickyTh, textAlign: 'right' }}>Current price</th><th style={stickyTh}>Updated</th>
              {isAdmin && <th style={stickyTh}></th>}
            </tr>
          </thead>
          <tbody>
            {sortedMaterials.map((m) => {
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
                        {m.isComposite ? (
                          <span>{formatCurrency(computeEffectivePrice(m, materialsById, componentsByMaterialId).price)}</span>
                        ) : (
                          <input
                            className="input"
                            style={{ minHeight: 30, width: 90, textAlign: 'right' }}
                            value={draft.price}
                            onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                          />
                        )}
                      </td>
                      <td className="text-muted">{formatDate(m.updatedAt)}</td>
                      <td style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => commitEdit(m)}>Save</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>
                        {m.name}
                        {m.isComposite && <span className="tag tag-accent" style={{ marginLeft: 6 }}>Composite</span>}
                      </td>
                      <td>{m.category ? <span className="tag tag-neutral">{m.category}</span> : <span className="text-muted">—</span>}</td>
                      <td className="text-muted">{m.item || '—'}</td>
                      <td className="text-muted">{m.type || '—'}</td>
                      <td className="text-muted">{m.size || '—'}</td>
                      <td className="text-muted">{m.unit}</td>
                      <td style={{ textAlign: 'right' }}>
                        {formatCurrency(m.isComposite ? computeEffectivePrice(m, materialsById, componentsByMaterialId).price : m.currentPrice)} / {m.unit}
                      </td>
                      <td className="text-muted">{formatDate(m.updatedAt)}</td>
                      {isAdmin && (
                        <td style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          {m.isComposite && (
                            <button type="button" className="btn btn-ghost" onClick={() => setRecipeOpenId(recipeOpenId === m.id ? null : m.id)}>
                              Recipe
                            </button>
                          )}
                          <button type="button" className="btn btn-ghost btn-icon" aria-label="Edit" onClick={() => startEdit(m)}><EditIcon /></button>
                          <button type="button" className="btn btn-ghost btn-icon" aria-label="Delete" onClick={() => handleDelete(m.id)}><TrashIcon /></button>
                        </td>
                      )}
                    </>
                  )}
                  {recipeOpenId === m.id && m.isComposite && (
                    <tr>
                      <td colSpan={9}>
                        <RecipeEditor
                          material={m}
                          materials={materials}
                          components={componentsByMaterialId.get(m.id) ?? []}
                          onAdd={(componentMaterialId, quantity) => addRecipeComponent(m.id, componentMaterialId, quantity)}
                          onRemove={removeRecipeComponent}
                        />
                      </td>
                    </tr>
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

function RecipeEditor({
  material,
  materials,
  components,
  onAdd,
  onRemove,
}: {
  material: Material;
  materials: Material[];
  components: MaterialComponent[];
  onAdd: (componentMaterialId: string, quantity: number) => void;
  onRemove: (componentId: string) => void;
}) {
  const [componentMaterialId, setComponentMaterialId] = useState('');
  const [quantity, setQuantity] = useState('');
  const pickable = materials.filter((m) => !m.isComposite && m.id !== material.id);
  const materialsById = new Map(materials.map((m) => [m.id, m]));

  const submitAdd = () => {
    const qty = Number(quantity);
    if (!componentMaterialId || !qty || qty <= 0) return;
    onAdd(componentMaterialId, qty);
    setComponentMaterialId('');
    setQuantity('');
  };

  return (
    <div className="card" style={{ padding: 14, background: 'var(--color-surface)' }}>
      <div className="card-kicker" style={{ marginBottom: 8 }}>Recipe for {material.name}</div>
      {components.length === 0 && <p className="text-muted" style={{ margin: '0 0 8px', fontSize: 13 }}>No components yet.</p>}
      {components.map((c) => {
        const componentMaterial = materialsById.get(c.componentMaterialId);
        return (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', fontSize: 13 }}>
            <span style={{ flex: 1 }}>{componentMaterial ? componentMaterial.name : 'Unknown material'}</span>
            <span className="text-muted">× {c.quantity}</span>
            <button type="button" className="btn btn-ghost btn-icon" aria-label="Remove component" onClick={() => onRemove(c.id)}>
              <TrashIcon />
            </button>
          </div>
        );
      })}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <select className="input" style={{ minHeight: 30 }} value={componentMaterialId} onChange={(e) => setComponentMaterialId(e.target.value)}>
          <option value="">Choose material…</option>
          {[...pickable].sort((a, b) => a.name.localeCompare(b.name)).map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <input className="input" style={{ minHeight: 30, width: 80 }} placeholder="qty" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        <button type="button" className="btn btn-secondary" onClick={submitAdd}>Add</button>
      </div>
    </div>
  );
}

function AddMaterialForm({ materials, onDone, onCancel }: { materials: Material[]; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [item, setItem] = useState('');
  const [type, setType] = useState('');
  const [size, setSize] = useState('');
  const [unit, setUnit] = useState('');
  const [price, setPrice] = useState('');
  const [isComposite, setIsComposite] = useState(false);
  const [recipeRows, setRecipeRows] = useState<{ componentMaterialId: string; quantity: string }[]>([]);
  const [recipeMaterialId, setRecipeMaterialId] = useState('');
  const [recipeQty, setRecipeQty] = useState('');

  const pickable = materials.filter((m) => !m.isComposite);
  const pickableById = new Map(pickable.map((m) => [m.id, m]));

  const addRecipeRow = () => {
    const qty = Number(recipeQty);
    if (!recipeMaterialId || !qty || qty <= 0) return;
    setRecipeRows([...recipeRows, { componentMaterialId: recipeMaterialId, quantity: recipeQty }]);
    setRecipeMaterialId('');
    setRecipeQty('');
  };

  const removeRecipeRow = (index: number) => {
    setRecipeRows(recipeRows.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !unit.trim()) return;
    if (isComposite) {
      if (recipeRows.length === 0) return;
      const material = await dataStore.createMaterial({
        name: name.trim(), category, item, type, size: size.trim(), unit: unit.trim(), currentPrice: 0, isComposite: true,
      });
      for (const row of recipeRows) {
        await dataStore.addMaterialComponent(material.id, row.componentMaterialId, Number(row.quantity));
      }
    } else {
      const currentPrice = Number(price);
      if (Number.isNaN(currentPrice) || currentPrice < 0) return;
      await dataStore.createMaterial({ name: name.trim(), category, item, type, size: size.trim(), unit: unit.trim(), currentPrice, isComposite: false });
    }
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
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <input type="checkbox" checked={isComposite} onChange={(e) => setIsComposite(e.target.checked)} />
        Composite
      </label>
      {isComposite ? (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recipeRows.map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
              <span style={{ flex: 1 }}>{pickableById.get(row.componentMaterialId)?.name ?? 'Unknown material'}</span>
              <span className="text-muted">× {row.quantity}</span>
              <button type="button" className="btn btn-ghost btn-icon" aria-label="Remove row" onClick={() => removeRecipeRow(i)}>
                <TrashIcon />
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select className="input" style={{ minHeight: 32 }} value={recipeMaterialId} onChange={(e) => setRecipeMaterialId(e.target.value)}>
              <option value="">Choose material…</option>
              {[...pickable].sort((a, b) => a.name.localeCompare(b.name)).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <input className="input" style={{ minHeight: 32, width: 80 }} placeholder="qty" value={recipeQty} onChange={(e) => setRecipeQty(e.target.value)} />
            <button type="button" className="btn btn-secondary" onClick={addRecipeRow}>Add row</button>
          </div>
        </div>
      ) : (
        <div className="field"><label>Starting price</label><input className="input" style={{ minHeight: 32, width: 100 }} value={price} onChange={(e) => setPrice(e.target.value)} required /></div>
      )}
      <button type="submit" className="btn btn-primary">Add</button>
      <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
    </form>
  );
}
