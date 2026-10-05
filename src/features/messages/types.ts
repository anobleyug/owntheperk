import type { RewardType } from "@/features/offers/types";

export type ConversationStatus = "LOCKED" | "ACTIVE" | "COMPLETED" | "NO_AGREEMENT" | "CLOSED" | "REPORTED";

export type ConversationDTO = {
  id: string;
  listingId: string;
  status: ConversationStatus;
  merchantName: string;
  offerTitle: string;
  rewardAmount: number;
  rewardType: RewardType;
  minSpend: number;
  askAmount: number;
  isObo: boolean;
  sellerUsername: string;
  sellerRatingAverage: number;
  isSeller: boolean;
  otherUsername: string;
  updatedAt: string;
  unreadCount: number;
};

export type MessageDTO = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
};
