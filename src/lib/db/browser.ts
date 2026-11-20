import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config.ts";

export function browserSupabase(): SupabaseClient | null {
  const config = supabaseConfig();
  return config ? createBrowserClient(config.url, config.key) : null;
}
