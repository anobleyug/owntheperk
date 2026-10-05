import type Stripe from "stripe";

import { getServerEnv } from "@/lib/env/server";
import { createPrivilegedClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing Stripe signature.", { status: 400 });

  const stripe = getStripe();
  const webhookSecret = getServerEnv().STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return new Response("Invalid Stripe signature.", { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return Response.json({ received: true });
  }

  const session = event.data.object;
  const listingId = session.metadata?.listing_id;
  const buyerUserId = session.metadata?.buyer_user_id;
  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id;

  if (
    session.payment_status !== "paid"
    || !listingId
    || !buyerUserId
    || !paymentIntentId
    || session.amount_total !== 199
    || session.currency?.toLowerCase() !== "usd"
  ) {
    return new Response("Invalid chat unlock payment.", { status: 400 });
  }

  const admin = createPrivilegedClient();
  const { error } = await admin.rpc("complete_chat_unlock", {
    target_checkout_session_id: session.id,
    target_payment_intent_id: paymentIntentId,
    target_listing_id: listingId,
    target_buyer_user_id: buyerUserId,
    paid_amount: session.amount_total,
    paid_currency: session.currency,
  });

  if (error) return new Response("Unable to record chat unlock.", { status: 500 });
  return Response.json({ received: true });
}