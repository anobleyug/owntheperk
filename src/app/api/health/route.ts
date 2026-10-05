import { getServerEnv } from "@/lib/env/server";
import { logServerEvent } from "@/lib/server-logger";
import { createPrivilegedClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    getServerEnv();
    const admin = createPrivilegedClient();
    const { error } = await admin.from("merchants")
      .select("id", { count: "exact", head: true })
      .abortSignal(AbortSignal.timeout(3_000));
    if (error) throw new Error("dependency unavailable");
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    logServerEvent("error", "health_check_failed");
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "10" } },
    );
  }
}

export async function HEAD() {
  const response = await GET();
  return new Response(null, { status: response.status, headers: response.headers });
}
