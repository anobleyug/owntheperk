import { getSavedOfferIds } from "@/features/saved-offers/data";
import { privateNoStoreHeaders } from "@/lib/http-cache";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401, headers: privateNoStoreHeaders });
  try {
    return Response.json(await getSavedOfferIds(supabase, user.id), { headers: privateNoStoreHeaders });
  } catch {
    return Response.json({ error: "Unable to load saved offers." }, { status: 503, headers: privateNoStoreHeaders });
  }
}
