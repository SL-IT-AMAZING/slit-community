import { createClient } from "@supabase/supabase-js";

// Lazily create Supabase admin client to avoid build-time errors
let supabaseAdmin = null;

export function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase admin credentials not configured");
  }

  supabaseAdmin = createClient(url, serviceKey);
  return supabaseAdmin;
}
