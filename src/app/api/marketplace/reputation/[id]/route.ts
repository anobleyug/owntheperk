import { z } from "zod";

import { getPublicProfile } from "@/features/profiles/data";
import { getPublicReviews, REVIEWS_PAGE_SIZE } from "@/features/trust/data";
import { privateNoStoreHeaders, publicMarketplaceCacheHeaders } from "@/lib/http-cache";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    return Response.json({ error: "Not found." }, { status: 404, headers: privateNoStoreHeaders });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401, headers: privateNoStoreHeaders });

  const rawPage = new URL(request.url).searchParams.get("page") ?? "1";
  const page = Math.max(1, Number.parseInt(rawPage, 10) || 1);
  try {
    const [profile, reviewResult] = await Promise.all([
      getPublicProfile(supabase, id),
      getPublicReviews(supabase, id, page),
    ]);
    if (!profile?.username) return Response.json({ error: "Not found." }, { status: 404, headers: privateNoStoreHeaders });
    return Response.json({ profile, ...reviewResult, pageSize: REVIEWS_PAGE_SIZE }, { headers: publicMarketplaceCacheHeaders });
  } catch {
    return Response.json({ error: "Unable to load reputation." }, { status: 503, headers: privateNoStoreHeaders });
  }
}
