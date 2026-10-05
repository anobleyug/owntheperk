import type { PublicProfileDTO } from "@/features/profiles/types";
import type { PublicReviewDTO } from "@/features/trust/types";
import type {
  MarketplaceFilters,
  MarketplaceListingDTO,
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
  if (filters.maxAsk !== undefined) params.set("maxAsk", String(filters.maxAsk));
  if (filters.maxMinSpend !== undefined) params.set("maxMinSpend", String(filters.maxMinSpend));
  if (filters.minReward !== undefined) params.set("minReward", String(filters.minReward));
  if (filters.oboOnly) params.set("obo", "true");
  if (filters.expiresAfter) params.set("expiresAfter", filters.expiresAfter);
  if (filters.minRating !== undefined) params.set("minRating", String(filters.minRating));
  return params;
}

export function fetchMarketplaceListings(filters: MarketplaceFilters) {
  return getJson<MarketplaceSearchResultDTO>(`/api/marketplace/listings?${marketplaceSearchParams(filters)}`);
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
