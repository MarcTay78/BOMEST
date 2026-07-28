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

/** product.total_cost = SUM(bom_lines.quantity * materials.current_price) + product.labor_cost */
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
    sums.set(category, sums.get(category)! + line.quantity * material.currentPrice);
  }

  const categoryTotals = order.map((category) => ({ category, total: sums.get(category)! }));
  const materialsCost = categoryTotals.reduce((sum, c) => sum + c.total, 0);
  return { materialsCost, laborCost: product.laborCost, total: materialsCost + product.laborCost, categoryTotals };
}

export function computeCategoryBreakdown(cost: ProductCost): CategoryBreakdown[] {
  return [
    ...cost.categoryTotals.map((c) => ({ key: c.category, label: c.category, value: c.total })),
    { key: 'labor', label: 'Labor', value: cost.laborCost },
  ];
}

export function formatCurrency(value: number): string {
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
