import type { CardStatus } from "@/features/cards/types";

export type RewardType = "STATEMENT_CREDIT" | "CASH_BACK" | "PERCENT_BACK" | "POINTS" | "OTHER";
export type CanonicalOfferStatus = "ACTIVE" | "INACTIVE" | "EXPIRED";
export type OfferVerificationStatus = "DRAFT" | "PENDING" | "VERIFIED" | "REJECTED" | "NEEDS_REVIEW" | "EXPIRED";
export type OfferListingStatus = "DRAFT" | "PENDING_VERIFICATION" | "ACTIVE" | "PAUSED" | "EXPIRED" | "REMOVED";
export type EvidenceStatus = "PENDING" | "VERIFIED" | "REJECTED" | "NEEDS_REVIEW";

export type MerchantDTO = { id: string; name: string; slug: string; category: string | null };
export type CanonicalOfferDTO = {
  id: string;
  merchantId: string;
  title: string;
  description: string;
  requiredSpend: number;
  rewardAmount: number;
  rewardType: RewardType;
  expirationDate: string;
  status: CanonicalOfferStatus;
};
export type OfferCardOptionDTO = { id: string; nickname: string; issuer: string; status: CardStatus };

export type PrivateOfferListingDTO = {
  id: string;
  offerId: string;
  cardId: string;
  merchantId: string;
  title: string;
  description: string;
  requiredSpend: number;
  rewardAmount: number;
  rewardType: RewardType;
  expirationDate: string;
  minSpend: number;
  askAmount: number | null;
  isObo: boolean;
  verificationStatus: OfferVerificationStatus;
  listingStatus: OfferListingStatus;
  verificationTimestamp: string | null;
  createdAt: string;
  updatedAt: string;
  merchantName: string;
  cardNickname: string;
  cardIssuer: string;
  evidence: { id: string; status: EvidenceStatus } | null;
};

// This boundary intentionally excludes card/evidence IDs, card labels, and internal trust data.
export type PublicOfferListingDTO = {
  id: string;
  merchantName: string;
  offerTitle: string;
  rewardAmount: number;
  rewardType: RewardType;
  minSpend: number;
  askAmount: number;
  isObo: boolean;
  expirationDate: string;
  username: string;
  ratingAverage: number;
  ratingCount: number;
  verificationStatus: "VERIFIED";
};
