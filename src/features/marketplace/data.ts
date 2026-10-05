import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { RewardType } from "@/features/offers/types";
import type { MarketplaceFilters, MarketplaceListingDTO } from "./types";

const PAGE_SIZE = 12;
const MARKETPLACE_COLUMNS = "listing_id, merchant_name, merchant_slug, offer_title, offer_description, reward_amount, reward_type, canonical_spend_requirement, min_spend, ask_amount, is_obo, expiration_date, seller_username, seller_avatar_url, seller_rating_average, seller_rating_count, seller_completed_interaction_count, verification_badge, created_at";

type MarketplaceRow = {
  listing_id: string; merchant_name: string; merchant_slug: string; offer_title: string;
  offer_description: string; reward_amount: number | string; reward_type: RewardType;
  canonical_spend_requirement: number | string; min_spend: number | string; ask_amount: number | string;
  is_obo: boolean; expiration_date: string; seller_username: string; seller_avatar_url: string | null;
  seller_rating_average: number | string; seller_rating_count: number;
  seller_completed_interaction_count: number; verification_badge: true; created_at: string;
};

function mapMarketplaceRow(row: MarketplaceRow): MarketplaceListingDTO {
  return {
    listingId: row.listing_id,
    merchantName: row.merchant_name,
    merchantSlug: row.merchant_slug,
    offerTitle: row.offer_title,
    offerDescription: row.offer_description,
    rewardAmount: Number(row.reward_amount),
    rewardType: row.reward_type,
    canonicalSpendRequirement: Number(row.canonical_spend_requirement),
    minSpend: Number(row.min_spend),
    askAmount: Number(row.ask_amount),
    isObo: row.is_obo,
    expirationDate: row.expiration_date,
    sellerUsername: row.seller_username,
    sellerAvatarUrl: row.seller_avatar_url,
    sellerRatingAverage: Number(row.seller_rating_average),
    sellerRatingCount: row.seller_rating_count,
    sellerCompletedInteractionCount: row.seller_completed_interaction_count,
    verificationBadge: true,
    createdAt: row.created_at,
  };
}

export async function searchMarketplaceListings(supabase: SupabaseClient, filters: MarketplaceFilters) {
  let query = supabase.from("marketplace_listings").select(MARKETPLACE_COLUMNS, { count: "exact" });
  if (filters.q) query = query.ilike("merchant_name", "%" + filters.q + "%");
  if (filters.maxAsk !== undefined) query = query.lte("ask_amount", filters.maxAsk);
  if (filters.maxMinSpend !== undefined) query = query.lte("min_spend", filters.maxMinSpend);
  if (filters.minReward !== undefined) query = query.gte("reward_amount", filters.minReward);
  if (filters.oboOnly) query = query.eq("is_obo", true);
  if (filters.expiresAfter) query = query.gte("expiration_date", filters.expiresAfter);
  if (filters.minRating !== undefined) query = query.gte("seller_rating_average", filters.minRating);

  if (filters.sort === "lowest_ask") query = query.order("ask_amount").order("created_at", { ascending: false });
  else if (filters.sort === "highest_reward") query = query.order("reward_amount", { ascending: false }).order("created_at", { ascending: false });
  else if (filters.sort === "lowest_min_spend") query = query.order("min_spend").order("created_at", { ascending: false });
  else if (filters.sort === "highest_rated") query = query.order("seller_rating_average", { ascending: false }).order("created_at", { ascending: false });
  else if (filters.sort === "expiring_soon") query = query.order("expiration_date").order("created_at", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const from = (filters.page - 1) * PAGE_SIZE;
  const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) throw new Error("Unable to search marketplace listings.");
  return {
    listings: ((data ?? []) as MarketplaceRow[]).map(mapMarketplaceRow),
    total: count ?? 0,
    pageSize: PAGE_SIZE,
  };
}

export async function getMarketplaceListing(supabase: SupabaseClient, listingId: string) {
  const { data, error } = await supabase.from("marketplace_listings").select(MARKETPLACE_COLUMNS)
    .eq("listing_id", listingId).maybeSingle<MarketplaceRow>();
  if (error || !data) return null;
  return mapMarketplaceRow(data);
}
