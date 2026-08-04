import type { BomLine, ListKind, ListOption, Material, MaterialComponent, PriceHistoryPoint, Product, Session } from '../lib/types';
import { DeleteBlockedError, type DataStore } from './DataStore';

// ponytail: in-memory only, resets on reload. Swap to supabaseStore by setting
// VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY in .env — see src/data/index.ts.

const MOCK_USERS: Record<string, { password: string; role: Session['role'] }> = {
  'maria@bomest.co': { password: 'bomest123', role: 'admin' },
  'viewer@bomest.co': { password: 'bomest123', role: 'viewer' },
};
const SESSION_KEY = 'bomest_mock_session';

let materials: Material[] = [
  { id: 'm1', name: 'Oak Lumber', category: 'Wood', item: 'Lumber', type: 'S4S', size: '', unit: 'm3', currentPrice: 850, isComposite: false, updatedAt: '2026-07-12' },
  { id: 'm2', name: 'Walnut Lumber', category: 'Wood', item: 'Lumber', type: 'S4S', size: '', unit: 'm3', currentPrice: 1450, isComposite: false, updatedAt: '2026-07-12' },
  { id: 'm3', name: 'Maple Lumber', category: 'Wood', item: 'Lumber', type: 'RBW', size: '', unit: 'm3', currentPrice: 980, isComposite: false, updatedAt: '2026-06-28' },
  { id: 'm4', name: 'Steel Bracket', category: 'Hardware', item: 'Bracket', type: '', size: '', unit: 'pcs', currentPrice: 2.1, isComposite: false, updatedAt: '2026-07-03' },
  { id: 'm5', name: 'Wood Screw 40mm', category: 'Hardware', item: 'Screw', type: '', size: '40mm', unit: 'pcs', currentPrice: 0.08, isComposite: false, updatedAt: '2026-07-03' },
  { id: 'm6', name: 'Danish Oil Finish', category: 'Finish', item: 'Oil', type: '', size: '', unit: 'L', currentPrice: 18.5, isComposite: false, updatedAt: '2026-05-20' },
  { id: 'm7', name: 'Felt Pads', category: 'Packaging', item: 'Pads', type: '', size: '', unit: 'pcs', currentPrice: 0.35, isComposite: false, updatedAt: '2026-06-02' },
  { id: 'm8', name: 'Corrugated Box — Large', category: 'Packaging', item: 'Box', type: '', size: 'Large', unit: 'pcs', currentPrice: 4.2, isComposite: false, updatedAt: '2026-06-02' },
];

let priceHistory: PriceHistoryPoint[] = [
  { id: 'h1', materialId: 'm1', oldPrice: 720, changedAt: '2026-01-15' },
  { id: 'h2', materialId: 'm1', oldPrice: 760, changedAt: '2026-03-10' },
  { id: 'h3', materialId: 'm1', oldPrice: 800, changedAt: '2026-05-08' },
  { id: 'h4', materialId: 'm1', oldPrice: 820, changedAt: '2026-07-01' },
];

let products: Product[] = [
  { id: 'p1', name: 'Oslo Dining Table', category: 'table', photoUrl: null, laborCost: 120, obsolete: false, createdAt: '2026-01-05' },
  { id: 'p2', name: 'Windsor Side Chair', category: 'chair', photoUrl: null, laborCost: 45, obsolete: false, createdAt: '2026-01-05' },
  { id: 'p3', name: 'Nordic Extendable Table', category: 'table', photoUrl: null, laborCost: 150, obsolete: false, createdAt: '2026-02-01' },
  { id: 'p4', name: 'Harper Ladder-Back Chair', category: 'chair', photoUrl: null, laborCost: 38, obsolete: false, createdAt: '2026-02-01' },
  { id: 'p5', name: 'Farmhouse Bench Table', category: 'table', photoUrl: null, laborCost: 95, obsolete: false, createdAt: '2026-03-01' },
  { id: 'p6', name: 'Café Chair', category: 'chair', photoUrl: null, laborCost: 0, obsolete: false, createdAt: '2026-03-01' },
];

let materialComponents: MaterialComponent[] = [];

let bomLines: BomLine[] = [
  { id: 'b1', productId: 'p1', materialId: 'm1', quantity: 0.18, remarks: '' },
  { id: 'b2', productId: 'p1', materialId: 'm6', quantity: 0.4, remarks: '' },
  { id: 'b3', productId: 'p1', materialId: 'm8', quantity: 1, remarks: '' },
  { id: 'b4', productId: 'p2', materialId: 'm2', quantity: 0.03, remarks: '' },
  { id: 'b5', productId: 'p2', materialId: 'm4', quantity: 4, remarks: '' },
  { id: 'b6', productId: 'p2', materialId: 'm5', quantity: 12, remarks: '' },
  { id: 'b7', productId: 'p2', materialId: 'm7', quantity: 4, remarks: '' },
  { id: 'b8', productId: 'p3', materialId: 'm1', quantity: 0.24, remarks: '' },
  { id: 'b9', productId: 'p3', materialId: 'm4', quantity: 2, remarks: '' },
  { id: 'b10', productId: 'p3', materialId: 'm6', quantity: 0.5, remarks: '' },
  { id: 'b11', productId: 'p3', materialId: 'm8', quantity: 1, remarks: '' },
  { id: 'b12', productId: 'p4', materialId: 'm3', quantity: 0.025, remarks: '' },
  { id: 'b13', productId: 'p4', materialId: 'm5', quantity: 10, remarks: '' },
  { id: 'b14', productId: 'p4', materialId: 'm7', quantity: 4, remarks: '' },
  { id: 'b15', productId: 'p5', materialId: 'm1', quantity: 0.15, remarks: '' },
  { id: 'b16', productId: 'p5', materialId: 'm6', quantity: 0.3, remarks: '' },
  { id: 'b17', productId: 'p5', materialId: 'm8', quantity: 1, remarks: '' },
];

let lists: Record<ListKind, ListOption[]> = {
  product_categories: [
    { id: 'pc1', name: 'table' },
    { id: 'pc2', name: 'chair' },
  ],
  material_categories: [
    { id: 'mc1', name: 'Wood' },
    { id: 'mc2', name: 'Hardware' },
    { id: 'mc3', name: 'Finish' },
    { id: 'mc4', name: 'Packaging' },
    { id: 'mc5', name: 'White Parts' },
    { id: 'mc6', name: 'Cushion Seat' },
  ],
  material_items: [
    { id: 'mi1', name: 'Lumber' },
    { id: 'mi2', name: 'Bracket' },
    { id: 'mi3', name: 'Screw' },
    { id: 'mi4', name: 'Oil' },
    { id: 'mi5', name: 'Pads' },
    { id: 'mi6', name: 'Box' },
    { id: 'mi7', name: 'Back Leg' },
    { id: 'mi8', name: 'Foams' },
  ],
  material_types: [
    { id: 'mt1', name: 'RBW' },
    { id: 'mt2', name: 'S4S' },
  ],
};

let nextId = 100;
const newId = (prefix: string) => `${prefix}${nextId++}`;
const today = () => new Date().toISOString().slice(0, 10);

const OPTION_FIELD: Record<ListKind, { array: 'products' | 'materials'; field: string }> = {
  product_categories: { array: 'products', field: 'category' },
  material_categories: { array: 'materials', field: 'category' },
  material_items: { array: 'materials', field: 'item' },
  material_types: { array: 'materials', field: 'type' },
};

function usageCount(kind: ListKind, name: string): number {
  const { array, field } = OPTION_FIELD[kind];
  const rows: any[] = array === 'products' ? products : materials;
  return rows.filter((r) => r[field] === name).length;
}

function cascadeRename(kind: ListKind, oldName: string, newName: string) {
  const { array, field } = OPTION_FIELD[kind];
  if (array === 'products') {
    products = products.map((p) => ((p as any)[field] === oldName ? { ...p, [field]: newName } : p));
  } else {
    materials = materials.map((m) => ((m as any)[field] === oldName ? { ...m, [field]: newName } : m));
  }
}

export const mockStore: DataStore = {
  async signIn(email, password) {
    const user = MOCK_USERS[email.toLowerCase()];
    if (!user || user.password !== password) throw new Error('Invalid email or password.');
    const session: Session = { email, role: user.role };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },
  async signOut() {
    sessionStorage.removeItem(SESSION_KEY);
  },
  async getSession() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  },

  async listMaterials() {
    return [...materials];
  },
  async createMaterial(input) {
    const material: Material = { ...input, id: newId('m'), updatedAt: today() };
    materials = [...materials, material];
    return material;
  },
  async updateMaterialPrice(id, newPrice) {
    const material = materials.find((m) => m.id === id);
    if (!material) throw new Error('Material not found.');
    priceHistory = [...priceHistory, { id: newId('h'), materialId: id, oldPrice: material.currentPrice, changedAt: today() }];
    const updated = { ...material, currentPrice: newPrice, updatedAt: today() };
    materials = materials.map((m) => (m.id === id ? updated : m));
    return updated;
  },
  async updateMaterial(id, patch) {
    const material = materials.find((m) => m.id === id);
    if (!material) throw new Error('Material not found.');
    const updated = { ...material, ...patch, updatedAt: today() };
    materials = materials.map((m) => (m.id === id ? updated : m));
    return updated;
  },
  async deleteMaterial(id) {
    const bomCount = bomLines.filter((l) => l.materialId === id).length;
    const componentCount = materialComponents.filter((c) => c.componentMaterialId === id).length;
    const usedByCount = bomCount + componentCount;
    if (usedByCount > 0) throw new DeleteBlockedError(usedByCount);
    materials = materials.filter((m) => m.id !== id);
  },
  async getPriceHistory(materialId) {
    return priceHistory.filter((h) => h.materialId === materialId).sort((a, b) => a.changedAt.localeCompare(b.changedAt));
  },

  async listMaterialComponents() {
    return [...materialComponents];
  },
  async addMaterialComponent(materialId, componentMaterialId, quantity) {
    const component: MaterialComponent = { id: newId('mc'), materialId, componentMaterialId, quantity };
    materialComponents = [...materialComponents, component];
    return component;
  },
  async removeMaterialComponent(id) {
    materialComponents = materialComponents.filter((c) => c.id !== id);
  },

  async listProducts() {
    return [...products];
  },
  async getProduct(id) {
    return products.find((p) => p.id === id) ?? null;
  },
  async createProduct(input) {
    const product: Product = { ...input, id: newId('p'), photoUrl: null, laborCost: 0, obsolete: false, createdAt: today() };
    products = [...products, product];
    return product;
  },
  async updateProductLabor(id, laborCost) {
    const product = products.find((p) => p.id === id);
    if (!product) throw new Error('Product not found.');
    const updated = { ...product, laborCost };
    products = products.map((p) => (p.id === id ? updated : p));
    return updated;
  },
  async updateProduct(id, patch) {
    const product = products.find((p) => p.id === id);
    if (!product) throw new Error('Product not found.');
    const updated = { ...product, ...patch };
    products = products.map((p) => (p.id === id ? updated : p));
    return updated;
  },
  async deleteProduct(id) {
    products = products.filter((p) => p.id !== id);
    bomLines = bomLines.filter((l) => l.productId !== id);
  },
  async uploadPhoto(productId, file) {
    const url = URL.createObjectURL(file);
    products = products.map((p) => (p.id === productId ? { ...p, photoUrl: url } : p));
    return url;
  },

  async listBomLines(productId) {
    return bomLines.filter((l) => l.productId === productId);
  },
  async addBomLine(productId, materialId, quantity, remarks = '') {
    const line: BomLine = { id: newId('b'), productId, materialId, quantity, remarks };
    bomLines = [...bomLines, line];
    return line;
  },
  async updateBomLineRemarks(id, remarks) {
    const line = bomLines.find((l) => l.id === id);
    if (!line) throw new Error('BOM line not found.');
    const updated = { ...line, remarks };
    bomLines = bomLines.map((l) => (l.id === id ? updated : l));
    return updated;
  },
  async removeBomLine(id) {
    bomLines = bomLines.filter((l) => l.id !== id);
  },

  async listOptions(kind) {
    return [...lists[kind]].sort((a, b) => a.name.localeCompare(b.name));
  },
  async addOption(kind, name) {
    const trimmed = name.trim();
    const existing = lists[kind].find((o) => o.name === trimmed);
    if (existing) return existing;
    const option: ListOption = { id: newId('o'), name: trimmed };
    lists = { ...lists, [kind]: [...lists[kind], option] };
    return option;
  },
  async renameOption(kind, id, name) {
    const option = lists[kind].find((o) => o.id === id);
    if (!option) throw new Error('Not found.');
    const trimmed = name.trim();
    const oldName = option.name;
    const updated = { ...option, name: trimmed };
    lists = { ...lists, [kind]: lists[kind].map((o) => (o.id === id ? updated : o)) };
    if (oldName !== trimmed) cascadeRename(kind, oldName, trimmed);
    return updated;
  },
  async deleteOption(kind, id) {
    const option = lists[kind].find((o) => o.id === id);
    if (!option) return;
    const count = usageCount(kind, option.name);
    if (count > 0) throw new DeleteBlockedError(count, kind === 'product_categories' ? 'product' : 'material');
    lists = { ...lists, [kind]: lists[kind].filter((o) => o.id !== id) };
  },
};
