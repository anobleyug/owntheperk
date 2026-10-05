"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ConversationStatus } from "@/features/messages/types";
import { createClient } from "@/lib/supabase/server";
import { blockSchema, ratingSchema, reportSchema } from "./schema";
import type { TrustActionState } from "./types";

const finalStatusSchema = z.enum(["COMPLETED", "NO_AGREEMENT", "CLOSED"]);

export async function setInteractionStatusAction(conversationId: string, status: ConversationStatus) {
  const parsed = z.object({ conversationId: z.uuid(), status: finalStatusSchema }).safeParse({ conversationId, status });
  if (!parsed.success) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.rpc("set_interaction_status", {
    target_conversation_id: parsed.data.conversationId,
    target_status: parsed.data.status,
  });
  if (error) return;
  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  revalidatePath("/profile");
}

export async function submitRatingAction(
  _state: TrustActionState,
  formData: FormData,
): Promise<TrustActionState> {
  const parsed = ratingSchema.safeParse({
    conversationId: formData.get("conversationId"),
    overallScore: formData.get("overallScore"),
    communicationScore: formData.get("communicationScore"),
    reliabilityScore: formData.get("reliabilityScore"),
    accuracyScore: formData.get("accuracyScore"),
    reviewText: formData.get("reviewText") ?? "",
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid rating." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in to rate this interaction." };
  const { error } = await supabase.rpc("submit_rating", {
    target_conversation_id: parsed.data.conversationId,
    submitted_overall_score: parsed.data.overallScore,
    submitted_communication_score: parsed.data.communicationScore,
    submitted_reliability_score: parsed.data.reliabilityScore,
    submitted_accuracy_score: parsed.data.accuracyScore,
    submitted_review_text: parsed.data.reviewText || null,
  });
  if (error) {
    return { status: "error", message: error.code === "23505" ? "You already rated this interaction." : "This rating could not be submitted." };
  }
  revalidatePath(`/messages/${parsed.data.conversationId}`);
  revalidatePath("/search");
  revalidatePath("/profile");
  return { status: "success", message: "Rating submitted. It cannot be edited.", submittedAt: Date.now() };
}

export async function blockUserAction(
  _state: TrustActionState,
  formData: FormData,
): Promise<TrustActionState> {
  const parsed = blockSchema.safeParse({ targetUserId: formData.get("targetUserId") });
  if (!parsed.success) return { status: "error", message: "Invalid member." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in to block this member." };
  const { error } = await supabase.from("user_blocks").insert({
    blocker_id: user.id,
    blocked_user_id: parsed.data.targetUserId,
  });
  if (error && error.code !== "23505") return { status: "error", message: "This member could not be blocked." };
  revalidatePath("/messages");
  return { status: "success", message: "Member blocked. New chats and messages are now disabled.", submittedAt: Date.now() };
}

export async function submitReportAction(
  _state: TrustActionState,
  formData: FormData,
): Promise<TrustActionState> {
  const parsed = reportSchema.safeParse({
    reportedUserId: formData.get("reportedUserId"),
    conversationId: formData.get("conversationId") ?? "",
    offerListingId: formData.get("offerListingId") ?? "",
    reason: formData.get("reason"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid report." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in to submit a report." };
  const { error } = await supabase.rpc("submit_report", {
    target_reported_user_id: parsed.data.reportedUserId,
    target_conversation_id: parsed.data.conversationId || null,
    target_offer_listing_id: parsed.data.offerListingId || null,
    submitted_reason: parsed.data.reason,
    submitted_description: parsed.data.description,
  });
  if (error) {
    return { status: "error", message: error.code === "23505" ? "You already submitted this report." : "This report could not be submitted." };
  }
  return { status: "success", message: "Report submitted privately for moderation review.", submittedAt: Date.now() };
}
