import type { RewardType } from "@/features/offers/types";

export type SavedOfferDTO = {
  savedOfferId: string;
  offerId: string;
  merchantId: string;
  merchantName: string;
  offerTitle: string;
  rewardAmount: number;
  rewardType: RewardType;
  canonicalSpendRequirement: number;
  expirationDate: string;
  offerStatus: "ACTIVE" | "INACTIVE" | "EXPIRED";
  activeListingCount: number;
  lowestAsk: number | null;
  savedAt: string;
};

export type SaveOfferState = {
  status: "idle" | "success" | "error";
  saved: boolean;
  message?: string;
};
