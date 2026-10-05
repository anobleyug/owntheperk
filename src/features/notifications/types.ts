export type NotificationType =
  | "NEW_MESSAGE"
  | "CHAT_UNLOCKED"
  | "LISTING_APPROVED"
  | "LISTING_REJECTED"
  | "NEW_RATING"
  | "MERCHANT_LISTING"
  | "REPORT_RESOLVED"
  | "REPORT_DISMISSED";

export type NotificationDTO = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedListingId: string | null;
  relatedConversationId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type FollowMerchantState = {
  status: "idle" | "success" | "error";
  message?: string;
  following: boolean;
};
