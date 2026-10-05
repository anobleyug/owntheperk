import { getActiveMerchantSummaries } from "@/features/marketplace/data";
import { privateNoStoreHeaders, publicMarketplaceCacheHeaders } from "@/lib/http-cache";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401, headers: privateNoStoreHeaders });

  try {
    return Response.json(await getActiveMerchantSummaries(supabase), { headers: publicMarketplaceCacheHeaders });
  } catch {
    return Response.json({ error: "Unable to load merchants." }, { status: 503, headers: privateNoStoreHeaders });
  }
}
