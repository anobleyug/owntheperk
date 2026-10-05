import "server-only";
import Stripe from "stripe";

import { getServerEnv } from "@/lib/env/server";

let client: Stripe | undefined;

export function getStripe(): Stripe {
  client ??= new Stripe(getServerEnv().STRIPE_SECRET_KEY);
  return client;
}