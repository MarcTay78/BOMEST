import type { BomLine, Material, Product } from './types';

export interface CategoryBreakdown {
  key: string;
  label: string;
  value: number;
}

export interface ProductCost {
  materialsCost: number;
  laborCost: number;
  total: number;
  /** Category totals in first-seen order among the BOM lines — categories are a free-form list now. */
  categoryTotals: { category: string; total: number }[];
}

const MM3_PER_M3 = 1_000_000_000;

/** "24x590x915" (mm) -> [24, 590, 915]. Null if not exactly 3 positive numbers. */
export function parseSizeMm(size: string): [number, number, number] | null {
  const parts = size.split(/x/i).map((s) => Number(s.trim()));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n) || n <= 0)) return null;
  return parts as [number, number, number];
}

export interface EffectiveUnit {
  price: number;
  unit: string;
  /** True when this price was derived from an m3 rate + parsed Size, rather than taken as-is. */
  converted: boolean;
}

/** A material priced per m3 with a parseable WxHxL Size auto-converts to a $/pc rate. */
export function computeEffectiveUnit(material: Pick<Material, 'unit' | 'size' | 'currentPrice'>): EffectiveUnit {
  const isVolumePriced = material.unit.trim().toLowerCase() === 'm3';
  const dims = isVolumePriced ? parseSizeMm(material.size) : null;
  if (!dims) return { price: material.currentPrice, unit: material.unit, converted: false };
  const [a, b, c] = dims;
  const volumeM3 = (a * b * c) / MM3_PER_M3;
  return { price: volumeM3 * material.currentPrice, unit: 'pcs', converted: true };
}

/** product.total_cost = SUM(bom_lines.quantity * materials.current_price) + product.labor_cost
 *  (materials priced per m3 with a parseable Size use the computed $/pc rate — see computeEffectiveUnit) */
export function computeProductCost(
  product: Pick<Product, 'laborCost'>,
  bomLines: BomLine[],
  materialsById: Map<string, Material>,
): ProductCost {
  const order: string[] = [];
  const sums = new Map<string, number>();

  for (const line of bomLines) {
    const material = materialsById.get(line.materialId);
    if (!material) continue;
    const category = material.category || 'Uncategorized';
    if (!sums.has(category)) {
      sums.set(category, 0);
      order.push(category);
    }
    const { price } = computeEffectiveUnit(material);
    sums.set(category, sums.get(category)! + line.quantity * price);
  }

  const categoryTotals = order.map((category) => ({ category, total: sums.get(category)! }));
  const materialsCost = categoryTotals.reduce((sum, c) => sum + c.total, 0);
  return { materialsCost, laborCost: product.laborCost, total: materialsCost + product.laborCost, categoryTotals };
}

export function computeCategoryBreakdown(cost: ProductCost): CategoryBreakdown[] {
  return [
    ...cost.categoryTotals.map((c) => ({ key: c.category, label: c.category, value: c.total })),
    { key: 'labor', label: 'Overhead', value: cost.laborCost },
  ];
}

export function formatCurrency(value: number): string {
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** DD/MMM/YYYY, e.g. 12/Jul/2026. Uses UTC fields so a date-only string doesn't shift a day in negative-offset timezones. */
export function formatDate(value: string): string {
  const d = new Date(value);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  return `${day}/${month}/${d.getUTCFullYear()}`;
}
