export type Role = 'admin' | 'viewer';

/** Free-form now — the actual allowed values live in the maintained lists (see ListKind). */
export type MaterialCategory = string;
export type ProductCategory = string;

export interface Material {
  id: string;
  name: string;
  category: MaterialCategory;
  item: string;
  type: string;
  size: string;
  unit: string;
  currentPrice: number;
  isComposite: boolean;
  isEstimate: boolean;
  updatedAt: string;
}

export interface MaterialComponent {
  id: string;
  materialId: string;
  componentMaterialId: string;
  quantity: number;
}

export interface PriceHistoryPoint {
  id: string;
  materialId: string;
  oldPrice: number;
  changedAt: string;
}

export interface BomLine {
  id: string;
  productId: string;
  materialId: string;
  quantity: number;
  remarks: string;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  photoUrl: string | null;
  laborCost: number;
  obsolete: boolean;
  createdAt: string;
}

export interface Session {
  email: string;
  role: Role;
}

/** The four self-maintained pick-lists (product category, material category/item/type). */
export type ListKind = 'product_categories' | 'material_categories' | 'material_items' | 'material_types';

export interface ListOption {
  id: string;
  name: string;
}
