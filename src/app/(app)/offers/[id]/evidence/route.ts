import { NextResponse } from "next/server";

import { EVIDENCE_BUCKET } from "@/features/offers/evidence";
import { offerListingIdSchema } from "@/features/offers/schema";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!offerListingIdSchema.safeParse(id).success) return new NextResponse("Not found", { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Not found", { status: 404 });

  const { data: evidence } = await supabase
    .from("offer_listing_verifications")
    .select("evidence_path")
    .eq("offer_listing_id", id)
    .eq("user_id", user.id)
    .maybeSingle<{ evidence_path: string }>();
  if (!evidence) return new NextResponse("Not found", { status: 404 });

  const { data: file, error } = await supabase.storage.from(EVIDENCE_BUCKET).download(evidence.evidence_path);
  if (error || !file) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(await file.arrayBuffer(), {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": "attachment; filename=offer-evidence",
      "Content-Type": file.type || "application/octet-stream",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cross-Origin-Resource-Policy": "same-origin",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
