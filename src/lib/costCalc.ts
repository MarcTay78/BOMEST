import type { BomLine, Material, MaterialCategory, Product } from './types';

const CATEGORIES: MaterialCategory[] = ['wood', 'hardware', 'finish', 'packaging'];

export interface CategoryBreakdown {
  key: MaterialCategory | 'labor';
  label: string;
  value: number;
}

export interface ProductCost {
  materialsCost: number;
  laborCost: number;
  total: number;
  categorySums: Record<MaterialCategory, number>;
}

/** product.total_cost = SUM(bom_lines.quantity * materials.current_price) + product.labor_cost */
export function computeProductCost(
  product: Pick<Product, 'laborCost'>,
  bomLines: BomLine[],
  materialsById: Map<string, Material>,
): ProductCost {
  const categorySums: Record<MaterialCategory, number> = { wood: 0, hardware: 0, finish: 0, packaging: 0 };

  for (const line of bomLines) {
    const material = materialsById.get(line.materialId);
    if (!material) continue;
    categorySums[material.category] += line.quantity * material.currentPrice;
  }

  const materialsCost = CATEGORIES.reduce((sum, cat) => sum + categorySums[cat], 0);
  return { materialsCost, laborCost: product.laborCost, total: materialsCost + product.laborCost, categorySums };
}

const CATEGORY_LABELS: Record<MaterialCategory, string> = {
  wood: 'Wood',
  hardware: 'Hardware',
  finish: 'Finish',
  packaging: 'Packaging',
};

export function computeCategoryBreakdown(cost: ProductCost): CategoryBreakdown[] {
  return [
    ...CATEGORIES.map((key) => ({ key, label: CATEGORY_LABELS[key], value: cost.categorySums[key] })),
    { key: 'labor' as const, label: 'Labor', value: cost.laborCost },
  ];
}

export function formatCurrency(value: number): string {
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
