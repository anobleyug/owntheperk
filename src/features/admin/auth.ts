import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "./types";

export async function getCurrentRole(supabase: SupabaseClient, userId: string): Promise<AppRole> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle<{ role: AppRole }>();
  return data?.role ?? "USER";
}

export async function isCurrentUserAdmin(supabase: SupabaseClient, userId: string) {
  return (await getCurrentRole(supabase, userId)) === "ADMIN";
}

export async function canCurrentUserModerate(supabase: SupabaseClient, userId: string) {
  return ["MODERATOR", "ADMIN"].includes(await getCurrentRole(supabase, userId));
}
