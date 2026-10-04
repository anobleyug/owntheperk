"use client";

import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env/client";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  browserClient ??= createBrowserClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  return browserClient;
}
