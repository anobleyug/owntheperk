import type { CardStatus } from "@/features/cards/types";

export type RewardType =
  | "STATEMENT_CREDIT"
  | "CASH_BACK"
  | "PERCENT_BACK"
  | "POINTS"
  | "OTHER";

export type OfferVerificationStatus =
  | "DRAFT"
  | "PENDING"
  | "VERIFIED"
  | "REJECTED"
  | "NEEDS_REVIEW"
  | "EXPIRED";

export type OfferListingStatus =
  | "DRAFT"
  | "PENDING_VERIFICATION"
  | "ACTIVE"
  | "PAUSED"
  | "EXPIRED"
  | "REMOVED";

export type EvidenceStatus = "PENDING" | "VERIFIED" | "REJECTED" | "NEEDS_REVIEW";

export type MerchantDTO = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
};

export type OfferCardOptionDTO = {
  id: string;
  nickname: string;
  issuer: string;
  status: CardStatus;
};

export type PrivateOfferDTO = {
  id: string;
  cardId: string;
  merchantId: string;
  title: string;
  description: string;
  spendRequirement: number;
  rewardAmount: number;
  rewardType: RewardType;
  expirationDate: string;
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
