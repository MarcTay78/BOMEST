import { describe, expect, it } from 'vitest';
import { computeCategoryBreakdown, computeProductCost, formatCurrency } from './costCalc';
import type { BomLine, Material } from './types';

const materials: Material[] = [
  { id: 'm1', name: 'Oak Lumber', category: 'Wood', item: 'Lumber', type: 'S4S', size: '', unit: 'm3', currentPrice: 850, updatedAt: '' },
  { id: 'm2', name: 'Steel Bracket', category: 'Hardware', item: 'Bracket', type: '', size: '', unit: 'pcs', currentPrice: 2.1, updatedAt: '' },
  { id: 'm3', name: 'Danish Oil Finish', category: 'Finish', item: 'Oil', type: '', size: '', unit: 'L', currentPrice: 18.5, updatedAt: '' },
  { id: 'm4', name: 'Box', category: 'Packaging', item: 'Box', type: '', size: '', unit: 'pcs', currentPrice: 4.2, updatedAt: '' },
];
const materialsById = new Map(materials.map((m) => [m.id, m]));

describe('computeProductCost', () => {
  it('sums qty * current price per category plus labor', () => {
    const bomLines: BomLine[] = [
      { id: 'b1', productId: 'p1', materialId: 'm1', quantity: 0.18 },
      { id: 'b2', productId: 'p1', materialId: 'm2', quantity: 4 },
      { id: 'b3', productId: 'p1', materialId: 'm3', quantity: 0.4 },
      { id: 'b4', productId: 'p1', materialId: 'm4', quantity: 1 },
    ];
    const cost = computeProductCost({ laborCost: 120 }, bomLines, materialsById);
    const byCategory = Object.fromEntries(cost.categoryTotals.map((c) => [c.category, c.total]));
    expect(byCategory.Wood).toBeCloseTo(153);
    expect(byCategory.Hardware).toBeCloseTo(8.4);
    expect(byCategory.Finish).toBeCloseTo(7.4);
    expect(byCategory.Packaging).toBeCloseTo(4.2);
    expect(cost.materialsCost).toBeCloseTo(173);
    expect(cost.total).toBeCloseTo(293);
  });

  it('empty BOM: total is labor only', () => {
    const cost = computeProductCost({ laborCost: 50 }, [], materialsById);
    expect(cost.materialsCost).toBe(0);
    expect(cost.categoryTotals).toEqual([]);
    expect(cost.total).toBe(50);
  });

  it('ignores a BOM line whose material no longer exists', () => {
    const bomLines: BomLine[] = [{ id: 'b1', productId: 'p1', materialId: 'missing', quantity: 5 }];
    const cost = computeProductCost({ laborCost: 10 }, bomLines, materialsById);
    expect(cost.total).toBe(10);
  });

  it('live re-pricing: changing a material price changes total without touching bom_lines', () => {
    const before = computeProductCost({ laborCost: 0 }, [{ id: 'b1', productId: 'p1', materialId: 'm1', quantity: 1 }], materialsById);
    const repriced = new Map(materialsById);
    repriced.set('m1', { ...materials[0], currentPrice: 900 });
    const after = computeProductCost({ laborCost: 0 }, [{ id: 'b1', productId: 'p1', materialId: 'm1', quantity: 1 }], repriced);
    expect(before.total).toBe(850);
    expect(after.total).toBe(900);
  });

  it('groups two materials that share a category into one bucket', () => {
    const sameCategoryMaterials = new Map(materialsById);
    sameCategoryMaterials.set('m5', { ...materials[0], id: 'm5', name: 'Walnut Lumber', currentPrice: 1450 });
    const bomLines: BomLine[] = [
      { id: 'b1', productId: 'p1', materialId: 'm1', quantity: 1 },
      { id: 'b2', productId: 'p1', materialId: 'm5', quantity: 1 },
    ];
    const cost = computeProductCost({ laborCost: 0 }, bomLines, sameCategoryMaterials);
    expect(cost.categoryTotals).toEqual([{ category: 'Wood', total: 850 + 1450 }]);
  });

  it('falls back to Uncategorized when a material has no category', () => {
    const uncategorized = new Map(materialsById);
    uncategorized.set('m1', { ...materials[0], category: '' });
    const cost = computeProductCost({ laborCost: 0 }, [{ id: 'b1', productId: 'p1', materialId: 'm1', quantity: 1 }], uncategorized);
    expect(cost.categoryTotals).toEqual([{ category: 'Uncategorized', total: 850 }]);
  });
});

describe('computeCategoryBreakdown', () => {
  it('returns categories in first-seen BOM order plus labor last', () => {
    const bomLines: BomLine[] = [
      { id: 'b1', productId: 'p1', materialId: 'm3', quantity: 1 },
      { id: 'b2', productId: 'p1', materialId: 'm1', quantity: 1 },
    ];
    const cost = computeProductCost({ laborCost: 120 }, bomLines, materialsById);
    const breakdown = computeCategoryBreakdown(cost);
    expect(breakdown.map((b) => b.key)).toEqual(['Finish', 'Wood', 'labor']);
    expect(breakdown.find((b) => b.key === 'Wood')?.value).toBe(850);
    expect(breakdown.find((b) => b.key === 'labor')?.value).toBe(120);
  });
});

describe('formatCurrency', () => {
  it('formats as USD with 2 decimals', () => {
    expect(formatCurrency(850)).toBe('$850.00');
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
    expect(formatCurrency(0)).toBe('$0.00');
  });
});
