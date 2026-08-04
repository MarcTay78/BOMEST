import type { BomLine, ListKind, ListOption, Material, MaterialComponent, PriceHistoryPoint, Product, Session } from '../lib/types';

export interface DataStore {
  signIn(email: string, password: string): Promise<Session>;
  signOut(): Promise<void>;
  getSession(): Promise<Session | null>;

  listMaterials(): Promise<Material[]>;
  createMaterial(input: Omit<Material, 'id' | 'updatedAt'>): Promise<Material>;
  /** Logs the pre-edit price to history, then applies newPrice. */
  updateMaterialPrice(id: string, newPrice: number): Promise<Material>;
  updateMaterial(id: string, patch: Partial<Pick<Material, 'name' | 'category' | 'item' | 'type' | 'size' | 'unit'>>): Promise<Material>;
  /** Throws DeleteBlockedError if referenced by any bom_lines or material_components row. */
  deleteMaterial(id: string): Promise<void>;
  getPriceHistory(materialId: string): Promise<PriceHistoryPoint[]>;

  /** Unscoped — the whole table, grouped client-side by materialId (small catalog, matches listMaterials/listOptions style). */
  listMaterialComponents(): Promise<MaterialComponent[]>;
  addMaterialComponent(materialId: string, componentMaterialId: string, quantity: number): Promise<MaterialComponent>;
  removeMaterialComponent(id: string): Promise<void>;

  listProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | null>;
  createProduct(input: { name: string; category: Product['category'] }): Promise<Product>;
  updateProductLabor(id: string, laborCost: number): Promise<Product>;
  updateProduct(id: string, patch: Partial<Pick<Product, 'name' | 'obsolete' | 'category'>>): Promise<Product>;
  /** Also removes the product's bom_lines (cascade). */
  deleteProduct(id: string): Promise<void>;
  uploadPhoto(productId: string, file: File): Promise<string>;

  listBomLines(productId: string): Promise<BomLine[]>;
  addBomLine(productId: string, materialId: string, quantity: number, remarks?: string): Promise<BomLine>;
  updateBomLineRemarks(id: string, remarks: string): Promise<BomLine>;
  removeBomLine(id: string): Promise<void>;

  /** The 4 self-maintained pick-lists (product category, material category/item/type). */
  listOptions(kind: ListKind): Promise<ListOption[]>;
  addOption(kind: ListKind, name: string): Promise<ListOption>;
  /** Renaming cascades: every product/material row currently using the old text is updated too. */
  renameOption(kind: ListKind, id: string, name: string): Promise<ListOption>;
  /** Throws DeleteBlockedError if any product/material row still uses this option's text. */
  deleteOption(kind: ListKind, id: string): Promise<void>;
}

export class DeleteBlockedError extends Error {
  usedByCount: number;
  constructor(usedByCount: number, noun: string = 'product') {
    super(`used in ${usedByCount} ${noun}(s)`);
    this.usedByCount = usedByCount;
  }
}
