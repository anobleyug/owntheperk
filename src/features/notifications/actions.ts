"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { merchantFollowSchema, notificationIdSchema } from "./schema";
import type { FollowMerchantState, NotificationType } from "./types";

export async function setMerchantFollowAction(
  previousState: FollowMerchantState,
  formData: FormData,
): Promise<FollowMerchantState> {
  const parsed = merchantFollowSchema.safeParse({
    merchantId: formData.get("merchantId"),
    intent: formData.get("intent"),
  });
  if (!parsed.success) return { ...previousState, status: "error", message: "Invalid merchant." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ...previousState, status: "error", message: "Sign in to save merchants." };

  const { error } = parsed.data.intent === "follow"
    ? await supabase.from("merchant_follows").insert({ user_id: user.id, merchant_id: parsed.data.merchantId })
    : await supabase.from("merchant_follows").delete().eq("user_id", user.id).eq("merchant_id", parsed.data.merchantId);
  if (error && error.code !== "23505") {
    return { ...previousState, status: "error", message: "Your saved merchant could not be updated." };
  }
  const following = parsed.data.intent === "follow";
  revalidatePath("/search");
  return {
    status: "success",
    following,
    message: following ? "Merchant saved. New verified listings will appear in notifications." : "Merchant removed from saved alerts.",
  };
}

export async function markAllNotificationsReadAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  revalidatePath("/notifications");
}

export async function openNotificationAction(notificationId: string) {
  if (!notificationIdSchema.safeParse(notificationId).success) redirect("/notifications");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("notifications")
    .select("type, related_listing_id, related_conversation_id, offer_id")
    .eq("id", notificationId).maybeSingle<{
      type: NotificationType;
      related_listing_id: string | null;
      related_conversation_id: string | null;
      offer_id: string | null;
    }>();
  if (!data) redirect("/notifications");
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", notificationId);
  revalidatePath("/notifications");
  if (data.related_conversation_id) redirect(`/messages/${data.related_conversation_id}`);
  if (["SAVED_OFFER_EXPIRING_SOON", "SAVED_OFFER_NO_LISTINGS", "SAVED_OFFER_UNAVAILABLE"].includes(data.type)) {
    redirect("/profile/saved");
  }
  if (data.related_listing_id && ["LISTING_APPROVED", "LISTING_REJECTED"].includes(data.type)) {
    redirect(`/offers/manage/${data.related_listing_id}`);
  }
  if (data.related_listing_id) redirect(`/listings/${data.related_listing_id}`);
  redirect("/notifications");
}
