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

async function buyerUsernames(supabase: SupabaseClient, rows: ConversationRow[], currentUserId: string) {
  const buyerIds = [...new Set(rows.filter((row) => row.seller_user_id === currentUserId).map((row) => row.buyer_user_id))];
  if (!buyerIds.length) return new Map<string, string>();
  const { data } = await supabase.from("profiles").select("id, username").in("id", buyerIds);
  return new Map((data ?? []).map((profile) => [profile.id as string, profile.username as string]));
}

function mapConversation(row: ConversationRow, currentUserId: string, buyers: Map<string, string>, unreadCount = 0): ConversationDTO {
  const isSeller = row.seller_user_id === currentUserId;
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
    otherUsername: isSeller ? (buyers.get(row.buyer_user_id) ?? "Marketplace member") : row.seller_username,
    updatedAt: row.updated_at,
    unreadCount,
  };
}

export async function getConversations(supabase: SupabaseClient, currentUserId: string) {
  const { data, error } = await supabase.from("conversations").select(CONVERSATION_COLUMNS)
    .neq("status", "LOCKED").order("updated_at", { ascending: false });
  if (error) throw new Error("Unable to load conversations.");
  const rows = (data ?? []) as ConversationRow[];
  const buyers = await buyerUsernames(supabase, rows, currentUserId);
  const ids = rows.map((row) => row.id);
  const unread = new Map<string, number>();
  if (ids.length) {
    const { data: unreadRows } = await supabase.from("messages").select("conversation_id")
      .in("conversation_id", ids).neq("sender_id", currentUserId).is("read_at", null);
    for (const row of unreadRows ?? []) unread.set(row.conversation_id, (unread.get(row.conversation_id) ?? 0) + 1);
  }
  return rows.map((row) => mapConversation(row, currentUserId, buyers, unread.get(row.id) ?? 0));
}

export async function getConversation(supabase: SupabaseClient, conversationId: string, currentUserId: string) {
  const { data, error } = await supabase.from("conversations").select(CONVERSATION_COLUMNS)
    .eq("id", conversationId).maybeSingle<ConversationRow>();
  if (error || !data) return null;
  const buyers = await buyerUsernames(supabase, [data], currentUserId);
  return mapConversation(data, currentUserId, buyers);
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
