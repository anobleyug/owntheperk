import type { PublicProfileDTO } from "@/features/profiles/types";
import type { PublicReviewDTO } from "@/features/trust/types";
import type {
  MarketplaceFilters,
  MarketplaceListingDTO,
  MarketplaceOfferListingsResultDTO,
  MarketplaceSearchResultDTO,
  MerchantSummaryDTO,
} from "./types";

export type PublicReputationResultDTO = {
  profile: PublicProfileDTO;
  reviews: PublicReviewDTO[];
  total: number;
  pageSize: number;
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) throw new Error(response.status === 404 ? "Not found" : "Unable to load marketplace data.");
  return response.json() as Promise<T>;
}

export function marketplaceSearchParams(filters: MarketplaceFilters) {
  const params = new URLSearchParams({ sort: filters.sort, page: String(filters.page) });
  if (filters.q) params.set("q", filters.q);
  if (filters.issuer) params.set("issuer", filters.issuer);
  if (filters.cardProduct) params.set("cardProduct", filters.cardProduct);
  if (filters.maxRequiredSpend !== undefined) params.set("maxRequiredSpend", String(filters.maxRequiredSpend));
  if (filters.maxAsk !== undefined) params.set("maxAsk", String(filters.maxAsk));
  if (filters.maxMinSpend !== undefined) params.set("maxMinSpend", String(filters.maxMinSpend));
  if (filters.minReward !== undefined) params.set("minReward", String(filters.minReward));
  if (filters.oboOnly) params.set("obo", "true");
  if (filters.expiresAfter) params.set("expiresAfter", filters.expiresAfter);
  if (filters.minRating !== undefined) params.set("minRating", String(filters.minRating));
  return params;
}

export function fetchMarketplaceOffers(filters: MarketplaceFilters) {
  return getJson<MarketplaceSearchResultDTO>(`/api/marketplace/offers?${marketplaceSearchParams(filters)}`);
}

export function fetchMarketplaceOfferListings(offerId: string, page: number) {
  return getJson<MarketplaceOfferListingsResultDTO>(`/api/marketplace/offers/${encodeURIComponent(offerId)}?page=${page}`);
}

export function fetchMarketplaceListing(listingId: string) {
  return getJson<MarketplaceListingDTO>(`/api/marketplace/listings/${encodeURIComponent(listingId)}`);
}

export function fetchMerchantSummaries() {
  return getJson<MerchantSummaryDTO[]>("/api/marketplace/merchants");
}

export function fetchPublicReputation(userId: string, page: number) {
  return getJson<PublicReputationResultDTO>(`/api/marketplace/reputation/${encodeURIComponent(userId)}?page=${page}`);
}
