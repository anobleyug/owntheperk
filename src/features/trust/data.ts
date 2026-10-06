import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { PublicReviewDTO } from "./types";

export const REVIEWS_PAGE_SIZE = 8;

type PublicReviewRow = {
  id: string;
  overall_score: number;
  review_text: string | null;
  reviewer_username: string;
  created_at: string;
};

export async function getPublicReviews(
  supabase: SupabaseClient,
  userId: string,
  page: number,
) {
  const from = (page - 1) * REVIEWS_PAGE_SIZE;
  const { data, error, count } = await supabase
    .from("public_reviews")
    .select("id, overall_score, review_text, reviewer_username, created_at", { count: "exact" })
    .eq("reviewed_user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, from + REVIEWS_PAGE_SIZE - 1);
  if (error) throw new Error("Unable to load reviews.");

  return {
    reviews: ((data ?? []) as PublicReviewRow[]).map((row): PublicReviewDTO => ({
      id: row.id,
      overallScore: row.overall_score,
      reviewText: row.review_text,
      reviewerUsername: row.reviewer_username,
      createdAt: row.created_at,
    })),
    total: count ?? 0,
  };
}

export async function hasSubmittedRating(
  supabase: SupabaseClient,
  conversationId: string,
  reviewerId: string,
) {
  const { data, error } = await supabase.from("ratings").select("id")
    .eq("conversation_id", conversationId).eq("reviewer_id", reviewerId).maybeSingle();
  if (error) throw new Error("Unable to check whether this interaction was rated.");
  return Boolean(data);
}

export async function hasBlockedUser(
  supabase: SupabaseClient,
  blockerId: string,
  blockedUserId: string,
) {
  const { data } = await supabase.from("user_blocks").select("blocked_user_id")
    .eq("blocker_id", blockerId).eq("blocked_user_id", blockedUserId).maybeSingle();
  return Boolean(data);
}
