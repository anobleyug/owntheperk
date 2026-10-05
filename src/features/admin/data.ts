import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { EvidenceStatus, RewardType } from "@/features/offers/types";
import type { AdminVerificationDTO } from "./types";

type ListingRow = {
  id: string; offer_id: string; user_id: string; min_spend: number | string;
  ask_amount: number | string | null; is_obo: boolean; updated_at: string;
};
type OfferRow = {
  id: string; merchant_id: string; title: string; description: string;
  required_spend: number | string; reward_amount: number | string;
  reward_type: RewardType; expiration_date: string;
};
type EvidenceRow = { offer_listing_id: string; status: EvidenceStatus };

export async function getPendingVerifications(supabase: SupabaseClient): Promise<AdminVerificationDTO[]> {
  const { data: listingData, error: listingError } = await supabase.from("offer_listings")
    .select("id, offer_id, user_id, min_spend, ask_amount, is_obo, updated_at")
    .eq("verification_status", "PENDING").eq("listing_status", "PENDING_VERIFICATION")
    .order("updated_at", { ascending: true });
  if (listingError) throw new Error("Unable to load pending verifications.");
  const listings = (listingData ?? []) as ListingRow[];
  if (!listings.length) return [];

  const offerIds = [...new Set(listings.map((listing) => listing.offer_id))];
  const userIds = [...new Set(listings.map((listing) => listing.user_id))];
  const listingIds = listings.map((listing) => listing.id);
  const [offersResult, merchantsResult, profilesResult, evidenceResult] = await Promise.all([
    supabase.from("offers").select("id, merchant_id, title, description, required_spend, reward_amount, reward_type, expiration_date").in("id", offerIds),
    supabase.from("merchants").select("id, name"),
    supabase.from("profiles").select("id, username").in("id", userIds),
    supabase.from("offer_listing_verifications").select("offer_listing_id, status").in("offer_listing_id", listingIds),
  ]);
  if (offersResult.error || merchantsResult.error || profilesResult.error || evidenceResult.error) {
    throw new Error("Unable to load verification details.");
  }

  const offers = new Map(((offersResult.data ?? []) as OfferRow[]).map((offer) => [offer.id, offer]));
  const merchants = new Map(((merchantsResult.data ?? []) as { id: string; name: string }[]).map((merchant) => [merchant.id, merchant.name]));
  const profiles = new Map(((profilesResult.data ?? []) as { id: string; username: string | null }[]).map((profile) => [profile.id, profile.username]));
  const evidence = new Map(((evidenceResult.data ?? []) as EvidenceRow[]).map((row) => [row.offer_listing_id, row]));

  return listings.flatMap((listing) => {
    const offer = offers.get(listing.offer_id);
    const evidenceRow = evidence.get(listing.id);
    if (!offer || !evidenceRow || listing.ask_amount === null) return [];
    return [{
      listingId: listing.id,
      merchantName: merchants.get(offer.merchant_id) ?? "Unavailable merchant",
      offerTitle: offer.title,
      offerDescription: offer.description,
      requiredSpend: Number(offer.required_spend),
      rewardAmount: Number(offer.reward_amount),
      rewardType: offer.reward_type,
      expirationDate: offer.expiration_date,
      minSpend: Number(listing.min_spend),
      askAmount: Number(listing.ask_amount),
      isObo: listing.is_obo,
      sellerUsername: profiles.get(listing.user_id) ?? "Unknown member",
      evidenceStatus: evidenceRow.status,
      submittedAt: listing.updated_at,
    }];
  });
}
