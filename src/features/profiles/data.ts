import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { OwnProfileDTO } from "@/features/profiles/types";

const OWN_PROFILE_COLUMNS =
  "id, username, avatar_url, bio, phone_verified, optional_identity_verified, rating_average, rating_count, completed_interaction_count, response_rate, onboarding_completed, created_at";

type ProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  phone_verified: boolean;
  optional_identity_verified: boolean;
  rating_average: number | string;
  rating_count: number;
  completed_interaction_count: number;
  response_rate: number | string | null;
  onboarding_completed: boolean;
  created_at: string;
};

function toOwnProfileDTO(row: ProfileRow): OwnProfileDTO {
  return {
    id: row.id,
    username: row.username,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    phoneVerified: row.phone_verified,
    optionalIdentityVerified: row.optional_identity_verified,
    ratingAverage: Number(row.rating_average),
    ratingCount: row.rating_count,
    completedInteractionCount: row.completed_interaction_count,
    responseRate: row.response_rate === null ? null : Number(row.response_rate),
    onboardingCompleted: row.onboarding_completed,
    createdAt: row.created_at,
  };
}

export async function getOwnProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<OwnProfileDTO | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(OWN_PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw new Error("Unable to load your profile.");
  }

  return data ? toOwnProfileDTO(data) : null;
}
