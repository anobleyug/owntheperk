import type Stripe from "stripe";
import { z } from "zod";

import { getServerEnv } from "@/lib/env/server";
import { logServerEvent } from "@/lib/server-logger";
import { createPrivilegedClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";

const listingFeeMetadataSchema = z.object({
  payment_type: z.literal("LISTING_FEE"),
  listing_id: z.uuid(),
  user_id: z.uuid(),
});

const chatUnlockMetadataSchema = z.object({
  payment_type: z.literal("CHAT_UNLOCK"),
  listing_id: z.uuid(),
  buyer_user_id: z.uuid(),
});

function genericError(status: number) {
  return Response.json({ received: false }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return genericError(400);

  const stripe = getStripe();
  const webhookSecret = getServerEnv().STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    logServerEvent("warn", "stripe_webhook_signature_rejected");
    return genericError(400);
  }

  if (event.type !== "checkout.session.completed") {
    return Response.json({ received: true });
  }

  const session = event.data.object;
  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id;

  const admin = createPrivilegedClient();
  const { data: claim, error: claimError } = await admin.rpc("claim_stripe_webhook_event", {
    target_event_id: event.id,
    target_event_type: event.type,
  });
  if (claimError) {
    logServerEvent("error", "stripe_webhook_claim_failed", { errorCode: claimError.code ?? "unknown" });
    return genericError(500);
  }
  if (claim === "PROCESSED") return Response.json({ received: true });
  if (claim !== "CLAIMED") return genericError(409);

  async function finish(succeeded: boolean) {
    const { error } = await admin.rpc("finish_stripe_webhook_event", {
      target_event_id: event.id,
      succeeded,
    });
    if (error) logServerEvent("error", "stripe_webhook_finish_failed", { errorCode: error.code ?? "unknown" });
    return !error;
  }

  const sharedPaymentValid = session.payment_status === "paid"
    && typeof paymentIntentId === "string"
    && session.currency?.toLowerCase() === "usd";
  const paymentType = session.metadata?.payment_type;

  if (paymentType === "LISTING_FEE") {
    const metadata = listingFeeMetadataSchema.safeParse(session.metadata);
    if (
      !sharedPaymentValid || !metadata.success || session.amount_total !== 99
    ) {
      await finish(false);
      logServerEvent("warn", "stripe_listing_fee_payload_rejected");
      return genericError(400);
    }
    const { error } = await admin.rpc("complete_listing_fee", {
      target_checkout_session_id: session.id,
      target_payment_intent_id: paymentIntentId!,
      target_listing_id: metadata.data.listing_id,
      target_user_id: metadata.data.user_id,
      paid_amount: session.amount_total,
      paid_currency: session.currency!,
    });
    if (error) {
      await finish(false);
      logServerEvent("error", "stripe_listing_fee_processing_failed", { errorCode: error.code ?? "unknown" });
      return genericError(500);
    }
  } else if (paymentType === "CHAT_UNLOCK") {
    const metadata = chatUnlockMetadataSchema.safeParse(session.metadata);
    if (
      !sharedPaymentValid || !metadata.success || session.amount_total !== 199
    ) {
      await finish(false);
      logServerEvent("warn", "stripe_chat_unlock_payload_rejected");
      return genericError(400);
    }
    const { error } = await admin.rpc("complete_chat_unlock", {
      target_checkout_session_id: session.id,
      target_payment_intent_id: paymentIntentId!,
      target_listing_id: metadata.data.listing_id,
      target_buyer_user_id: metadata.data.buyer_user_id,
      paid_amount: session.amount_total,
      paid_currency: session.currency!,
    });
    if (error) {
      await finish(false);
      logServerEvent("error", "stripe_chat_unlock_processing_failed", { errorCode: error.code ?? "unknown" });
      return genericError(500);
    }
  } else {
    if (!(await finish(true))) return genericError(500);
    logServerEvent("warn", "stripe_payment_type_ignored");
    return Response.json({ received: true });
  }

  if (!(await finish(true))) return genericError(500);
  return Response.json({ received: true });
}
