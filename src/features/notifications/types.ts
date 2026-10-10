export type NotificationType =
  | "NEW_MESSAGE"
  | "CHAT_UNLOCKED"
  | "LISTING_APPROVED"
  | "LISTING_REJECTED"
  | "NEW_RATING"
  | "MERCHANT_LISTING"
  | "REPORT_RESOLVED"
  | "REPORT_DISMISSED"
  | "SAVED_OFFER_NEW_LISTING"
  | "SAVED_OFFER_LOWER_ASK"
  | "SAVED_OFFER_EXPIRING_SOON"
  | "SAVED_OFFER_NO_LISTINGS"
  | "SAVED_OFFER_UNAVAILABLE";

export type NotificationDTO = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedListingId: string | null;
  relatedConversationId: string | null;
  offerId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type FollowMerchantState = {
  status: "idle" | "success" | "error";
  message?: string;
  following: boolean;
};
