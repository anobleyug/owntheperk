import { getMarketplaceListing } from "@/features/marketplace/data";
import { offerListingIdSchema } from "@/features/offers/schema";
import { privateNoStoreHeaders, publicMarketplaceCacheHeaders } from "@/lib/http-cache";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!offerListingIdSchema.safeParse(id).success) {
    return Response.json({ error: "Not found." }, { status: 404, headers: privateNoStoreHeaders });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401, headers: privateNoStoreHeaders });

  const listing = await getMarketplaceListing(supabase, id);
  if (!listing) return Response.json({ error: "Not found." }, { status: 404, headers: privateNoStoreHeaders });
  return Response.json(listing, { headers: publicMarketplaceCacheHeaders });
}
