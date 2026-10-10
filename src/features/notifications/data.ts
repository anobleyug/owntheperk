import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { NotificationDTO, NotificationType } from "./types";

const NOTIFICATION_COLUMNS = "id, type, title, body, related_listing_id, related_conversation_id, offer_id, read_at, created_at";

type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  related_listing_id: string | null;
  related_conversation_id: string | null;
  offer_id: string | null;
  read_at: string | null;
  created_at: string;
};

export async function getNotifications(supabase: SupabaseClient): Promise<NotificationDTO[]> {
  const { data, error } = await supabase.from("notifications").select(NOTIFICATION_COLUMNS)
    .order("created_at", { ascending: false }).limit(50);
  if (error) throw new Error("Unable to load notifications.");
  return ((data ?? []) as NotificationRow[]).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    relatedListingId: row.related_listing_id,
    relatedConversationId: row.related_conversation_id,
    offerId: row.offer_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

export async function getUnreadNotificationCount(supabase: SupabaseClient) {
  const { count, error } = await supabase.from("notifications")
    .select("id", { count: "exact", head: true }).is("read_at", null);
  if (error) return 0;
  return count ?? 0;
}

export async function isMerchantFollowed(
  supabase: SupabaseClient,
  userId: string,
  merchantId: string,
) {
  const { data } = await supabase.from("merchant_follows").select("merchant_id")
    .eq("user_id", userId).eq("merchant_id", merchantId).maybeSingle();
  return Boolean(data);
}

export function notificationDestination(notification: NotificationDTO) {
  if (notification.relatedConversationId) return `/messages/${notification.relatedConversationId}`;
  if (["SAVED_OFFER_EXPIRING_SOON", "SAVED_OFFER_NO_LISTINGS", "SAVED_OFFER_UNAVAILABLE"].includes(notification.type)) {
    return "/profile/saved";
  }
  if (!notification.relatedListingId) return null;
  if (notification.type === "LISTING_APPROVED" || notification.type === "LISTING_REJECTED") {
    return `/offers/manage/${notification.relatedListingId}`;
  }
  return `/listings/${notification.relatedListingId}`;
}
