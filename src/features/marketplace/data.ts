import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { RewardType } from "@/features/offers/types";
import { MARKETPLACE_COLUMNS } from "./public-listing-fields";
import type {
  MarketplaceFilters,
  MarketplaceListingDTO,
  MarketplaceOfferDTO,
  MarketplaceOfferListingsResultDTO,
  MerchantSummaryDTO,
} from "./types";

const PAGE_SIZE = 12;
const OFFER_LISTINGS_PAGE_SIZE = 50;
type MarketplaceRow = {
  listing_id: string; offer_id: string; merchant_id: string; merchant_name: string; merchant_slug: string; offer_title: string;
  offer_description: string; public_issuer: string | null; public_card_product: string | null;
  reward_amount: number | string; reward_type: RewardType;
  canonical_spend_requirement: number | string; min_spend: number | string; ask_amount: number | string;
  is_obo: boolean; expiration_date: string;
  seller_rating_average: number | string; seller_rating_count: number;
  seller_completed_interaction_count: number; seller_response_rate: number | string | null;
  seller_response_bucket: MarketplaceListingDTO["sellerResponseBucket"];
  seller_activity_status: MarketplaceListingDTO["sellerActivityStatus"];
  seller_availability_status: MarketplaceListingDTO["sellerAvailabilityStatus"];
  verification_badge: true; created_at: string;
};

type MarketplaceOfferRow = {
  offer_id: string; merchant_id: string; merchant_name: string; merchant_slug: string;
  offer_title: string; offer_description: string; public_issuer: string | null;
  public_card_product: string | null; reward_amount: number | string; reward_type: RewardType;
  canonical_spend_requirement: number | string; expiration_date: string;
  active_listing_count: number | string; lowest_ask: number | string;
  lowest_min_spend: number | string; highest_rating: number | string;
  latest_listing_at: string; total_count?: number | string;
};

function mapMarketplaceRow(row: MarketplaceRow): MarketplaceListingDTO {
  return {
    listingId: row.listing_id,
    offerId: row.offer_id,
    merchantId: row.merchant_id,
    merchantName: row.merchant_name,
    merchantSlug: row.merchant_slug,
    offerTitle: row.offer_title,
    offerDescription: row.offer_description,
    publicIssuer: row.public_issuer,
    publicCardProduct: row.public_card_product,
    rewardAmount: Number(row.reward_amount),
    rewardType: row.reward_type,
    canonicalSpendRequirement: Number(row.canonical_spend_requirement),
    minSpend: Number(row.min_spend),
    askAmount: Number(row.ask_amount),
    isObo: row.is_obo,
    expirationDate: row.expiration_date,
    sellerRatingAverage: Number(row.seller_rating_average),
    sellerRatingCount: row.seller_rating_count,
    sellerCompletedInteractionCount: row.seller_completed_interaction_count,
    sellerResponseRate: row.seller_response_rate === null ? null : Number(row.seller_response_rate),
    sellerResponseBucket: row.seller_response_bucket,
    sellerActivityStatus: row.seller_activity_status,
    sellerAvailabilityStatus: row.seller_availability_status,
    verificationBadge: true,
    createdAt: row.created_at,
  };
}

function mapMarketplaceOfferRow(row: MarketplaceOfferRow): MarketplaceOfferDTO {
  return {
    offerId: row.offer_id,
    merchantId: row.merchant_id,
    merchantName: row.merchant_name,
    merchantSlug: row.merchant_slug,
    offerTitle: row.offer_title,
    offerDescription: row.offer_description,
    publicIssuer: row.public_issuer,
    publicCardProduct: row.public_card_product,
    rewardAmount: Number(row.reward_amount),
    rewardType: row.reward_type,
    canonicalSpendRequirement: Number(row.canonical_spend_requirement),
    expirationDate: row.expiration_date,
    activeListingCount: Number(row.active_listing_count),
    lowestAsk: Number(row.lowest_ask),
    lowestMinSpend: Number(row.lowest_min_spend),
    highestRating: Number(row.highest_rating),
    latestListingAt: row.latest_listing_at,
  };
}

export async function searchMarketplaceOffers(supabase: SupabaseClient, filters: MarketplaceFilters) {
  const { data, error } = await supabase.rpc("search_marketplace_offers", {
    p_query: filters.q ?? null,
    p_issuer: filters.issuer ?? null,
    p_card_product: filters.cardProduct ?? null,
    p_max_required_spend: filters.maxRequiredSpend ?? null,
    p_min_reward: filters.minReward ?? null,
    p_expires_after: filters.expiresAfter ?? null,
    p_max_ask: filters.maxAsk ?? null,
    p_max_min_spend: filters.maxMinSpend ?? null,
    p_obo_only: filters.oboOnly,
    p_min_rating: filters.minRating ?? null,
    p_sort: filters.sort,
    p_page: filters.page,
    p_page_size: PAGE_SIZE,
  });
  if (error) throw new Error("Unable to search marketplace listings.");
  const rows = (data ?? []) as MarketplaceOfferRow[];
  return {
    offers: rows.map(mapMarketplaceOfferRow),
    total: rows.length ? Number(rows[0]?.total_count ?? 0) : 0,
    pageSize: PAGE_SIZE,
  };
}

export async function getMarketplaceOfferListings(
  supabase: SupabaseClient,
  offerId: string,
  page: number,
): Promise<MarketplaceOfferListingsResultDTO | null> {
  const from = (page - 1) * OFFER_LISTINGS_PAGE_SIZE;
  const [offerResult, listingsResult] = await Promise.all([
    supabase.rpc("get_marketplace_offer", { p_offer_id: offerId }).maybeSingle<MarketplaceOfferRow>(),
    supabase.from("marketplace_listings").select(MARKETPLACE_COLUMNS, { count: "exact" })
      .eq("offer_id", offerId)
      .order("ask_amount")
      .order("created_at", { ascending: false })
      .range(from, from + OFFER_LISTINGS_PAGE_SIZE - 1),
  ]);
  if (offerResult.error || listingsResult.error) throw new Error("Unable to load offer listings.");
  if (!offerResult.data) return null;
  return {
    offer: mapMarketplaceOfferRow(offerResult.data),
    listings: ((listingsResult.data ?? []) as MarketplaceRow[]).map(mapMarketplaceRow),
    total: listingsResult.count ?? 0,
    page,
    pageSize: OFFER_LISTINGS_PAGE_SIZE,
  };
}

export async function getMarketplaceListing(supabase: SupabaseClient, listingId: string) {
  const { data, error } = await supabase.from("marketplace_listings").select(MARKETPLACE_COLUMNS)
    .eq("listing_id", listingId).maybeSingle<MarketplaceRow>();
  if (error || !data) return null;
  return mapMarketplaceRow(data);
}

export async function getActiveMerchantSummaries(supabase: SupabaseClient): Promise<MerchantSummaryDTO[]> {
  const { data, error } = await supabase.from("merchants")
    .select("id, name, slug, category")
    .eq("status", "ACTIVE")
    .order("name")
    .limit(200);
  if (error) throw new Error("Unable to load merchants.");
  return (data ?? []) as MerchantSummaryDTO[];
}

export async function recordMarketplaceSearch(supabase: SupabaseClient, query: string) {
  const { error } = await supabase.rpc("record_marketplace_search", { search_query: query });
  return !error;
}
