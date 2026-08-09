import { describe, expect, it } from 'vitest';
import { computeCategoryBreakdown, computeEffectivePrice, computeEffectiveUnit, computeProductCost, formatCurrency, formatUnitPrice, parseSizeMm, parseSizeMm2 } from './costCalc';
import type { BomLine, Material, MaterialComponent } from './types';

const materials: Material[] = [
  { id: 'm1', name: 'Oak Lumber', category: 'Wood', item: 'Lumber', type: 'S4S', size: '', unit: 'm3', currentPrice: 850, isComposite: false, isEstimate: false, updatedAt: '' },
  { id: 'm2', name: 'Steel Bracket', category: 'Hardware', item: 'Bracket', type: '', size: '', unit: 'pcs', currentPrice: 2.1, isComposite: false, isEstimate: false, updatedAt: '' },
  { id: 'm3', name: 'Danish Oil Finish', category: 'Finish', item: 'Oil', type: '', size: '', unit: 'L', currentPrice: 18.5, isComposite: false, isEstimate: false, updatedAt: '' },
  { id: 'm4', name: 'Box', category: 'Packaging', item: 'Box', type: '', size: '', unit: 'pcs', currentPrice: 4.2, isComposite: false, isEstimate: false, updatedAt: '' },
];
const materialsById = new Map(materials.map((m) => [m.id, m]));

describe('computeProductCost', () => {
  it('sums qty * current price per category plus labor', () => {
    const bomLines: BomLine[] = [
      { id: 'b1', productId: 'p1', materialId: 'm1', quantity: 0.18, remarks: '' },
      { id: 'b2', productId: 'p1', materialId: 'm2', quantity: 4, remarks: '' },
      { id: 'b3', productId: 'p1', materialId: 'm3', quantity: 0.4, remarks: '' },
      { id: 'b4', productId: 'p1', materialId: 'm4', quantity: 1, remarks: '' },
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
    const bomLines: BomLine[] = [{ id: 'b1', productId: 'p1', materialId: 'missing', quantity: 5, remarks: '' }];
    const cost = computeProductCost({ laborCost: 10 }, bomLines, materialsById);
    expect(cost.total).toBe(10);
  });

  it('live re-pricing: changing a material price changes total without touching bom_lines', () => {
    const before = computeProductCost({ laborCost: 0 }, [{ id: 'b1', productId: 'p1', materialId: 'm1', quantity: 1, remarks: '' }], materialsById);
    const repriced = new Map(materialsById);
    repriced.set('m1', { ...materials[0], currentPrice: 900 });
    const after = computeProductCost({ laborCost: 0 }, [{ id: 'b1', productId: 'p1', materialId: 'm1', quantity: 1, remarks: '' }], repriced);
    expect(before.total).toBe(850);
    expect(after.total).toBe(900);
  });

  it('groups two materials that share a category into one bucket', () => {
    const sameCategoryMaterials = new Map(materialsById);
    sameCategoryMaterials.set('m5', { ...materials[0], id: 'm5', name: 'Walnut Lumber', currentPrice: 1450 });
    const bomLines: BomLine[] = [
      { id: 'b1', productId: 'p1', materialId: 'm1', quantity: 1, remarks: '' },
      { id: 'b2', productId: 'p1', materialId: 'm5', quantity: 1, remarks: '' },
    ];
    const cost = computeProductCost({ laborCost: 0 }, bomLines, sameCategoryMaterials);
    expect(cost.categoryTotals).toEqual([{ category: 'Wood', total: 850 + 1450 }]);
  });

  it('falls back to Uncategorized when a material has no category', () => {
    const uncategorized = new Map(materialsById);
    uncategorized.set('m1', { ...materials[0], category: '' });
    const cost = computeProductCost({ laborCost: 0 }, [{ id: 'b1', productId: 'p1', materialId: 'm1', quantity: 1, remarks: '' }], uncategorized);
    expect(cost.categoryTotals).toEqual([{ category: 'Uncategorized', total: 850 }]);
  });

});

describe('computeCategoryBreakdown', () => {
  it('returns categories in first-seen BOM order plus labor last', () => {
    const bomLines: BomLine[] = [
      { id: 'b1', productId: 'p1', materialId: 'm3', quantity: 1, remarks: '' },
      { id: 'b2', productId: 'p1', materialId: 'm1', quantity: 1, remarks: '' },
    ];
    const cost = computeProductCost({ laborCost: 120 }, bomLines, materialsById);
    const breakdown = computeCategoryBreakdown(cost);
    expect(breakdown.map((b) => b.key)).toEqual(['Finish', 'Wood', 'labor']);
    expect(breakdown.find((b) => b.key === 'Wood')?.value).toBe(850);
    expect(breakdown.find((b) => b.key === 'labor')?.value).toBe(120);
  });
});

describe('parseSizeMm', () => {
  it('parses "AxBxC" into 3 numbers', () => {
    expect(parseSizeMm('24x590x915')).toEqual([24, 590, 915]);
  });

  it('is case-insensitive and tolerates spaces', () => {
    expect(parseSizeMm('24 X 590 X 915')).toEqual([24, 590, 915]);
  });

  it('rejects anything that is not exactly 3 positive numbers', () => {
    expect(parseSizeMm('')).toBeNull();
    expect(parseSizeMm('4x8')).toBeNull();
    expect(parseSizeMm('24x590x915x10')).toBeNull();
    expect(parseSizeMm('24x0x915')).toBeNull();
    expect(parseSizeMm('large')).toBeNull();
  });
});

describe('parseSizeMm2', () => {
  it('parses "AxB" into 2 numbers', () => {
    expect(parseSizeMm2('1220x2440')).toEqual([1220, 2440]);
  });

  it('is case-insensitive and tolerates spaces', () => {
    expect(parseSizeMm2('1220 X 2440')).toEqual([1220, 2440]);
  });

  it('rejects anything that is not exactly 2 positive numbers', () => {
    expect(parseSizeMm2('')).toBeNull();
    expect(parseSizeMm2('1220')).toBeNull();
    expect(parseSizeMm2('1220x2440x10')).toBeNull();
    expect(parseSizeMm2('1220x0')).toBeNull();
    expect(parseSizeMm2('large')).toBeNull();
  });
});

describe('computeEffectiveUnit', () => {
  it('converts an m3-priced material with a parseable size to a $/pc rate', () => {
    const material = { unit: 'm3', size: '24x590x915', currentPrice: 850 };
    const effective = computeEffectiveUnit(material);
    const expectedVolumeM3 = (24 * 590 * 915) / 1_000_000_000;
    expect(effective.converted).toBe(true);
    expect(effective.unit).toBe('pcs');
    expect(effective.price).toBeCloseTo(expectedVolumeM3 * 850);
  });

  it('leaves an m3 material with no parseable size untouched', () => {
    const material = { unit: 'm3', size: '', currentPrice: 850 };
    const effective = computeEffectiveUnit(material);
    expect(effective).toEqual({ price: 850, unit: 'm3', converted: false });
  });

  it('leaves a non-m3 material untouched even with a parseable size', () => {
    const material = { unit: 'pcs', size: '20x56x460', currentPrice: 1 };
    const effective = computeEffectiveUnit(material);
    expect(effective).toEqual({ price: 1, unit: 'pcs', converted: false });
  });

  it('unit match is case-insensitive', () => {
    const material = { unit: 'M3', size: '100x100x1000', currentPrice: 1000 };
    expect(computeEffectiveUnit(material).converted).toBe(true);
  });

  it('converts a sqft-priced material with a parseable 2-dim size to a $/pc rate', () => {
    const material = { unit: 'sqft', size: '1220x2440', currentPrice: 2 };
    const effective = computeEffectiveUnit(material);
    const MM2_PER_SQFT = 92903.04;
    const expectedSqft = (1220 * 2440) / MM2_PER_SQFT;
    expect(effective.converted).toBe(true);
    expect(effective.unit).toBe('pcs');
    expect(effective.price).toBeCloseTo(expectedSqft * 2);
  });

  it('leaves a sqft material with no parseable size untouched', () => {
    const material = { unit: 'sqft', size: '', currentPrice: 2 };
    const effective = computeEffectiveUnit(material);
    expect(effective).toEqual({ price: 2, unit: 'sqft', converted: false });
  });

  it('sqft unit match is case-insensitive', () => {
    const material = { unit: 'SqFt', size: '1220x2440', currentPrice: 2 };
    expect(computeEffectiveUnit(material).converted).toBe(true);
  });

  it('a 3-dim size on a sqft material does not convert (wrong dimension count)', () => {
    const material = { unit: 'sqft', size: '24x590x915', currentPrice: 2 };
    const effective = computeEffectiveUnit(material);
    expect(effective).toEqual({ price: 2, unit: 'sqft', converted: false });
  });
});

describe('computeProductCost with m3-to-pcs conversion', () => {
  it('uses the computed $/pc rate, not the raw m3 rate, for the line total', () => {
    const convertible = new Map([
      ['m9', { id: 'm9', name: 'Chair Leg', category: 'Wood', item: 'Leg', type: 'S4S', size: '24x590x915', unit: 'm3', currentPrice: 850, isComposite: false, isEstimate: false, updatedAt: '' }],
    ]);
    const bomLines: BomLine[] = [{ id: 'b1', productId: 'p1', materialId: 'm9', quantity: 4, remarks: '' }];
    const cost = computeProductCost({ laborCost: 0 }, bomLines, convertible);
    const piecePrice = ((24 * 590 * 915) / 1_000_000_000) * 850;
    expect(cost.total).toBeCloseTo(piecePrice * 4);
    // sanity: the naive (wrong) m3-rate total would be wildly higher
    expect(cost.total).toBeLessThan(850 * 4);
  });
});

describe('formatCurrency', () => {
  it('formats as USD with 2 decimals', () => {
    expect(formatCurrency(850)).toBe('$850.00');
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
    expect(formatCurrency(0)).toBe('$0.00');
  });
});

describe('formatUnitPrice', () => {
  it('shows up to 4 decimals, never fewer than 2', () => {
    expect(formatUnitPrice(0.0842)).toBe('$0.0842');
    expect(formatUnitPrice(2.1)).toBe('$2.10');
    expect(formatUnitPrice(850)).toBe('$850.00');
    expect(formatUnitPrice(1234.56789)).toBe('$1,234.5679');
  });
});

describe('computeEffectivePrice', () => {
  it('passes through to computeEffectiveUnit for a non-composite material', () => {
    const price = computeEffectivePrice(materials[0], materialsById, new Map());
    expect(price).toEqual(computeEffectiveUnit(materials[0]));
  });

  it('sums quantity * component effective price for a composite material', () => {
    const pack: Material = { id: 'pack', name: 'Hardware Pack', category: 'Hardware', item: '', type: '', size: '', unit: 'pcs', currentPrice: 0, isComposite: true, isEstimate: false, updatedAt: '' };
    const withPack = new Map(materialsById);
    withPack.set('pack', pack);
    const components: MaterialComponent[] = [
      { id: 'c1', materialId: 'pack', componentMaterialId: 'm2', quantity: 4 },
      { id: 'c2', materialId: 'pack', componentMaterialId: 'm4', quantity: 1 },
    ];
    const componentsByMaterialId = new Map([['pack', components]]);
    const price = computeEffectivePrice(pack, withPack, componentsByMaterialId);
    expect(price).toEqual({ price: 4 * 2.1 + 1 * 4.2, unit: 'pcs', converted: false });
  });

  it('skips a component whose material no longer exists, without throwing', () => {
    const pack: Material = { id: 'pack', name: 'Hardware Pack', category: 'Hardware', item: '', type: '', size: '', unit: 'pcs', currentPrice: 0, isComposite: true, isEstimate: false, updatedAt: '' };
    const withPack = new Map(materialsById);
    withPack.set('pack', pack);
    const components: MaterialComponent[] = [
      { id: 'c1', materialId: 'pack', componentMaterialId: 'm2', quantity: 4 },
      { id: 'c2', materialId: 'pack', componentMaterialId: 'missing', quantity: 99 },
    ];
    const componentsByMaterialId = new Map([['pack', components]]);
    const price = computeEffectivePrice(pack, withPack, componentsByMaterialId);
    expect(price).toEqual({ price: 4 * 2.1, unit: 'pcs', converted: false });
  });
});
