import type { EvidenceStatus, RewardType } from "@/features/offers/types";

export type AppRole = "USER" | "MODERATOR" | "ADMIN";
export type ReviewDecision = "APPROVE" | "REJECT" | "NEEDS_REVIEW";

export type AdminVerificationDTO = {
  listingId: string;
  merchantName: string;
  offerTitle: string;
  offerDescription: string;
  requiredSpend: number;
  rewardAmount: number;
  rewardType: RewardType;
  expirationDate: string;
  minSpend: number;
  askAmount: number;
  isObo: boolean;
  sellerUsername: string;
  evidenceStatus: EvidenceStatus;
  submittedAt: string;
};
