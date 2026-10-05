import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { RewardType } from "@/features/offers/types";
import type { ConversationDTO, ConversationStatus, MessageDTO } from "./types";

const CONVERSATION_COLUMNS = "id, listing_id, seller_user_id, buyer_user_id, status, merchant_name, offer_title, reward_amount, reward_type, min_spend, ask_amount, is_obo, seller_username, seller_rating_average, updated_at";

type ConversationRow = {
  id: string; listing_id: string; seller_user_id: string; buyer_user_id: string;
  status: ConversationStatus; merchant_name: string; offer_title: string;
  reward_amount: number | string; reward_type: RewardType; min_spend: number | string;
  ask_amount: number | string; is_obo: boolean; seller_username: string;
  seller_rating_average: number | string; updated_at: string;
};

type MessageRow = {
  id: string; conversation_id: string; sender_id: string; content: string;
  created_at: string; read_at: string | null;
};

type PublicProfileRow = {
  id: string;
  username: string;
  rating_average: number | string;
  rating_count: number;
  completed_interaction_count: number;
};

async function participantProfiles(supabase: SupabaseClient, rows: ConversationRow[]) {
  const ids = [...new Set(rows.flatMap((row) => [row.seller_user_id, row.buyer_user_id]))];
  if (!ids.length) return new Map<string, PublicProfileRow>();
  const { data } = await supabase.from("public_profiles")
    .select("id, username, rating_average, rating_count, completed_interaction_count").in("id", ids);
  return new Map(((data ?? []) as PublicProfileRow[]).map((profile) => [profile.id, profile]));
}

function mapConversation(row: ConversationRow, currentUserId: string, profiles: Map<string, PublicProfileRow>, unreadCount = 0): ConversationDTO {
  const isSeller = row.seller_user_id === currentUserId;
  const otherUserId = isSeller ? row.buyer_user_id : row.seller_user_id;
  const otherProfile = profiles.get(otherUserId);
  return {
    id: row.id,
    listingId: row.listing_id,
    status: row.status,
    merchantName: row.merchant_name,
    offerTitle: row.offer_title,
    rewardAmount: Number(row.reward_amount),
    rewardType: row.reward_type,
    minSpend: Number(row.min_spend),
    askAmount: Number(row.ask_amount),
    isObo: row.is_obo,
    sellerUsername: row.seller_username,
    sellerRatingAverage: Number(row.seller_rating_average),
    isSeller,
    otherUserId,
    otherUsername: otherProfile?.username ?? (!isSeller ? row.seller_username : "Marketplace member"),
    otherRatingAverage: otherProfile ? Number(otherProfile.rating_average) : (!isSeller ? Number(row.seller_rating_average) : 0),
    otherRatingCount: otherProfile?.rating_count ?? 0,
    otherCompletedInteractionCount: otherProfile?.completed_interaction_count ?? 0,
    updatedAt: row.updated_at,
    unreadCount,
  };
}

export async function getConversations(supabase: SupabaseClient, currentUserId: string) {
  const { data, error } = await supabase.from("conversations").select(CONVERSATION_COLUMNS)
    .neq("status", "LOCKED").order("updated_at", { ascending: false });
  if (error) throw new Error("Unable to load conversations.");
  const rows = (data ?? []) as ConversationRow[];
  const profiles = await participantProfiles(supabase, rows);
  const ids = rows.map((row) => row.id);
  const unread = new Map<string, number>();
  if (ids.length) {
    const { data: unreadRows } = await supabase.from("messages").select("conversation_id")
      .in("conversation_id", ids).neq("sender_id", currentUserId).is("read_at", null);
    for (const row of unreadRows ?? []) unread.set(row.conversation_id, (unread.get(row.conversation_id) ?? 0) + 1);
  }
  return rows.map((row) => mapConversation(row, currentUserId, profiles, unread.get(row.id) ?? 0));
}

export async function getConversation(supabase: SupabaseClient, conversationId: string, currentUserId: string) {
  const { data, error } = await supabase.from("conversations").select(CONVERSATION_COLUMNS)
    .eq("id", conversationId).maybeSingle<ConversationRow>();
  if (error || !data) return null;
  const profiles = await participantProfiles(supabase, [data]);
  return mapConversation(data, currentUserId, profiles);
}

export async function getMessages(supabase: SupabaseClient, conversationId: string) {
  const { data, error } = await supabase.from("messages")
    .select("id, conversation_id, sender_id, content, created_at, read_at")
    .eq("conversation_id", conversationId).order("created_at");
  if (error) throw new Error("Unable to load messages.");
  return ((data ?? []) as MessageRow[]).map((row): MessageDTO => ({
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    createdAt: row.created_at,
    readAt: row.read_at,
  }));
}
