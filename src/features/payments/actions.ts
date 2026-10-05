"use server";

import { randomUUID } from "node:crypto";

import { redirect } from "next/navigation";

import { offerListingIdSchema } from "@/features/offers/schema";
import { publicEnv } from "@/lib/env/client";
import { createPrivilegedClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

type ReservedConversation = {
  id: string;
  status: "LOCKED" | "ACTIVE" | "COMPLETED" | "NO_AGREEMENT" | "CLOSED" | "REPORTED";
  stripe_checkout_session_id: string | null;
};

type ListingFeePayment = {
  id: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
  stripe_checkout_session_id: string | null;
  checkout_attempt: number;
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

  const admin = createPrivilegedClient();
  const { data: conversation, error: conversationError } = await admin
    .from("conversations")
    .select("id, status, stripe_checkout_session_id")
    .eq("id", conversationId)
    .eq("buyer_user_id", user.id)
    .maybeSingle<ReservedConversation>();
  if (conversationError || !conversation) listingError(listingId, "error");
  if (conversation.status !== "LOCKED") redirect(`/messages/${conversation.id}`);

  const stripe = getStripe();

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
      payment_type: "CHAT_UNLOCK",
      listing_id: listingId,
      buyer_user_id: user.id,
    },
    payment_intent_data: {
      metadata: {
        conversation_id: conversation.id,
        payment_type: "CHAT_UNLOCK",
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
    payment_type: "CHAT_UNLOCK",
    amount: 199,
    currency: "usd",
    stripe_checkout_session_id: checkout.id,
    status: "PENDING",
  }, { onConflict: "stripe_checkout_session_id", ignoreDuplicates: true });

  redirect(checkout.url);
}

function listingFeeError(listingId: string, code: string): never {
  redirect(`/offers/${listingId}?listingFee=${code}`);
}

export async function payListingSubmissionFeeAction(listingId: string) {
  if (!offerListingIdSchema.safeParse(listingId).success) redirect("/offers");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/offers/${listingId}`);

  const [{ data: listing }, { data: evidence }] = await Promise.all([
    supabase.from("offer_listings")
      .select("id, verification_status, ask_amount")
      .eq("id", listingId)
      .eq("user_id", user.id)
      .maybeSingle<{ id: string; verification_status: string; ask_amount: number | null }>(),
    supabase.from("offer_listing_verifications")
      .select("id")
      .eq("offer_listing_id", listingId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (!listing || !["DRAFT", "NEEDS_REVIEW"].includes(listing.verification_status)) {
    listingFeeError(listingId, "unavailable");
  }
  if (listing.ask_amount === null || !evidence) listingFeeError(listingId, "incomplete");

  const admin = createPrivilegedClient();
  let { data: payment } = await admin.from("platform_payments")
    .select("id, status, stripe_checkout_session_id, checkout_attempt")
    .eq("offer_listing_id", listingId)
    .eq("user_id", user.id)
    .eq("payment_type", "LISTING_FEE")
    .maybeSingle<ListingFeePayment>();

  if (payment?.status === "SUCCEEDED") {
    const { error } = await supabase.rpc("submit_offer_listing_for_verification", { target_listing_id: listingId });
    if (error && !error.message.includes("not editable")) listingFeeError(listingId, "error");
    redirect(`/offers/${listingId}?listingFee=paid`);
  }

  const stripe = getStripe();
  if (payment?.stripe_checkout_session_id) {
    const existing = await stripe.checkout.sessions.retrieve(payment.stripe_checkout_session_id);
    if (existing.status === "open" && existing.url) redirect(existing.url);
    if (existing.status === "complete") redirect(`/offers/${listingId}?listingFee=processing`);

    const { data: refreshed, error: refreshError } = await admin.from("platform_payments")
      .update({
        checkout_attempt: payment.checkout_attempt + 1,
        stripe_checkout_session_id: null,
        stripe_payment_intent_id: null,
        status: "PENDING",
      })
      .eq("id", payment.id)
      .eq("status", "PENDING")
      .select("id, status, stripe_checkout_session_id, checkout_attempt")
      .single<ListingFeePayment>();
    if (refreshError || !refreshed) listingFeeError(listingId, "error");
    payment = refreshed;
  }

  if (!payment) {
    const paymentId = randomUUID();
    const { data: created, error: createError } = await admin.from("platform_payments")
      .insert({
        id: paymentId,
        user_id: user.id,
        offer_listing_id: listingId,
        payment_type: "LISTING_FEE",
        amount: 99,
        currency: "usd",
        status: "PENDING",
      })
      .select("id, status, stripe_checkout_session_id, checkout_attempt")
      .single<ListingFeePayment>();

    if (createError || !created) {
      const { data: concurrent } = await admin.from("platform_payments")
        .select("id, status, stripe_checkout_session_id, checkout_attempt")
        .eq("offer_listing_id", listingId)
        .eq("payment_type", "LISTING_FEE")
        .maybeSingle<ListingFeePayment>();
      if (!concurrent) listingFeeError(listingId, "error");
      payment = concurrent;
    } else {
      payment = created;
    }
  }

  if (payment.status === "SUCCEEDED") redirect(`/offers/${listingId}?listingFee=paid`);
  if (payment.stripe_checkout_session_id) {
    const concurrentCheckout = await stripe.checkout.sessions.retrieve(payment.stripe_checkout_session_id);
    if (concurrentCheckout.url) redirect(concurrentCheckout.url);
    listingFeeError(listingId, "processing");
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: listingId,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: 99,
        product_data: {
          name: "Submit offer listing for verification",
          description: "One-time platform fee for this listing submission.",
        },
      },
    }],
    metadata: {
      payment_type: "LISTING_FEE",
      listing_id: listingId,
      user_id: user.id,
    },
    payment_intent_data: {
      metadata: {
        payment_type: "LISTING_FEE",
        listing_id: listingId,
        user_id: user.id,
      },
    },
    success_url: `${publicEnv.NEXT_PUBLIC_APP_URL}/offers/${listingId}?listingFee=success`,
    cancel_url: `${publicEnv.NEXT_PUBLIC_APP_URL}/offers/${listingId}?listingFee=cancelled`,
  }, {
    idempotencyKey: `listing-fee-${payment.id}-${payment.checkout_attempt}`,
  });
  if (!checkout.url) listingFeeError(listingId, "error");

  const { data: attached, error: attachError } = await admin.from("platform_payments")
    .update({ stripe_checkout_session_id: checkout.id })
    .eq("id", payment.id)
    .eq("status", "PENDING")
    .is("stripe_checkout_session_id", null)
    .select("id")
    .maybeSingle();
  if (attachError || !attached) listingFeeError(listingId, "error");

  redirect(checkout.url);
}
