import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { CardStatus, PrivateCardDTO } from "./types";

type CardRow = {
  id: string;
  issuer: string;
  nickname: string;
  card_type_optional: string | null;
  last4_optional: string | null;
  status: CardStatus;
  created_at: string;
};

export async function getPrivateCards(
  supabase: SupabaseClient,
  userId: string,
): Promise<PrivateCardDTO[]> {
  const [{ data: cards, error: cardsError }, { data: offers, error: offersError }] =
    await Promise.all([
      supabase
        .from("credit_card_profiles")
        .select("id, issuer, nickname, card_type_optional, last4_optional, status, created_at")
        .eq("user_id", userId)
        .neq("status", "REMOVED")
        .order("created_at", { ascending: false }),
      supabase.from("offers").select("card_id").eq("user_id", userId),
    ]);

  if (cardsError || offersError) throw new Error("Unable to load your private cards.");

  const counts = new Map<string, number>();
  for (const offer of (offers ?? []) as { card_id: string }[]) {
    counts.set(offer.card_id, (counts.get(offer.card_id) ?? 0) + 1);
  }

  return ((cards ?? []) as CardRow[]).map((card) => ({
    id: card.id,
    issuer: card.issuer,
    nickname: card.nickname,
    cardType: card.card_type_optional,
    last4: card.last4_optional,
    status: card.status,
    createdAt: card.created_at,
    offerCount: counts.get(card.id) ?? 0,
  }));
}
