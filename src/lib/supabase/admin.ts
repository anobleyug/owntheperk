import "server-only";

import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env/client";
import { serverEnv } from "@/lib/env/server";

/**
 * Creates a privileged client that bypasses Row Level Security.
 *
 * Keep usage inside trusted server code after explicit authorization checks.
 * User-scoped requests should use the cookie-aware client from ./server.
 */
export function createPrivilegedClient() {
  return createClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SECRET_KEY,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}
