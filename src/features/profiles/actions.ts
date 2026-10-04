"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { profileFormSchema } from "./schema";
import type { FormState } from "@/features/auth/types";

function profileValues(formData: FormData) {
  return {
    username: formData.get("username"),
    avatarUrl: formData.get("avatarUrl"),
    bio: formData.get("bio"),
  };
}

function profileErrorState(error: { code?: string }): FormState {
  if (error.code === "23505") {
    return {
      status: "error",
      message: "That username is already taken. Try another.",
      fieldErrors: { username: ["That username is already taken."] },
    };
  }

  if (error.code === "23514") {
    return {
      status: "error",
      message: "That profile does not meet the username or profile rules.",
    };
  }

  return { status: "error", message: "We could not save your profile. Try again." };
}

async function updateProfile(formData: FormData, completeOnboarding: boolean) {
  const parsed = profileFormSchema.safeParse(profileValues(formData));
  if (!parsed.success) {
    return {
      status: "error" as const,
      message: "Check the highlighted fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      username: parsed.data.username,
      avatar_url: parsed.data.avatarUrl || null,
      bio: parsed.data.bio || null,
      ...(completeOnboarding ? { onboarding_completed: true } : {}),
    })
    .eq("id", user.id);

  if (error) {
    return profileErrorState(error);
  }

  return null;
}

export async function completeOnboardingAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const errorState = await updateProfile(formData, true);
  if (errorState) return errorState;
  redirect("/search");
}

export async function updateProfileAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const errorState = await updateProfile(formData, false);
  if (errorState) return errorState;

  revalidatePath("/profile");
  return { status: "success", message: "Profile updated." };
}
