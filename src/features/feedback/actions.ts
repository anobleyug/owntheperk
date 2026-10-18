"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import type { FormState } from "@/features/auth/types";
import { checkRateLimits } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { feedbackSubmissionSchema } from "./schema";

function safeUserAgent(value: string | null) {
  const normalized = value?.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
  return normalized ? normalized.slice(0, 500) : null;
}

export async function submitFeedbackAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = feedbackSubmissionSchema.safeParse({
    type: formData.get("type"),
    category: formData.get("category") ?? "",
    subject: formData.get("subject"),
    message: formData.get("message"),
    pageUrl: formData.get("pageUrl") ?? "",
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rateLimit = await checkRateLimits([{
    scope: "FEEDBACK_CREATE",
    subject: `user:${user.id}`,
    limit: 5,
    windowSeconds: 3600,
  }]);
  if (!rateLimit.allowed) {
    return { status: "error", message: "Submission limit reached. Try again later." };
  }

  const requestHeaders = await headers();
  const { error } = await supabase.from("feedback_submissions").insert({
    user_id: user.id,
    type: parsed.data.type,
    category: parsed.data.category ?? null,
    subject: parsed.data.subject,
    message: parsed.data.message,
    page_url: parsed.data.pageUrl ?? null,
    user_agent: safeUserAgent(requestHeaders.get("user-agent")),
  });
  if (error) {
    return {
      status: "error",
      message: error.code === "22023"
        ? "Submission limit reached. Try again later."
        : "Your feedback could not be submitted. Try again.",
    };
  }

  return {
    status: "success",
    message: "Thanks for the feedback. Your message has been submitted.",
    fieldErrors: {},
  };
}

