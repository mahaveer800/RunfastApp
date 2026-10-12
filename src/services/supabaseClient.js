import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SUPABASE_URL = "https://sycerxnpexzgkvsbhitp.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_hI92CscTyTsTSXQ4T58RdA_brNlKxKd";

export const isSupabaseConfigured = () =>
  SUPABASE_URL.startsWith('https://') &&
  SUPABASE_URL.includes('.supabase.co') &&
  SUPABASE_ANON_KEY.startsWith('sb_publishable_');

let _supabase = null;

export const getSupabase = () => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!_supabase) {
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      realtime: false,
    });
  }
  return _supabase;
};

// Getter proxy so existing imports of `supabase` won't break
export const supabase = new Proxy({}, {
  get: (target, prop) => {
    const client = getSupabase();
    if (!client) return undefined;
    return client[prop];
  },
});
