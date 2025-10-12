import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

let cachedClient: SupabaseClient | null = null;

const createSupabaseClient = (): SupabaseClient | null => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    if (typeof window !== 'undefined') {
      console.warn(
        'Supabase environment variables are missing. Set VITE_SUPABASE_* or NEXT_PUBLIC_SUPABASE_* values to enable realtime sync.'
      );
    }
    return null;
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export const getSupabaseClient = (): SupabaseClient | null => {
  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = createSupabaseClient();
  return cachedClient;
};
