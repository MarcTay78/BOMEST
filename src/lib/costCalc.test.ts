import { describe, expect, it } from 'vitest';
import { computeCategoryBreakdown, computeProductCost, formatCurrency } from './costCalc';
import type { BomLine, Material } from './types';

const materials: Material[] = [
  { id: 'm1', name: 'Oak Lumber', category: 'wood', unit: 'm3', currentPrice: 850, updatedAt: '' },
  { id: 'm2', name: 'Steel Bracket', category: 'hardware', unit: 'pcs', currentPrice: 2.1, updatedAt: '' },
  { id: 'm3', name: 'Danish Oil Finish', category: 'finish', unit: 'L', currentPrice: 18.5, updatedAt: '' },
  { id: 'm4', name: 'Box', category: 'packaging', unit: 'pcs', currentPrice: 4.2, updatedAt: '' },
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
    expect(cost.categorySums.wood).toBeCloseTo(153);
    expect(cost.categorySums.hardware).toBeCloseTo(8.4);
    expect(cost.categorySums.finish).toBeCloseTo(7.4);
    expect(cost.categorySums.packaging).toBeCloseTo(4.2);
    expect(cost.materialsCost).toBeCloseTo(173);
    expect(cost.total).toBeCloseTo(293);
  });

  it('empty BOM: total is labor only', () => {
    const cost = computeProductCost({ laborCost: 50 }, [], materialsById);
    expect(cost.materialsCost).toBe(0);
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
});

describe('computeCategoryBreakdown', () => {
  it('returns the 4 material categories plus labor, in order', () => {
    const cost = computeProductCost(
      { laborCost: 120 },
      [{ id: 'b1', productId: 'p1', materialId: 'm1', quantity: 1 }],
      materialsById,
    );
    const breakdown = computeCategoryBreakdown(cost);
    expect(breakdown.map((b) => b.key)).toEqual(['wood', 'hardware', 'finish', 'packaging', 'labor']);
    expect(breakdown.find((b) => b.key === 'wood')?.value).toBe(850);
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
