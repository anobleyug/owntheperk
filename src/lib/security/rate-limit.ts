import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";

import { headers } from "next/headers";

import { getServerEnv } from "@/lib/env/server";
import { createPrivilegedClient } from "@/lib/supabase/admin";

export type RateLimitScope =
  | "AUTH_LOGIN_IP"
  | "AUTH_LOGIN_ACCOUNT"
  | "AUTH_SIGNUP_IP"
  | "AUTH_SIGNUP_ACCOUNT"
  | "AUTH_RECOVERY_IP"
  | "MESSAGE_SEND"
  | "LISTING_CREATE"
  | "REPORT_CREATE"
  | "CHECKOUT_CREATE";

type RateLimitRule = {
  scope: RateLimitScope;
  subject: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitResult = { allowed: boolean; retry_after_seconds: number };

function subjectHash(subject: string) {
  return createHmac("sha256", getServerEnv().RATE_LIMIT_SECRET)
    .update(subject.slice(0, 320))
    .digest("hex");
}

export async function getRequestAddress() {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .at(-1);
  const candidate = forwarded ?? requestHeaders.get("x-real-ip")?.trim();
  return candidate && isIP(candidate) ? candidate : "unavailable";
}

export async function checkRateLimits(rules: RateLimitRule[]) {
  const admin = createPrivilegedClient();
  for (const rule of rules) {
    const { data, error } = await admin.rpc("consume_rate_limit", {
      request_scope: rule.scope,
      request_subject_hash: subjectHash(rule.subject),
      request_limit: rule.limit,
      request_window_seconds: rule.windowSeconds,
    });
    if (error) return { allowed: false, retryAfterSeconds: rule.windowSeconds };
    const result = data as RateLimitResult | null;
    if (!result?.allowed) {
      return { allowed: false, retryAfterSeconds: result?.retry_after_seconds ?? rule.windowSeconds };
    }
  }
  return { allowed: true, retryAfterSeconds: 0 };
}
