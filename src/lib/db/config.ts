export type SupabaseConfig = { url: string; key: string };

type SupabaseEnv = { url: string | undefined; key: string | undefined };

export function supabaseConfig(
  env: SupabaseEnv = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
): SupabaseConfig | null {
  const url = env.url?.trim();
  const key = env.key?.trim();
  if (!url || !key || !/^https:\/\/\S+$/.test(url)) return null;
  return { url, key };
}
