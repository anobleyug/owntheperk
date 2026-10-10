import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { CanonicalOfferDTO, CanonicalOfferStatus, EvidenceStatus, ListingFeeStatus, MerchantDTO, OfferCardOptionDTO, OfferListingStatus, OfferVerificationStatus, PrivateOfferListingDTO, RewardType } from "./types";

type ListingRow = {
  id: string; offer_id: string; card_id: string; min_spend: number | string;
  ask_amount: number | string | null; is_obo: boolean; verification_status: OfferVerificationStatus;
  verification_timestamp: string | null; listing_status: OfferListingStatus; created_at: string; updated_at: string;
};
type CanonicalOfferRow = {
  id: string; merchant_id: string; title: string; description: string; required_spend: number | string;
  reward_amount: number | string; reward_type: RewardType; expiration_date: string; status: CanonicalOfferStatus;
};
type CardRow = { id: string; nickname: string; issuer: string; status: OfferCardOptionDTO["status"] };
type EvidenceRow = { id: string; offer_listing_id: string; status: EvidenceStatus };
type ListingFeeRow = { offer_listing_id: string; status: ListingFeeStatus };

const LISTING_COLUMNS = "id, offer_id, card_id, min_spend, ask_amount, is_obo, verification_status, verification_timestamp, listing_status, created_at, updated_at";
const OFFER_COLUMNS = "id, merchant_id, title, description, required_spend, reward_amount, reward_type, expiration_date, status";

function mapCanonicalOffer(row: CanonicalOfferRow): CanonicalOfferDTO {
  return { id: row.id, merchantId: row.merchant_id, title: row.title, description: row.description,
    requiredSpend: Number(row.required_spend), rewardAmount: Number(row.reward_amount), rewardType: row.reward_type,
    expirationDate: row.expiration_date, status: row.status };
}

export async function getOfferListingFormOptions(supabase: SupabaseClient, userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const [cardsResult, merchantsResult, offersResult] = await Promise.all([
    supabase.from("credit_card_profiles").select("id, nickname, issuer, status").eq("user_id", userId).eq("status", "ACTIVE").order("nickname"),
    supabase.from("merchants").select("id, name, slug, category").eq("status", "ACTIVE").order("name"),
    supabase.from("offers").select(OFFER_COLUMNS).eq("status", "ACTIVE").gte("expiration_date", today).order("expiration_date"),
  ]);
  if (cardsResult.error || merchantsResult.error || offersResult.error) throw new Error("Unable to load listing form options.");
  return {
    cards: (cardsResult.data ?? []) as OfferCardOptionDTO[],
    merchants: (merchantsResult.data ?? []) as MerchantDTO[],
    offers: ((offersResult.data ?? []) as CanonicalOfferRow[]).map(mapCanonicalOffer),
  };
}

export async function getPrivateOfferListings(supabase: SupabaseClient, userId: string): Promise<PrivateOfferListingDTO[]> {
  const [listingsResult, cardsResult, offersResult, merchantsResult, evidenceResult, paymentsResult] = await Promise.all([
    supabase.from("offer_listings").select(LISTING_COLUMNS).eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("credit_card_profiles").select("id, nickname, issuer, status").eq("user_id", userId),
    supabase.from("offers").select(OFFER_COLUMNS),
    supabase.from("merchants").select("id, name, slug, category"),
    supabase.from("offer_listing_verifications").select("id, offer_listing_id, status").eq("user_id", userId),
    supabase.from("platform_payments").select("offer_listing_id, status").eq("user_id", userId).eq("payment_type", "LISTING_FEE"),
  ]);
  if (listingsResult.error || cardsResult.error || offersResult.error || merchantsResult.error || evidenceResult.error || paymentsResult.error) {
    throw new Error("Unable to load your private offer listings.");
  }
  const cards = new Map(((cardsResult.data ?? []) as CardRow[]).map((row) => [row.id, row]));
  const offers = new Map(((offersResult.data ?? []) as CanonicalOfferRow[]).map((row) => [row.id, row]));
  const merchants = new Map(((merchantsResult.data ?? []) as MerchantDTO[]).map((row) => [row.id, row]));
  const evidence = new Map(((evidenceResult.data ?? []) as EvidenceRow[]).map((row) => [row.offer_listing_id, row]));
  const listingFees = new Map(((paymentsResult.data ?? []) as ListingFeeRow[]).map((row) => [row.offer_listing_id, row.status]));

  return ((listingsResult.data ?? []) as ListingRow[]).flatMap((listing) => {
    const offer = offers.get(listing.offer_id);
    if (!offer) return [];
    const card = cards.get(listing.card_id);
    const merchant = merchants.get(offer.merchant_id);
    const evidenceRow = evidence.get(listing.id);
    return [{
      id: listing.id, offerId: listing.offer_id, cardId: listing.card_id, merchantId: offer.merchant_id,
      title: offer.title, description: offer.description, requiredSpend: Number(offer.required_spend),
      rewardAmount: Number(offer.reward_amount), rewardType: offer.reward_type, expirationDate: offer.expiration_date,
      offerStatus: offer.status,
      minSpend: Number(listing.min_spend), askAmount: listing.ask_amount === null ? null : Number(listing.ask_amount),
      isObo: listing.is_obo, verificationStatus: listing.verification_status,
      verificationTimestamp: listing.verification_timestamp, listingStatus: listing.listing_status,
      createdAt: listing.created_at, updatedAt: listing.updated_at, merchantName: merchant?.name ?? "Unavailable merchant",
      cardNickname: card?.nickname ?? "Removed card", cardIssuer: card?.issuer ?? "",
      evidence: evidenceRow ? { id: evidenceRow.id, status: evidenceRow.status } : null,
      listingFeeStatus: listingFees.get(listing.id) ?? null,
    }];
  });
}

export async function getPrivateOfferListing(supabase: SupabaseClient, userId: string, listingId: string) {
  const listings = await getPrivateOfferListings(supabase, userId);
  return listings.find((listing) => listing.id === listingId) ?? null;
}
