import { searchMarketplaceListings } from "@/features/marketplace/data";
import { parseMarketplaceFilters } from "@/features/marketplace/schema";
import { privateNoStoreHeaders, publicMarketplaceCacheHeaders } from "@/lib/http-cache";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401, headers: privateNoStoreHeaders });

  const filters = parseMarketplaceFilters(Object.fromEntries(new URL(request.url).searchParams));
  try {
    return Response.json(await searchMarketplaceListings(supabase, filters), { headers: publicMarketplaceCacheHeaders });
  } catch {
    return Response.json({ error: "Unable to search marketplace listings." }, { status: 503, headers: privateNoStoreHeaders });
  }
}
