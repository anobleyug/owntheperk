import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ConversationStatus } from "@/features/messages/types";
import type { OfferListingStatus, OfferVerificationStatus } from "@/features/offers/types";
import type {
  HistoryConversationDTO,
  HistoryListingDTO,
  HistoryPages,
  HistoryPaymentDTO,
  PaginatedHistory,
} from "./types";

export const HISTORY_PAGE_SIZE = 10;

type ConversationRow = {
  id: string;
  listing_id: string;
  status: Exclude<ConversationStatus, "LOCKED">;
  merchant_name: string;
  offer_title: string;
  min_spend: number | string;
  ask_amount: number | string;
  is_obo: boolean;
  updated_at: string;
};

type ListingRow = {
  id: string;
  offer_id: string;
  min_spend: number | string;
  ask_amount: number | string | null;
  is_obo: boolean;
  listing_status: OfferListingStatus;
  verification_status: OfferVerificationStatus;
  created_at: string;
};

type OfferRow = { id: string; merchant_id: string; title: string };
type MerchantRow = { id: string; name: string };

type PaymentRow = {
  id: string;
  payment_type: "LISTING_FEE" | "CHAT_UNLOCK";
  amount: number;
  currency: string;
  conversation_id: string | null;
  offer_listing_id: string | null;
  created_at: string;
};

type SafeOfferContext = { merchantName: string; offerTitle: string };

function pageRange(page: number) {
  const from = (page - 1) * HISTORY_PAGE_SIZE;
  return { from, to: from + HISTORY_PAGE_SIZE - 1 };
}

async function getListingOfferContexts(
  supabase: SupabaseClient,
  listings: Array<Pick<ListingRow, "id" | "offer_id">>,
) {
  const offerIds = [...new Set(listings.map((listing) => listing.offer_id))];
  if (!offerIds.length) return new Map<string, SafeOfferContext>();

  const { data: offerData, error: offerError } = await supabase
    .from("offers")
    .select("id, merchant_id, title")
    .in("id", offerIds);
  if (offerError) throw new Error("Unable to load offer history.");

  const offers = (offerData ?? []) as OfferRow[];
  const merchantIds = [...new Set(offers.map((offer) => offer.merchant_id))];
  const { data: merchantData, error: merchantError } = merchantIds.length
    ? await supabase.from("merchants").select("id, name").in("id", merchantIds)
    : { data: [], error: null };
  if (merchantError) throw new Error("Unable to load merchant history.");

  const merchants = new Map(
    ((merchantData ?? []) as MerchantRow[]).map((merchant) => [merchant.id, merchant.name]),
  );
  const offersById = new Map(offers.map((offer) => [offer.id, offer]));

  return new Map(
    listings.flatMap((listing) => {
      const offer = offersById.get(listing.offer_id);
      if (!offer) return [];
      return [[listing.id, {
        merchantName: merchants.get(offer.merchant_id) ?? "Unavailable merchant",
        offerTitle: offer.title,
      }] as const];
    }),
  );
}

async function getConversationHistory(
  supabase: SupabaseClient,
  userId: string,
  statuses: Array<Exclude<ConversationStatus, "LOCKED">>,
  page: number,
  includeRatingStatus = false,
): Promise<PaginatedHistory<HistoryConversationDTO>> {
  const { from, to } = pageRange(page);
  const { data, error, count } = await supabase
    .from("participant_conversations")
    .select(
      "id, listing_id, status, merchant_name, offer_title, min_spend, ask_amount, is_obo, updated_at",
      { count: "exact" },
    )
    .in("status", statuses)
    .order("updated_at", { ascending: false })
    .range(from, to);
  if (error) throw new Error("Unable to load interaction history.");

  const rows = (data ?? []) as ConversationRow[];
  const ratedIds = new Set<string>();
  if (includeRatingStatus && rows.length) {
    const { data: ratingData, error: ratingError } = await supabase
      .from("ratings")
      .select("conversation_id")
      .eq("reviewer_id", userId)
      .in("conversation_id", rows.map((row) => row.id));
    if (ratingError) throw new Error("Unable to load rating history.");
    for (const rating of ratingData ?? []) ratedIds.add(rating.conversation_id);
  }

  return {
    items: rows.map((row) => ({
      id: row.id,
      listingId: row.listing_id,
      merchantName: row.merchant_name,
      offerTitle: row.offer_title,
      minSpend: Number(row.min_spend),
      askAmount: Number(row.ask_amount),
      isObo: row.is_obo,
      status: row.status,
      date: row.updated_at,
      ratingStatus: includeRatingStatus ? (ratedIds.has(row.id) ? "RATED" : "AVAILABLE") : null,
    })),
    total: count ?? 0,
    page,
    pageSize: HISTORY_PAGE_SIZE,
  };
}

async function getListingHistory(
  supabase: SupabaseClient,
  userId: string,
  page: number,
): Promise<PaginatedHistory<HistoryListingDTO>> {
  const { from, to } = pageRange(page);
  const { data, error, count } = await supabase
    .from("offer_listings")
    .select(
      "id, offer_id, min_spend, ask_amount, is_obo, listing_status, verification_status, created_at",
      { count: "exact" },
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw new Error("Unable to load listing history.");

  const rows = (data ?? []) as ListingRow[];
  const contexts = await getListingOfferContexts(supabase, rows);
  return {
    items: rows.map((row) => {
      const context = contexts.get(row.id);
      return {
        id: row.id,
        merchantName: context?.merchantName ?? "Unavailable merchant",
        offerTitle: context?.offerTitle ?? "Unavailable offer",
        minSpend: Number(row.min_spend),
        askAmount: row.ask_amount === null ? null : Number(row.ask_amount),
        isObo: row.is_obo,
        listingStatus: row.listing_status,
        verificationStatus: row.verification_status,
        createdAt: row.created_at,
      };
    }),
    total: count ?? 0,
    page,
    pageSize: HISTORY_PAGE_SIZE,
  };
}

async function getPaymentHistory(
  supabase: SupabaseClient,
  userId: string,
  page: number,
): Promise<PaginatedHistory<HistoryPaymentDTO>> {
  const { from, to } = pageRange(page);
  const { data, error, count } = await supabase
    .from("platform_payments")
    .select(
      "id, payment_type, amount, currency, conversation_id, offer_listing_id, created_at",
      { count: "exact" },
    )
    .eq("user_id", userId)
    .eq("status", "SUCCEEDED")
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw new Error("Unable to load platform fee history.");

  const rows = (data ?? []) as PaymentRow[];
  const listingIds = rows.flatMap((row) => row.offer_listing_id ? [row.offer_listing_id] : []);
  const conversationIds = rows.flatMap((row) => row.conversation_id ? [row.conversation_id] : []);

  const [listingResult, conversationResult] = await Promise.all([
    listingIds.length
      ? supabase.from("offer_listings").select("id, offer_id").in("id", listingIds)
      : Promise.resolve({ data: [], error: null }),
    conversationIds.length
      ? supabase.from("participant_conversations")
        .select("id, listing_id, merchant_name, offer_title")
        .in("id", conversationIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (listingResult.error || conversationResult.error) {
    throw new Error("Unable to load platform fee context.");
  }

  const paymentListings = (listingResult.data ?? []) as Array<Pick<ListingRow, "id" | "offer_id">>;
  const listingContexts = await getListingOfferContexts(supabase, paymentListings);
  const conversationContexts = new Map(
    ((conversationResult.data ?? []) as Array<{
      id: string;
      listing_id: string;
      merchant_name: string;
      offer_title: string;
    }>).map((conversation) => [conversation.id, conversation]),
  );

  return {
    items: rows.map((row) => {
      const conversation = row.conversation_id
        ? conversationContexts.get(row.conversation_id)
        : undefined;
      const listing = row.offer_listing_id
        ? listingContexts.get(row.offer_listing_id)
        : undefined;
      return {
        id: row.id,
        paymentType: row.payment_type,
        amount: row.amount,
        currency: row.currency,
        merchantName: conversation?.merchant_name ?? listing?.merchantName ?? null,
        offerTitle: conversation?.offer_title ?? listing?.offerTitle ?? null,
        conversationId: row.conversation_id,
        listingId: row.offer_listing_id ?? conversation?.listing_id ?? null,
        createdAt: row.created_at,
      };
    }),
    total: count ?? 0,
    page,
    pageSize: HISTORY_PAGE_SIZE,
  };
}

export async function getInteractionHistory(
  supabase: SupabaseClient,
  userId: string,
  pages: HistoryPages,
) {
  const [active, completed, closed, listings, fees] = await Promise.all([
    getConversationHistory(supabase, userId, ["ACTIVE", "REPORTED"], pages.active),
    getConversationHistory(supabase, userId, ["COMPLETED"], pages.completed, true),
    getConversationHistory(supabase, userId, ["CLOSED", "NO_AGREEMENT"], pages.closed),
    getListingHistory(supabase, userId, pages.listings),
    getPaymentHistory(supabase, userId, pages.fees),
  ]);

  return { active, completed, closed, listings, fees };
}

