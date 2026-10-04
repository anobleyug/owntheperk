import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  EvidenceStatus,
  MerchantDTO,
  OfferCardOptionDTO,
  OfferListingStatus,
  OfferVerificationStatus,
  PrivateOfferDTO,
  RewardType,
} from "./types";

type OfferRow = {
  id: string;
  card_id: string;
  merchant_id: string;
  title: string;
  description: string;
  spend_requirement: number | string;
  reward_amount: number | string;
  reward_type: RewardType;
  expiration_date: string;
  verification_status: OfferVerificationStatus;
  verification_timestamp: string | null;
  listing_status: OfferListingStatus;
  created_at: string;
  updated_at: string;
};

type CardRow = {
  id: string;
  nickname: string;
  issuer: string;
  status: OfferCardOptionDTO["status"];
};

type MerchantRow = MerchantDTO;
type EvidenceRow = { id: string; offer_id: string; status: EvidenceStatus };

const OFFER_COLUMNS =
  "id, card_id, merchant_id, title, description, spend_requirement, reward_amount, reward_type, expiration_date, verification_status, verification_timestamp, listing_status, created_at, updated_at";

export async function getOfferFormOptions(supabase: SupabaseClient, userId: string) {
  const [{ data: cards, error: cardError }, { data: merchants, error: merchantError }] =
    await Promise.all([
      supabase
        .from("credit_card_profiles")
        .select("id, nickname, issuer, status")
        .eq("user_id", userId)
        .eq("status", "ACTIVE")
        .order("nickname"),
      supabase
        .from("merchants")
        .select("id, name, slug, category")
        .eq("status", "ACTIVE")
        .order("name"),
    ]);

  if (cardError || merchantError) throw new Error("Unable to load offer form options.");

  return {
    cards: (cards ?? []) as OfferCardOptionDTO[],
    merchants: (merchants ?? []) as MerchantDTO[],
  };
}

export async function getPrivateOffers(
  supabase: SupabaseClient,
  userId: string,
): Promise<PrivateOfferDTO[]> {
  const [offersResult, cardsResult, merchantsResult, evidenceResult] = await Promise.all([
    supabase.from("offers").select(OFFER_COLUMNS).eq("user_id", userId).order("created_at", {
      ascending: false,
    }),
    supabase
      .from("credit_card_profiles")
      .select("id, nickname, issuer, status")
      .eq("user_id", userId),
    supabase.from("merchants").select("id, name, slug, category").eq("status", "ACTIVE"),
    supabase.from("offer_verifications").select("id, offer_id, status").eq("user_id", userId),
  ]);

  if (offersResult.error || cardsResult.error || merchantsResult.error || evidenceResult.error) {
    throw new Error("Unable to load your private offers.");
  }

  const cards = new Map(((cardsResult.data ?? []) as CardRow[]).map((row) => [row.id, row]));
  const merchants = new Map(
    ((merchantsResult.data ?? []) as MerchantRow[]).map((row) => [row.id, row]),
  );
  const evidence = new Map(
    ((evidenceResult.data ?? []) as EvidenceRow[]).map((row) => [row.offer_id, row]),
  );

  return ((offersResult.data ?? []) as OfferRow[]).map((offer) => {
    const card = cards.get(offer.card_id);
    const merchant = merchants.get(offer.merchant_id);
    const evidenceRow = evidence.get(offer.id);
    return {
      id: offer.id,
      cardId: offer.card_id,
      merchantId: offer.merchant_id,
      title: offer.title,
      description: offer.description,
      spendRequirement: Number(offer.spend_requirement),
      rewardAmount: Number(offer.reward_amount),
      rewardType: offer.reward_type,
      expirationDate: offer.expiration_date,
      verificationStatus: offer.verification_status,
      verificationTimestamp: offer.verification_timestamp,
      listingStatus: offer.listing_status,
      createdAt: offer.created_at,
      updatedAt: offer.updated_at,
      merchantName: merchant?.name ?? "Unavailable merchant",
      cardNickname: card?.nickname ?? "Removed card",
      cardIssuer: card?.issuer ?? "",
      evidence: evidenceRow ? { id: evidenceRow.id, status: evidenceRow.status } : null,
    };
  });
}

export async function getPrivateOffer(
  supabase: SupabaseClient,
  userId: string,
  offerId: string,
) {
  const offers = await getPrivateOffers(supabase, userId);
  return offers.find((offer) => offer.id === offerId) ?? null;
}
