"use server";

import { redirect } from "next/navigation";

import { getOwnProfile } from "@/features/profiles/data";
import { publicEnv } from "@/lib/env/client";
import { checkRateLimits, getRequestAddress } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "./schema";
import type { FormState } from "./types";

function valuesFrom(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function authRateLimit(kind: "login" | "signup" | "recovery", account: string) {
  const address = await getRequestAddress();
  if (kind === "login") return checkRateLimits([
    { scope: "AUTH_LOGIN_IP", subject: `ip:${address}`, limit: 20, windowSeconds: 600 },
    { scope: "AUTH_LOGIN_ACCOUNT", subject: `account:${account.toLowerCase()}`, limit: 8, windowSeconds: 600 },
  ]);
  if (kind === "signup") return checkRateLimits([
    { scope: "AUTH_SIGNUP_IP", subject: `ip:${address}`, limit: 10, windowSeconds: 3600 },
    { scope: "AUTH_SIGNUP_ACCOUNT", subject: `account:${account.toLowerCase()}`, limit: 3, windowSeconds: 3600 },
  ]);
  return checkRateLimits([
    { scope: "AUTH_RECOVERY_IP", subject: `ip:${address}`, limit: 5, windowSeconds: 3600 },
  ]);
}

export async function loginAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse(valuesFrom(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  if (!(await authRateLimit("login", parsed.data.email)).allowed) {
    return { status: "error", message: "Too many attempts. Try again later." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    return {
      status: "error",
      message: "The email or password is incorrect, or the email is not verified.",
    };
  }

  const profile = await getOwnProfile(supabase, data.user.id);
  redirect(profile?.onboardingCompleted ? "/search" : "/onboarding");
}

export async function signupAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signupSchema.safeParse(valuesFrom(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  if (!(await authRateLimit("signup", parsed.data.email)).allowed) {
    return { status: "error", message: "Too many attempts. Try again later." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${publicEnv.NEXT_PUBLIC_APP_URL}/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    return {
      status: "error",
      message: "We could not create the account. Check your details and try again.",
    };
  }

  if (data.session) {
    redirect("/onboarding");
  }

  return {
    status: "success",
    message:
      "Check your email for a verification link. You can continue after confirming your address.",
  };
}

export async function forgotPasswordAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse(valuesFrom(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Enter a valid email address.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  if (!(await authRateLimit("recovery", parsed.data.email)).allowed) {
    return { status: "success", message: "If an account exists for that email, a password reset link is on its way." };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`,
  });

  return {
    status: "success",
    message:
      "If an account exists for that email, a password reset link is on its way.",
  };
}

export async function resetPasswordAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse(valuesFrom(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return {
      status: "error",
      message: "This reset link is invalid or expired. Request a new one.",
    };
  }

  redirect("/login?reset=success");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
