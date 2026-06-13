import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
export const supabase = hasSupabaseEnv
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!hasSupabaseEnv) {
  console.warn("KitchenCheck Supabase env vars are missing. Supabase features are disabled.");
}
