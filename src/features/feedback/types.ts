export const FEEDBACK_TYPES = ["BUG", "FEEDBACK"] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export const FEEDBACK_CATEGORIES = [
  "BUG",
  "FEATURE_REQUEST",
  "USABILITY",
  "PAYMENT",
  "MARKETPLACE",
  "ACCOUNT",
  "OTHER",
] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_STATUSES = ["NEW", "REVIEWED", "CLOSED"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const feedbackCategoryLabels: Record<FeedbackCategory, string> = {
  BUG: "Bug",
  FEATURE_REQUEST: "Feature request",
  USABILITY: "Usability",
  PAYMENT: "Payment",
  MARKETPLACE: "Marketplace",
  ACCOUNT: "Account",
  OTHER: "Other",
};

