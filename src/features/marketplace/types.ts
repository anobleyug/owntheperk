import type { RewardType } from "@/features/offers/types";

export const MARKETPLACE_SORTS = ["lowest_ask", "highest_reward", "lowest_min_spend", "highest_rated", "newest", "expiring_soon"] as const;
export type MarketplaceSort = (typeof MARKETPLACE_SORTS)[number];

export type MarketplaceListingDTO = {
  listingId: string;
  offerId: string;
  merchantId: string;
  merchantName: string;
  merchantSlug: string;
  offerTitle: string;
  offerDescription: string;
  publicIssuer: string | null;
  publicCardProduct: string | null;
  rewardAmount: number;
  rewardType: RewardType;
  canonicalSpendRequirement: number;
  minSpend: number;
  askAmount: number;
  isObo: boolean;
  expirationDate: string;
  sellerRatingAverage: number;
  sellerRatingCount: number;
  sellerCompletedInteractionCount: number;
  sellerResponseRate: number | null;
  sellerResponseBucket: "WITHIN_ONE_HOUR" | "WITHIN_FEW_HOURS" | "WITHIN_ONE_DAY" | "OVER_ONE_DAY" | null;
  sellerActivityStatus: "ACTIVE_NOW" | "ACTIVE_TODAY" | null;
  sellerAvailabilityStatus: "AVAILABLE" | "TEMPORARILY_UNAVAILABLE";
  verificationBadge: true;
  createdAt: string;
};

export type MarketplaceOfferDTO = {
  offerId: string;
  merchantId: string;
  merchantName: string;
  merchantSlug: string;
  offerTitle: string;
  offerDescription: string;
  publicIssuer: string | null;
  publicCardProduct: string | null;
  rewardAmount: number;
  rewardType: RewardType;
  canonicalSpendRequirement: number;
  expirationDate: string;
  activeListingCount: number;
  lowestAsk: number;
  lowestMinSpend: number;
  highestRating: number;
  latestListingAt: string;
};

export type MarketplaceFilters = {
  q?: string;
  issuer?: string;
  cardProduct?: string;
  maxRequiredSpend?: number;
  maxAsk?: number;
  maxMinSpend?: number;
  minReward?: number;
  oboOnly: boolean;
  expiresAfter?: string;
  minRating?: number;
  sort: MarketplaceSort;
  page: number;
};

export type MarketplaceSearchResultDTO = {
  offers: MarketplaceOfferDTO[];
  total: number;
  pageSize: number;
};

export type MarketplaceOfferListingsResultDTO = {
  offer: MarketplaceOfferDTO;
  listings: MarketplaceListingDTO[];
  total: number;
  page: number;
  pageSize: number;
};

export type MerchantSummaryDTO = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
};
