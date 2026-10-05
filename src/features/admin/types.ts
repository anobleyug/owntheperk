import type { EvidenceStatus, RewardType } from "@/features/offers/types";
import type { ReportReason, ReportStatus } from "@/features/trust/types";

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

export type AdminReportDTO = {
  id: string;
  reportedUserId: string;
  conversationId: string | null;
  offerListingId: string | null;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  createdAt: string;
  reporterUsername: string;
  reportedUsername: string;
  reportedAccountStatus: "ACTIVE" | "SUSPENDED" | "BANNED";
  contextMerchantName: string | null;
  contextOfferTitle: string | null;
};

export type MerchantAnalyticsDTO = {
  merchantId: string;
  merchantName: string;
  count: number;
};

export type AdminAnalyticsDTO = {
  totalUsers: number;
  activeUsers: number;
  activeVerifiedListings: number;
  pendingVerifications: number;
  completedInteractions: number;
  chatUnlockCount: number;
  platformRevenueCents: number;
  openReports: number;
  listingToChatConversion: number;
  repeatBuyerCount: number;
  topMerchantsByListings: MerchantAnalyticsDTO[];
  topMerchantsBySearches: MerchantAnalyticsDTO[];
};
