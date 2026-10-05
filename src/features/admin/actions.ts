"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "./auth";

const reviewSchema = z.object({
  listingId: z.uuid(),
  decision: z.enum(["APPROVE", "REJECT", "NEEDS_REVIEW"]),
});

export async function reviewOfferListingAction(listingId: string, decision: string) {
  const parsed = reviewSchema.safeParse({ listingId, decision });
  if (!parsed.success) redirect("/admin/verifications?review=error");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isCurrentUserAdmin(supabase, user.id))) redirect("/search");

  const { error } = await supabase.rpc("review_offer_listing", {
    target_listing_id: parsed.data.listingId,
    review_decision: parsed.data.decision,
  });
  if (error) redirect("/admin/verifications?review=error");

  revalidatePath("/admin/verifications");
  revalidatePath("/search");
  revalidatePath("/listings/" + parsed.data.listingId);
  redirect("/admin/verifications?review=success");
}
