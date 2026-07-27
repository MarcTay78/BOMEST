import { isSupabaseConfigured } from '../lib/supabaseClient';
import type { DataStore } from './DataStore';
import { mockStore } from './mockStore';
import { supabaseStore } from './supabaseStore';

export const dataStore: DataStore = isSupabaseConfigured ? supabaseStore : mockStore;
export const isMockMode = !isSupabaseConfigured;

export { DeleteBlockedError } from './DataStore';
export type { DataStore } from './DataStore';
