import { useState } from 'react';
import { computeEffectivePrice, formatCurrency, MM2_PER_SQFT, MM3_PER_M3 } from '../lib/costCalc';
import type { BomLine, Material, MaterialComponent } from '../lib/types';
import { TrashIcon } from './icons';

interface Props {
  bomLines: BomLine[];
  materials: Material[];
  componentsByMaterialId: Map<string, MaterialComponent[]>;
  editable: boolean;
  onAdd: (materialId: string, quantity: number, remarks: string) => void;
  onRemove: (id: string) => void;
  onUpdateRemarks: (id: string, remarks: string) => void;
}

const COLUMN_COUNT = 9;

export function BomTable({ bomLines, materials, componentsByMaterialId, editable, onAdd, onRemove, onUpdateRemarks }: Props) {
  const materialsById = new Map(materials.map((m) => [m.id, m]));
  const [materialId, setMaterialId] = useState('');
  const [qty, setQty] = useState('');
  const [remarks, setRemarks] = useState('');
  const [dimL, setDimL] = useState('');
  const [dimW, setDimW] = useState('');
  const [dimH, setDimH] = useState('');
  const [pieces, setPieces] = useState('1');
  const selectedMaterial = materialsById.get(materialId);
  const selectedEffective = selectedMaterial ? computeEffectivePrice(selectedMaterial, materialsById, componentsByMaterialId) : null;
  const rawUnit = selectedMaterial?.unit.trim().toLowerCase();
  const calcMode = rawUnit === 'm3' ? 'm3' : rawUnit === 'sqft' ? 'sqft' : null;

  const submitAdd = () => {
    const quantity = Number(qty);
    if (!materialId || !quantity || quantity <= 0) return;
    onAdd(materialId, quantity, remarks.trim());
    setMaterialId('');
    setQty('');
    setRemarks('');
    setDimL('');
    setDimW('');
    setDimH('');
    setPieces('1');
  };

  const recompute = (l: string, w: string, h: string, n: string) => {
    const nl = Number(l), nw = Number(w), nh = Number(h), np = Number(n);
    if (!nw || !nh || !np || nw <= 0 || nh <= 0 || np <= 0) return;
    if (calcMode === 'm3') {
      if (!nl || nl <= 0) return;
      setQty(String((nl * nw * nh / MM3_PER_M3) * np));
    } else if (calcMode === 'sqft') {
      setQty(String((nw * nh / MM2_PER_SQFT) * np));
    }
  };

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Category</th>
          <th>Items</th>
          <th>Type</th>
          <th>Size</th>
          <th style={{ textAlign: 'right' }}>Price</th>
          <th>Qty</th>
          <th>Unit</th>
          <th style={{ textAlign: 'right' }}>Line cost</th>
          <th>Remarks</th>
          {editable && <th></th>}
        </tr>
      </thead>
      <tbody>
        {bomLines.length === 0 && !editable && (
          <tr><td colSpan={COLUMN_COUNT} className="text-muted" style={{ textAlign: 'center', padding: '22px 0' }}>No BOM lines yet</td></tr>
        )}
        {(() => {
          const withMaterial = bomLines
            .map((line) => ({ line, material: materialsById.get(line.materialId) }))
            .filter((row): row is { line: BomLine; material: Material } => Boolean(row.material));
          const sorted = [...withMaterial].sort((a, b) => a.material.category.localeCompare(b.material.category));
          let previousCategory: string | null = null;
          return sorted.map(({ line, material }) => {
            const showCategory = material.category !== previousCategory;
            previousCategory = material.category;
            const effective = computeEffectivePrice(material, materialsById, componentsByMaterialId);
            return (
              <tr key={line.id}>
                <td>{showCategory ? material.category || '—' : ''}</td>
                <td>{material.item || '—'}</td>
                <td>{material.type || '—'}</td>
                <td>{material.size || '—'}</td>
                <td style={{ textAlign: 'right' }} title={effective.converted ? `${formatCurrency(material.currentPrice)} / m3` : undefined}>
                  {formatCurrency(effective.price)}
                  {material.isEstimate && <span className="tag tag-neutral" style={{ marginLeft: 6 }}>Estimate</span>}
                </td>
                <td>{line.quantity}</td>
                <td className="text-muted">{effective.unit}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(line.quantity * effective.price)}</td>
                <td>
                  {editable ? (
                    <input
                      className="input"
                      style={{ minHeight: 30, width: 140 }}
                      defaultValue={line.remarks}
                      onBlur={(e) => {
                        if (e.target.value !== line.remarks) onUpdateRemarks(line.id, e.target.value);
                      }}
                    />
                  ) : (
                    <span className="text-muted">{line.remarks || '—'}</span>
                  )}
                </td>
                {editable && (
                  <td>
                    <button type="button" className="btn btn-ghost btn-icon" aria-label="Remove" onClick={() => onRemove(line.id)}>
                      <TrashIcon />
                    </button>
                  </td>
                )}
              </tr>
            );
          });
        })()}
        {editable && (
          <tr>
            <td colSpan={4}>
              <select className="input" style={{ minHeight: 32 }} value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
                <option value="">Choose material…</option>
                {[...materials].sort((a, b) => a.name.localeCompare(b.name)).map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                ))}
              </select>
            </td>
            <td style={{ textAlign: 'right' }} className="text-muted">
              {selectedEffective ? formatCurrency(selectedEffective.price) : '—'}
              {selectedMaterial?.isEstimate && <span className="tag tag-neutral" style={{ marginLeft: 6 }}>Estimate</span>}
            </td>
            <td>
              <input className="input" style={{ minHeight: 32 }} placeholder="qty" value={qty} onChange={(e) => setQty(e.target.value)} />
            </td>
            <td className="text-muted">{selectedEffective ? selectedEffective.unit : '—'}</td>
            <td>
              <input className="input" style={{ minHeight: 32 }} placeholder="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </td>
            <td colSpan={2}>
              <button type="button" className="btn btn-secondary" onClick={submitAdd}>Add line</button>
            </td>
          </tr>
        )}
        {editable && calcMode && (
          <tr>
            <td colSpan={COLUMN_COUNT + 1} style={{ padding: '6px 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }} className="text-muted">
                <span>Compute qty from size (mm), always in mm:</span>
                {calcMode === 'm3' && (
                  <input
                    className="input"
                    style={{ minHeight: 28, width: 70 }}
                    placeholder="L"
                    value={dimL}
                    onChange={(e) => { setDimL(e.target.value); recompute(e.target.value, dimW, dimH, pieces); }}
                  />
                )}
                <input
                  className="input"
                  style={{ minHeight: 28, width: 70 }}
                  placeholder="W"
                  value={dimW}
                  onChange={(e) => { setDimW(e.target.value); recompute(dimL, e.target.value, dimH, pieces); }}
                />
                <input
                  className="input"
                  style={{ minHeight: 28, width: 70 }}
                  placeholder="H"
                  value={dimH}
                  onChange={(e) => { setDimH(e.target.value); recompute(dimL, dimW, e.target.value, pieces); }}
                />
                <span>×</span>
                <input
                  className="input"
                  style={{ minHeight: 28, width: 60 }}
                  placeholder="pieces"
                  value={pieces}
                  onChange={(e) => { setPieces(e.target.value); recompute(dimL, dimW, dimH, e.target.value); }}
                />
                <span>pcs → fills Qty in {calcMode}</span>
              </div>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
