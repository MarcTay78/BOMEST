import type { BomLine, Material, MaterialComponent, Product } from './types';

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
const MM2_PER_SQFT = 92903.04;

/** "24x590x915" (mm) -> [24, 590, 915]. Null if not exactly 3 positive numbers. */
export function parseSizeMm(size: string): [number, number, number] | null {
  const parts = size.split(/x/i).map((s) => Number(s.trim()));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n) || n <= 0)) return null;
  return parts as [number, number, number];
}

/** "1220x2440" (mm) -> [1220, 2440]. Null if not exactly 2 positive numbers. */
export function parseSizeMm2(size: string): [number, number] | null {
  const parts = size.split(/x/i).map((s) => Number(s.trim()));
  if (parts.length !== 2 || parts.some((n) => !Number.isFinite(n) || n <= 0)) return null;
  return parts as [number, number];
}

export interface EffectiveUnit {
  price: number;
  unit: string;
  /** True when this price was derived from an m3 rate + parsed Size, rather than taken as-is. */
  converted: boolean;
}

/** A material priced per m3 or sqft with a parseable Size auto-converts to a $/pc rate. */
export function computeEffectiveUnit(material: Pick<Material, 'unit' | 'size' | 'currentPrice'>): EffectiveUnit {
  const unit = material.unit.trim().toLowerCase();
  if (unit === 'm3') {
    const dims = parseSizeMm(material.size);
    if (dims) {
      const [a, b, c] = dims;
      const volumeM3 = (a * b * c) / MM3_PER_M3;
      return { price: volumeM3 * material.currentPrice, unit: 'pcs', converted: true };
    }
  }
  if (unit === 'sqft') {
    const dims = parseSizeMm2(material.size);
    if (dims) {
      const [w, h] = dims;
      const areaSqft = (w * h) / MM2_PER_SQFT;
      return { price: areaSqft * material.currentPrice, unit: 'pcs', converted: true };
    }
  }
  return { price: material.currentPrice, unit: material.unit, converted: false };
}

/** A composite material's price is the live sum of quantity * component effective price
 *  over its recipe (material_components), recursing one level — recipes are flat, a
 *  composite's components are never themselves composite. A non-composite material just
 *  delegates to computeEffectiveUnit. A component id missing from materialsById is skipped
 *  (defensive, same pattern as computeProductCost's missing-material handling). */
export function computeEffectivePrice(
  material: Material,
  materialsById: Map<string, Material>,
  componentsByMaterialId: Map<string, MaterialComponent[]>,
): EffectiveUnit {
  if (!material.isComposite) return computeEffectiveUnit(material);
  const components = componentsByMaterialId.get(material.id) ?? [];
  let total = 0;
  for (const component of components) {
    const componentMaterial = materialsById.get(component.componentMaterialId);
    if (!componentMaterial) continue;
    total += component.quantity * computeEffectivePrice(componentMaterial, materialsById, componentsByMaterialId).price;
  }
  return { price: total, unit: material.unit, converted: false };
}

/** product.total_cost = SUM(bom_lines.quantity * materials.current_price) + product.labor_cost
 *  (materials priced per m3 with a parseable Size use the computed $/pc rate — see computeEffectiveUnit) */
export function computeProductCost(
  product: Pick<Product, 'laborCost'>,
  bomLines: BomLine[],
  materialsById: Map<string, Material>,
  componentsByMaterialId: Map<string, MaterialComponent[]> = new Map(),
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
    const { price } = computeEffectivePrice(material, materialsById, componentsByMaterialId);
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
