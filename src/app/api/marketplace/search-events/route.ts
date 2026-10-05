import { z } from "zod";

import { recordMarketplaceSearch } from "@/features/marketplace/data";
import { privateNoStoreHeaders } from "@/lib/http-cache";
import { createClient } from "@/lib/supabase/server";

const payloadSchema = z.object({ query: z.string().trim().min(1).max(100) });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ recorded: false }, { status: 401, headers: privateNoStoreHeaders });

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ recorded: false }, { status: 400, headers: privateNoStoreHeaders });
  const recorded = await recordMarketplaceSearch(supabase, parsed.data.query);
  return Response.json({ recorded }, { status: recorded ? 200 : 503, headers: privateNoStoreHeaders });
}
