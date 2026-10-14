import type { ConversationStatus } from "@/features/messages/types";
import type { OfferListingStatus, OfferVerificationStatus } from "@/features/offers/types";

export type HistoryConversationDTO = {
  id: string;
  listingId: string;
  merchantName: string;
  offerTitle: string;
  minSpend: number;
  askAmount: number;
  isObo: boolean;
  status: Exclude<ConversationStatus, "LOCKED">;
  date: string;
  ratingStatus: "RATED" | "AVAILABLE" | null;
};

export type HistoryListingDTO = {
  id: string;
  merchantName: string;
  offerTitle: string;
  minSpend: number;
  askAmount: number | null;
  isObo: boolean;
  listingStatus: OfferListingStatus;
  verificationStatus: OfferVerificationStatus;
  createdAt: string;
};

export type HistoryPaymentDTO = {
  id: string;
  paymentType: "LISTING_FEE" | "CHAT_UNLOCK";
  amount: number;
  currency: string;
  merchantName: string | null;
  offerTitle: string | null;
  conversationId: string | null;
  listingId: string | null;
  createdAt: string;
};

export type PaginatedHistory<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type HistoryPages = {
  active: number;
  completed: number;
  closed: number;
  listings: number;
  fees: number;
};

