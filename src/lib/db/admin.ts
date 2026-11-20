import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config.ts";

const NO_SESSION = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

export function serverSecret(): string | null {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  return secret ? secret : null;
}

export function adminSupabase(): SupabaseClient | null {
  const config = supabaseConfig();
  const secret = serverSecret();
  return config && secret ? createClient(config.url, secret, NO_SESSION) : null;
}

export function passwordCheckSupabase(): SupabaseClient | null {
  const config = supabaseConfig();
  return config ? createClient(config.url, config.key, NO_SESSION) : null;
}
