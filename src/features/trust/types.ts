export const REPORT_REASONS = [
  "FAKE_OFFER",
  "SCAM_ATTEMPT",
  "HARASSMENT",
  "SPAM",
  "CREDENTIAL_REQUEST",
  "STOLEN_CARD_BEHAVIOR",
  "MISLEADING_LISTING",
  "OTHER",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportStatus = "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED";

export type PublicReviewDTO = {
  id: string;
  overallScore: number;
  reviewText: string | null;
  reviewerUsername: string;
  createdAt: string;
};

export type TrustActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  submittedAt?: number;
};
