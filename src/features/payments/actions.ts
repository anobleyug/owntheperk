"use server";

import { redirect } from "next/navigation";

import { offerListingIdSchema } from "@/features/offers/schema";
import { publicEnv } from "@/lib/env/client";
import { createPrivilegedClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/server";

type ReservedConversation = {
  id: string;
  status: "LOCKED" | "ACTIVE" | "COMPLETED" | "NO_AGREEMENT" | "CLOSED" | "REPORTED";
  stripe_checkout_session_id: string | null;
};

function listingError(listingId: string, code: string): never {
  redirect(`/listings/${listingId}?unlock=${code}`);
}

export async function unlockChatAction(listingId: string) {
  if (!offerListingIdSchema.safeParse(listingId).success) redirect("/search");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/listings/${listingId}`);

  const { data: conversationId, error: reserveError } = await supabase.rpc(
    "reserve_chat_conversation",
    { target_listing_id: listingId },
  );
  if (reserveError || typeof conversationId !== "string") listingError(listingId, "unavailable");

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, status, stripe_checkout_session_id")
    .eq("id", conversationId)
    .maybeSingle<ReservedConversation>();
  if (conversationError || !conversation) listingError(listingId, "error");
  if (conversation.status !== "LOCKED") redirect(`/messages/${conversation.id}`);

  if (conversation.stripe_checkout_session_id) {
    const existing = await stripe.checkout.sessions.retrieve(conversation.stripe_checkout_session_id);
    if (existing.status === "open" && existing.url) redirect(existing.url);
    if (existing.status === "complete") redirect(`/messages/${conversation.id}?payment=processing`);
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: conversation.id,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: 199,
        product_data: {
          name: "Unlock private conversation",
          description: "One-time platform fee for access to this conversation.",
        },
      },
    }],
    metadata: {
      listing_id: listingId,
      buyer_user_id: user.id,
    },
    payment_intent_data: {
      metadata: {
        conversation_id: conversation.id,
        listing_id: listingId,
        buyer_user_id: user.id,
      },
    },
    success_url: `${publicEnv.NEXT_PUBLIC_APP_URL}/messages/${conversation.id}?payment=success`,
    cancel_url: `${publicEnv.NEXT_PUBLIC_APP_URL}/listings/${listingId}?unlock=cancelled`,
  }, {
    idempotencyKey: `chat-unlock-${conversation.id}`,
  });

  if (!checkout.url) listingError(listingId, "error");

  const admin = createPrivilegedClient();
  const { error: attachError } = await admin
    .from("conversations")
    .update({ stripe_checkout_session_id: checkout.id })
    .eq("id", conversation.id)
    .eq("status", "LOCKED")
    .is("stripe_checkout_session_id", null);
  if (attachError) listingError(listingId, "error");

  await admin.from("platform_payments").upsert({
    user_id: user.id,
    conversation_id: conversation.id,
    amount: 199,
    currency: "usd",
    stripe_checkout_session_id: checkout.id,
    status: "PENDING",
  }, { onConflict: "stripe_checkout_session_id", ignoreDuplicates: true });

  redirect(checkout.url);
}
