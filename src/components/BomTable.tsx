import { useState } from 'react';
import { formatCurrency } from '../lib/costCalc';
import type { BomLine, Material } from '../lib/types';
import { TrashIcon } from './icons';

interface Props {
  bomLines: BomLine[];
  materials: Material[];
  editable: boolean;
  onAdd: (materialId: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export function BomTable({ bomLines, materials, editable, onAdd, onRemove }: Props) {
  const materialsById = new Map(materials.map((m) => [m.id, m]));
  const [materialId, setMaterialId] = useState('');
  const [qty, setQty] = useState('');

  const submitAdd = () => {
    const quantity = Number(qty);
    if (!materialId || !quantity || quantity <= 0) return;
    onAdd(materialId, quantity);
    setMaterialId('');
    setQty('');
  };

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Material</th>
          <th>Qty</th>
          <th>Unit</th>
          <th style={{ textAlign: 'right' }}>Line cost</th>
          {editable && <th></th>}
        </tr>
      </thead>
      <tbody>
        {bomLines.length === 0 && !editable && (
          <tr><td colSpan={4} className="text-muted" style={{ textAlign: 'center', padding: '22px 0' }}>No BOM lines yet</td></tr>
        )}
        {bomLines.map((line) => {
          const material = materialsById.get(line.materialId);
          if (!material) return null;
          return (
            <tr key={line.id}>
              <td>{material.name}</td>
              <td>{line.quantity}</td>
              <td className="text-muted">{material.unit}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(line.quantity * material.currentPrice)}</td>
              {editable && (
                <td>
                  <button type="button" className="btn btn-ghost btn-icon" aria-label="Remove" onClick={() => onRemove(line.id)}>
                    <TrashIcon />
                  </button>
                </td>
              )}
            </tr>
          );
        })}
        {editable && (
          <tr>
            <td>
              <select className="input" style={{ minHeight: 32 }} value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
                <option value="">Choose material…</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </td>
            <td colSpan={2}>
              <input className="input" style={{ minHeight: 32 }} placeholder="qty" value={qty} onChange={(e) => setQty(e.target.value)} />
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
