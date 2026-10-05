"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { canCurrentUserModerate, isCurrentUserAdmin } from "./auth";

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


const moderationSchema = z.object({
  reportId: z.uuid(),
  operation: z.enum(["REVIEWING", "RESOLVED", "DISMISSED", "SUSPEND_USER", "REMOVE_LISTING"]),
});

export async function moderateReportAction(reportId: string, operation: string) {
  const parsed = moderationSchema.safeParse({ reportId, operation });
  if (!parsed.success) redirect("/admin/reports?action=error");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await canCurrentUserModerate(supabase, user.id))) redirect("/search");

  const result = parsed.data.operation === "SUSPEND_USER"
    ? await supabase.rpc("suspend_reported_user", { target_report_id: parsed.data.reportId })
    : parsed.data.operation === "REMOVE_LISTING"
      ? await supabase.rpc("remove_reported_listing", { target_report_id: parsed.data.reportId })
      : await supabase.rpc("moderate_report", { target_report_id: parsed.data.reportId, target_status: parsed.data.operation });
  if (result.error) redirect("/admin/reports?action=error");
  revalidatePath("/admin/reports");
  revalidatePath("/search");
  revalidatePath("/messages");
  redirect("/admin/reports?action=success");
}
