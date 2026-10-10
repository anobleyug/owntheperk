import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { RewardType } from "@/features/offers/types";
import type { SavedOfferDTO } from "./types";

type SavedOfferRow = {
  saved_offer_id: string;
  offer_id: string;
  merchant_id: string;
  merchant_name: string;
  offer_title: string;
  reward_amount: number | string;
  reward_type: RewardType;
  canonical_spend_requirement: number | string;
  expiration_date: string;
  offer_status: SavedOfferDTO["offerStatus"];
  active_listing_count: number | string;
  lowest_ask: number | string | null;
  saved_at: string;
};

export async function getSavedOfferIds(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.from("saved_offers").select("offer_id")
    .eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load saved offers.");
  return (data ?? []).map((row) => row.offer_id as string);
}

export async function isOfferSaved(supabase: SupabaseClient, userId: string, offerId: string) {
  const { data, error } = await supabase.from("saved_offers").select("id")
    .eq("user_id", userId).eq("offer_id", offerId).maybeSingle();
  if (error) throw new Error("Unable to load saved offer status.");
  return Boolean(data);
}

export async function getSavedOffers(supabase: SupabaseClient): Promise<SavedOfferDTO[]> {
  const { data, error } = await supabase.rpc("get_saved_offers");
  if (error) throw new Error("Unable to load saved offers.");
  return ((data ?? []) as SavedOfferRow[]).map((row) => ({
    savedOfferId: row.saved_offer_id,
    offerId: row.offer_id,
    merchantId: row.merchant_id,
    merchantName: row.merchant_name,
    offerTitle: row.offer_title,
    rewardAmount: Number(row.reward_amount),
    rewardType: row.reward_type,
    canonicalSpendRequirement: Number(row.canonical_spend_requirement),
    expirationDate: row.expiration_date,
    offerStatus: row.offer_status,
    activeListingCount: Number(row.active_listing_count),
    lowestAsk: row.lowest_ask === null ? null : Number(row.lowest_ask),
    savedAt: row.saved_at,
  }));
}
