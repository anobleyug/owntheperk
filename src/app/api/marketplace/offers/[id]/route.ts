import { getMarketplaceOfferListings } from "@/features/marketplace/data";
import { parseOfferListingsPage } from "@/features/marketplace/schema";
import { offerListingIdSchema } from "@/features/offers/schema";
import { privateNoStoreHeaders, publicMarketplaceCacheHeaders } from "@/lib/http-cache";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!offerListingIdSchema.safeParse(id).success) {
    return Response.json({ error: "Not found." }, { status: 404, headers: privateNoStoreHeaders });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401, headers: privateNoStoreHeaders });

  const page = parseOfferListingsPage(new URL(request.url).searchParams.get("page") ?? undefined);
  try {
    const result = await getMarketplaceOfferListings(supabase, id, page);
    if (!result) return Response.json({ error: "Not found." }, { status: 404, headers: privateNoStoreHeaders });
    return Response.json(result, { headers: publicMarketplaceCacheHeaders });
  } catch {
    return Response.json({ error: "Unable to load offer listings." }, { status: 503, headers: privateNoStoreHeaders });
  }
}
