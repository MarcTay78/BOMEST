import { useState } from 'react';
import { formatCurrency } from '../lib/costCalc';
import type { BomLine, Material } from '../lib/types';
import { TrashIcon } from './icons';

interface Props {
  bomLines: BomLine[];
  materials: Material[];
  editable: boolean;
  onAdd: (materialId: string, quantity: number, remarks: string) => void;
  onRemove: (id: string) => void;
  onUpdateRemarks: (id: string, remarks: string) => void;
}

const COLUMN_COUNT = 9;

export function BomTable({ bomLines, materials, editable, onAdd, onRemove, onUpdateRemarks }: Props) {
  const materialsById = new Map(materials.map((m) => [m.id, m]));
  const [materialId, setMaterialId] = useState('');
  const [qty, setQty] = useState('');
  const [remarks, setRemarks] = useState('');
  const selectedMaterial = materialsById.get(materialId);

  const submitAdd = () => {
    const quantity = Number(qty);
    if (!materialId || !quantity || quantity <= 0) return;
    onAdd(materialId, quantity, remarks.trim());
    setMaterialId('');
    setQty('');
    setRemarks('');
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
            return (
              <tr key={line.id}>
                <td>{showCategory ? material.category || '—' : ''}</td>
                <td>{material.item || '—'}</td>
                <td>{material.type || '—'}</td>
                <td>{material.size || '—'}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(material.currentPrice)}</td>
                <td>{line.quantity}</td>
                <td className="text-muted">{material.unit}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(line.quantity * material.currentPrice)}</td>
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
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </td>
            <td style={{ textAlign: 'right' }} className="text-muted">{selectedMaterial ? formatCurrency(selectedMaterial.currentPrice) : '—'}</td>
            <td>
              <input className="input" style={{ minHeight: 32 }} placeholder="qty" value={qty} onChange={(e) => setQty(e.target.value)} />
            </td>
            <td className="text-muted">{selectedMaterial?.unit ?? '—'}</td>
            <td>
              <input className="input" style={{ minHeight: 32 }} placeholder="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </td>
            <td colSpan={2}>
              <button type="button" className="btn btn-secondary" onClick={submitAdd}>Add line</button>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
