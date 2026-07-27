import type { BomLine, Material, PriceHistoryPoint, Product, Session } from '../lib/types';

export interface DataStore {
  signIn(email: string, password: string): Promise<Session>;
  signOut(): Promise<void>;
  getSession(): Promise<Session | null>;

  listMaterials(): Promise<Material[]>;
  createMaterial(input: Omit<Material, 'id' | 'updatedAt'>): Promise<Material>;
  /** Logs the pre-edit price to history, then applies newPrice. */
  updateMaterialPrice(id: string, newPrice: number): Promise<Material>;
  updateMaterial(id: string, patch: Partial<Pick<Material, 'name' | 'category' | 'unit'>>): Promise<Material>;
  /** Throws DeleteBlockedError if referenced by any bom_lines row. */
  deleteMaterial(id: string): Promise<void>;
  getPriceHistory(materialId: string): Promise<PriceHistoryPoint[]>;

  listProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | null>;
  createProduct(input: { name: string; category: Product['category'] }): Promise<Product>;
  updateProductLabor(id: string, laborCost: number): Promise<Product>;
  uploadPhoto(productId: string, file: File): Promise<string>;

  listBomLines(productId: string): Promise<BomLine[]>;
  addBomLine(productId: string, materialId: string, quantity: number): Promise<BomLine>;
  removeBomLine(id: string): Promise<void>;
}

export class DeleteBlockedError extends Error {
  usedByCount: number;
  constructor(usedByCount: number) {
    super(`used in ${usedByCount} product(s)`);
    this.usedByCount = usedByCount;
  }
}
