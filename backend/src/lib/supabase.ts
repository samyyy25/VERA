import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/env';

let supabaseClient: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (supabaseClient) {
    return supabaseClient;
  }

  const { url, serviceRoleKey, anonKey } = config.supabase;
  const key = serviceRoleKey || anonKey;

  if (!url || !key || url.includes('placeholder')) {
    return null;
  }

  try {
    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return supabaseClient;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    return null;
  }
};
