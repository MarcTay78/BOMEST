export type Role = 'admin' | 'viewer';

export type MaterialCategory = 'wood' | 'hardware' | 'finish' | 'packaging';
export type ProductCategory = 'table' | 'chair';

export interface Material {
  id: string;
  name: string;
  category: MaterialCategory;
  unit: string;
  currentPrice: number;
  updatedAt: string;
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
