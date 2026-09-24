import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  interface Window {
    __DATANEST_CONFIG__?: {
      supabaseUrl?: string;
      supabasePublishableKey?: string;
    };
  }
}

let client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;

  const runtime = typeof window !== "undefined" ? window.__DATANEST_CONFIG__ : undefined;
  const url =
    runtime?.supabaseUrl ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const key =
    runtime?.supabasePublishableKey ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "";

  if (!url || !key) {
    client = null;
    return client;
  }

  client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  return client;
}
