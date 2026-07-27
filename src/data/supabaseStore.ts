import { supabase } from '../lib/supabaseClient';
import type { BomLine, Material, PriceHistoryPoint, Product, Session } from '../lib/types';
import { DeleteBlockedError, type DataStore } from './DataStore';

// Maps snake_case DB rows (see supabase/migrations/0001_init.sql) to the
// camelCase app types in src/lib/types.ts.

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured — set VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY.');
  return supabase;
}

const toMaterial = (row: any): Material => ({
  id: row.id,
  name: row.name,
  category: row.category,
  unit: row.unit,
  currentPrice: Number(row.current_price),
  updatedAt: row.updated_at,
});

const toProduct = (row: any): Product => ({
  id: row.id,
  name: row.name,
  category: row.category,
  photoUrl: row.photo_url,
  laborCost: Number(row.labor_cost),
  obsolete: row.obsolete,
  createdAt: row.created_at,
});

const toBomLine = (row: any): BomLine => ({
  id: row.id,
  productId: row.product_id,
  materialId: row.material_id,
  quantity: Number(row.quantity),
});

const toHistoryPoint = (row: any): PriceHistoryPoint => ({
  id: row.id,
  materialId: row.material_id,
  oldPrice: Number(row.old_price),
  changedAt: row.changed_at,
});

async function resolveRole(userId: string): Promise<Session['role']> {
  const client = requireClient();
  const { data, error } = await client.from('profiles').select('role').eq('id', userId).single();
  if (error) throw error;
  return data.role as Session['role'];
}

export const supabaseStore: DataStore = {
  async signIn(email, password) {
    const client = requireClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.user) throw new Error('Invalid email or password.');
    const role = await resolveRole(data.user.id);
    return { email: data.user.email ?? email, role };
  },
  async signOut() {
    await requireClient().auth.signOut();
  },
  async getSession() {
    const client = requireClient();
    const { data } = await client.auth.getSession();
    const user = data.session?.user;
    if (!user) return null;
    const role = await resolveRole(user.id);
    return { email: user.email ?? '', role };
  },

  async listMaterials() {
    const { data, error } = await requireClient().from('materials').select('*').order('current_price', { ascending: false });
    if (error) throw error;
    return data.map(toMaterial);
  },
  async createMaterial(input) {
    const { data, error } = await requireClient()
      .from('materials')
      .insert({ name: input.name, category: input.category, unit: input.unit, current_price: input.currentPrice })
      .select()
      .single();
    if (error) throw error;
    return toMaterial(data);
  },
  async updateMaterialPrice(id, newPrice) {
    const client = requireClient();
    const { data: current, error: readError } = await client.from('materials').select('current_price').eq('id', id).single();
    if (readError) throw readError;
    const { error: historyError } = await client
      .from('material_price_history')
      .insert({ material_id: id, old_price: current.current_price });
    if (historyError) throw historyError;
    const { data, error } = await client
      .from('materials')
      .update({ current_price: newPrice, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return toMaterial(data);
  },
  async updateMaterial(id, patch) {
    const { data, error } = await requireClient().from('materials').update(patch).eq('id', id).select().single();
    if (error) throw error;
    return toMaterial(data);
  },
  async deleteMaterial(id) {
    const client = requireClient();
    const { count, error: countError } = await client
      .from('bom_lines')
      .select('id', { count: 'exact', head: true })
      .eq('material_id', id);
    if (countError) throw countError;
    if (count && count > 0) throw new DeleteBlockedError(count);
    const { error } = await client.from('materials').delete().eq('id', id);
    if (error) throw error;
  },
  async getPriceHistory(materialId) {
    const { data, error } = await requireClient()
      .from('material_price_history')
      .select('*')
      .eq('material_id', materialId)
      .order('changed_at', { ascending: true });
    if (error) throw error;
    return data.map(toHistoryPoint);
  },

  async listProducts() {
    const { data, error } = await requireClient().from('products').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data.map(toProduct);
  },
  async getProduct(id) {
    const { data, error } = await requireClient().from('products').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toProduct(data) : null;
  },
  async createProduct(input) {
    const { data, error } = await requireClient()
      .from('products')
      .insert({ name: input.name, category: input.category, labor_cost: 0 })
      .select()
      .single();
    if (error) throw error;
    return toProduct(data);
  },
  async updateProductLabor(id, laborCost) {
    const { data, error } = await requireClient().from('products').update({ labor_cost: laborCost }).eq('id', id).select().single();
    if (error) throw error;
    return toProduct(data);
  },
  async updateProduct(id, patch) {
    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.obsolete !== undefined) dbPatch.obsolete = patch.obsolete;
    const { data, error } = await requireClient().from('products').update(dbPatch).eq('id', id).select().single();
    if (error) throw error;
    return toProduct(data);
  },
  async deleteProduct(id) {
    const { error } = await requireClient().from('products').delete().eq('id', id);
    if (error) throw error;
  },
  async uploadPhoto(productId, file) {
    const client = requireClient();
    const path = `${productId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await client.storage.from('product-photos').upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data: publicUrl } = client.storage.from('product-photos').getPublicUrl(path);
    const { error } = await client.from('products').update({ photo_url: publicUrl.publicUrl }).eq('id', productId);
    if (error) throw error;
    return publicUrl.publicUrl;
  },

  async listBomLines(productId) {
    const { data, error } = await requireClient().from('bom_lines').select('*').eq('product_id', productId);
    if (error) throw error;
    return data.map(toBomLine);
  },
  async addBomLine(productId, materialId, quantity) {
    const { data, error } = await requireClient()
      .from('bom_lines')
      .insert({ product_id: productId, material_id: materialId, quantity })
      .select()
      .single();
    if (error) throw error;
    return toBomLine(data);
  },
  async removeBomLine(id) {
    const { error } = await requireClient().from('bom_lines').delete().eq('id', id);
    if (error) throw error;
  },
};
