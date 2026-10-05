import type { RewardType } from "@/features/offers/types";

export const MARKETPLACE_SORTS = ["lowest_ask", "highest_reward", "lowest_min_spend", "highest_rated", "newest", "expiring_soon"] as const;
export type MarketplaceSort = (typeof MARKETPLACE_SORTS)[number];

export type MarketplaceListingDTO = {
  listingId: string;
  merchantId: string;
  merchantName: string;
  merchantSlug: string;
  offerTitle: string;
  offerDescription: string;
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
  verificationBadge: true;
  createdAt: string;
};

export type MarketplaceFilters = {
  q?: string;
  maxAsk?: number;
  maxMinSpend?: number;
  minReward?: number;
  oboOnly: boolean;
  expiresAfter?: string;
  minRating?: number;
  sort: MarketplaceSort;
  page: number;
};
