import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { publicEnv } from "@/lib/env/client";
import { safeAuthDestination } from "@/lib/security/redirects";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES = new Set<EmailOtpType>([
  "email",
  "recovery",
  "invite",
  "email_change",
  "magiclink",
  "signup",
]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeAuthDestination(url.searchParams.get("next"));
  const supabase = await createClient();

  let error: unknown;

  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type && OTP_TYPES.has(type)) {
    ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  } else {
    error = new Error("Missing authentication callback parameters.");
  }

  if (error) {
    const response = NextResponse.redirect(new URL("/login?auth_error=callback", publicEnv.NEXT_PUBLIC_APP_URL));
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const response = NextResponse.redirect(new URL(next, publicEnv.NEXT_PUBLIC_APP_URL));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
