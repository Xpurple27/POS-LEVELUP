"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

let browserClient: SupabaseClient<Database> | undefined;

/** Lazy initialization avoids requiring runtime secrets during static builds. */
export function getSupabase(): SupabaseClient<Database> {
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new Error("Konfigurasi publik Supabase belum lengkap.");
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("URL Supabase tidak valid.");
  }
  if (!["https:", "http:"].includes(parsed.protocol))
    throw new Error("Protokol URL Supabase tidak didukung.");
  browserClient = createClient<Database>(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return browserClient;
}
