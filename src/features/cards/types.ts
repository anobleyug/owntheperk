export type CardStatus = "ACTIVE" | "INACTIVE" | "REMOVED";

export type PrivateCardDTO = {
  id: string;
  issuer: string;
  nickname: string;
  cardType: string | null;
  last4: string | null;
  status: CardStatus;
  createdAt: string;
  listingCount: number;
};
